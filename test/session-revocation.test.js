const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const helper = require('./_helper');
const { db } = helper;
const { sessions, sessionSet, sessionGet } = require('../lib/auth');
const { hashPassword } = require('../lib/password');

test('SQLite 删除会话后内存缓存不能继续授权', () => {
  const now = Date.now();
  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare(`
    INSERT INTO users
      (id, username, display_name, password_hash, role, must_change_password, password_changed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'owner', 0, ?, ?, ?)
  `).run(userId, `owner-${process.pid}`, '会话测试', hashPassword('SessionPass88'), now, now, now);

  sessionSet(token, userId, now + 60000);
  assert.equal(sessionGet(token)?.userId, userId);
  assert.equal(sessions.has(token), true);

  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  assert.equal(sessionGet(token), null);
  assert.equal(sessions.has(token), false);
});
