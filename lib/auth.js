// 认证 + 会话 + KB 凭证加密
// 依赖：lib/db（实例）
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db, DATA_ROOT } = require('./db');

const sessions = new Map();

function sessionSet(token, userId, expiresAt) {
  const session = { userId, expiresAt };
  sessions.set(token, session);
  db.prepare(`
    INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, Date.now());
}

function sessionDel(token) {
  sessions.delete(token);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function sessionGet(token) {
  // SQLite 是会话的唯一事实源。每次请求都确认记录仍存在，确保密码恢复命令
  // 即使在另一个进程执行，也能立即撤销当前服务进程里的内存缓存。
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token);
  if (row?.user_id) {
    const session = { userId: row.user_id, expiresAt: row.expires_at };
    sessions.set(token, session);
    return session;
  }
  sessions.delete(token);
  return null;
}

function sessionClean() {
  const now = Date.now();
  sessions.forEach((value, token) => {
    if (value.expiresAt < now) sessions.delete(token);
  });
  db.prepare('DELETE FROM sessions WHERE expires_at < ? OR user_id IS NULL').run(now);
}

function getCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    mustChangePassword: Boolean(row.must_change_password),
    lastLoginAt: row.last_login_at,
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function currentSession(req) {
  const token = getCookies(req).furnace_session;
  const session = token ? sessionGet(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessionDel(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
  if (!user) {
    sessionDel(token);
    return null;
  }
  return { token, session, user };
}

function isAuthorized(req) {
  return Boolean(currentSession(req));
}

// 知识库凭证 AES-256-GCM 加密
const KB_ENC_ALGO = 'aes-256-gcm';
const MANAGED_KEY_PATH = path.join(DATA_ROOT, 'kb-encryption.key');
const LEGACY_KB_KEY = 'furnace-kb-key';

function configuredKey(value) {
  const key = String(value || '').trim();
  if (!key || /^CHANGE_ME/i.test(key) || key === 'your_kb_encryption_key') return '';
  return key;
}

function hasStoredEncryptedCredentials() {
  const notion = db.prepare("SELECT 1 FROM kb_config WHERE TRIM(COALESCE(notion_api_key, '')) <> '' LIMIT 1").get();
  const wersss = db.prepare("SELECT 1 FROM wersss_config WHERE TRIM(COALESCE(password_enc, '')) <> '' LIMIT 1").get();
  return Boolean(notion || wersss);
}

function readManagedKey() {
  try {
    const key = fs.readFileSync(MANAGED_KEY_PATH, 'utf8').trim();
    return /^[a-f0-9]{64}$/i.test(key) ? key : '';
  } catch {
    return '';
  }
}

function resolveEncryptionKey() {
  const explicit = configuredKey(process.env.KB_ENCRYPTION_KEY);
  if (explicit) {
    return {
      key: explicit,
      source: 'environment',
      insecure: explicit.length < 32,
    };
  }
  const managed = readManagedKey();
  if (managed) return { key: managed, source: 'managed', insecure: false };

  // 旧版本可能已经用固定弱密钥保存过凭证。此时绝不静默换钥，避免已有数据无法解密。
  if (hasStoredEncryptedCredentials()) {
    return { key: LEGACY_KB_KEY, source: 'legacy', insecure: true };
  }

  try {
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(MANAGED_KEY_PATH, `${generated}\n`, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(MANAGED_KEY_PATH, 0o600);
    return { key: generated, source: 'managed', insecure: false };
  } catch {
    const raced = readManagedKey();
    if (raced) return { key: raced, source: 'managed', insecure: false };
    return { key: LEGACY_KB_KEY, source: 'legacy', insecure: true };
  }
}

const KB_ENCRYPTION = resolveEncryptionKey();
const KB_ENC_INSECURE = KB_ENCRYPTION.insecure;
const KB_ENC_SOURCE = KB_ENCRYPTION.source;
if (KB_ENC_INSECURE) {
  console.error('[security] 知识库仍在使用旧版或过短的加密密钥。请先备份数据，再在设置中配置至少 32 位的 KB_ENCRYPTION_KEY；已有凭证不可直接换钥。');
} else if (KB_ENC_SOURCE === 'managed') {
  console.log(`[security] 知识库加密密钥由数据目录自动管理：${MANAGED_KEY_PATH}`);
}
const KB_ENC_KEY = crypto.createHash('sha256').update(KB_ENCRYPTION.key).digest();

function encryptKb(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(KB_ENC_ALGO, KB_ENC_KEY, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + enc;
}

function decryptKb(text) {
  if (!text) return '';
  const parts = text.split(':');
  if (parts.length !== 3) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const enc = parts[2];
  const decipher = crypto.createDecipheriv(KB_ENC_ALGO, KB_ENC_KEY, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

module.exports = {
  sessions,
  sessionSet,
  sessionDel,
  sessionGet,
  sessionClean,
  getCookies,
  publicUser,
  currentSession,
  isAuthorized,
  KB_ENC_ALGO,
  KB_ENC_INSECURE,
  KB_ENC_SOURCE,
  MANAGED_KEY_PATH,
  encryptKb,
  decryptKb,
};
