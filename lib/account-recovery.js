const { hashPassword, verifyPassword, validateUsername, validatePassword } = require('./password');

class AccountRecoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AccountRecoveryError';
    this.code = code;
  }
}

function preparePasswordReset(database, input = {}) {
  let username;
  let password;
  try {
    username = validateUsername(input.username);
    password = validatePassword(input.password);
  } catch (error) {
    throw new AccountRecoveryError('INPUT_INVALID', error.message);
  }

  if (password !== String(input.confirmPassword || '')) {
    throw new AccountRecoveryError('PASSWORD_MISMATCH', '两次输入的密码不一致');
  }

  const user = database.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (!user) {
    throw new AccountRecoveryError('ACCOUNT_NOT_FOUND', `未找到账号“${username}”`);
  }
  if (verifyPassword(password, user.password_hash)) {
    throw new AccountRecoveryError('PASSWORD_UNCHANGED', '新密码不能与当前密码相同');
  }

  return { user, username: user.username, password };
}

function applyPasswordReset(database, prepared, now = Date.now()) {
  return database.transaction(() => {
    const updated = database.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0,
          password_changed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(hashPassword(prepared.password), now, now, prepared.user.id);
    if (updated.changes !== 1) {
      throw new AccountRecoveryError('ACCOUNT_CHANGED', '账号状态已变化，请重新执行密码恢复');
    }
    const revoked = database.prepare('DELETE FROM sessions WHERE user_id = ?').run(prepared.user.id);
    return {
      id: prepared.user.id,
      username: prepared.username,
      displayName: prepared.user.display_name,
      revokedSessions: revoked.changes,
      passwordChangedAt: now,
    };
  })();
}

function resetUserPassword(database, input, now = Date.now()) {
  return applyPasswordReset(database, preparePasswordReset(database, input), now);
}

module.exports = {
  AccountRecoveryError,
  preparePasswordReset,
  applyPasswordReset,
  resetUserPassword,
};
