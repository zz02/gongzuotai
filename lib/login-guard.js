const crypto = require('crypto');
const net = require('net');

const DEFAULTS = Object.freeze({
  accountLimit: 5,
  ipLimit: 20,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
  sweepIntervalMs: 60 * 1000,
});

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAddress(value) {
  let address = String(value || '').trim();
  if (!address) return 'unknown';
  if (address.startsWith('[') && address.includes(']')) address = address.slice(1, address.indexOf(']'));
  if (address.startsWith('::ffff:') && net.isIP(address.slice(7)) === 4) address = address.slice(7);
  const scopeIndex = address.indexOf('%');
  if (scopeIndex > 0) address = address.slice(0, scopeIndex);
  return net.isIP(address) ? address : 'unknown';
}

function trustedProxyMatcher(value) {
  if (value === true) return () => true;
  const addresses = new Set(
    (Array.isArray(value) ? value : String(value || '').split(','))
      .map(normalizeAddress)
      .filter(address => address !== 'unknown'),
  );
  return remoteAddress => addresses.has(normalizeAddress(remoteAddress));
}

function requestAddress(req, trustProxy = false) {
  const socketAddress = normalizeAddress(req?.socket?.remoteAddress);
  if (!trustedProxyMatcher(trustProxy)(socketAddress)) return socketAddress;
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const forwardedAddress = normalizeAddress(forwarded);
  return forwardedAddress === 'unknown' ? socketAddress : forwardedAddress;
}

function normalizeUsername(value) {
  return String(value || '').trim().normalize('NFKC').toLocaleLowerCase('en-US');
}

function opaqueKey(kind, value) {
  return crypto.createHash('sha256').update(`${kind}\0${value}`).digest('hex');
}

function createLoginGuard(options = {}) {
  const accountLimit = positiveInteger(options.accountLimit, DEFAULTS.accountLimit);
  const ipLimit = positiveInteger(options.ipLimit, DEFAULTS.ipLimit);
  const windowMs = positiveInteger(options.windowMs, DEFAULTS.windowMs);
  const lockMs = positiveInteger(options.lockMs, DEFAULTS.lockMs);
  const sweepIntervalMs = positiveInteger(options.sweepIntervalMs, DEFAULTS.sweepIntervalMs);
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const trustProxy = options.trustProxy || false;
  const scheduleInterval = typeof options.setInterval === 'function' ? options.setInterval : setInterval;
  const cancelInterval = typeof options.clearInterval === 'function' ? options.clearInterval : clearInterval;
  const records = new Map();
  let sweepTimer = null;

  function keys(req, username) {
    return {
      account: opaqueKey('account', normalizeUsername(username)),
      ip: opaqueKey('ip', requestAddress(req, trustProxy)),
    };
  }

  function activeRecord(key, timestamp) {
    const current = records.get(key);
    if (!current) return { failures: [], lockedUntil: 0 };
    if (current.lockedUntil > timestamp) return current;
    if (current.lockedUntil) {
      records.delete(key);
      return { failures: [], lockedUntil: 0 };
    }
    current.failures = current.failures.filter(item => item > timestamp - windowMs);
    if (!current.failures.length) {
      records.delete(key);
      return { failures: [], lockedUntil: 0 };
    }
    return current;
  }

  function accessResult(req, username, timestamp = now()) {
    const pair = keys(req, username);
    const account = activeRecord(pair.account, timestamp);
    const ip = activeRecord(pair.ip, timestamp);
    const lockedUntil = Math.max(account.lockedUntil || 0, ip.lockedUntil || 0);
    const accountRemaining = Math.max(0, accountLimit - account.failures.length);
    const ipRemaining = Math.max(0, ipLimit - ip.failures.length);
    return {
      allowed: lockedUntil <= timestamp,
      remainingAttempts: Math.min(accountRemaining, ipRemaining),
      retryAfterSeconds: lockedUntil > timestamp ? Math.max(1, Math.ceil((lockedUntil - timestamp) / 1000)) : 0,
      keys: pair,
      account,
      ip,
    };
  }

  function check(req, username) {
    const result = accessResult(req, username);
    return {
      allowed: result.allowed,
      remainingAttempts: result.remainingAttempts,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  function recordFailure(req, username) {
    const timestamp = now();
    const current = accessResult(req, username, timestamp);
    if (!current.allowed) return check(req, username);
    for (const [kind, limit] of [['account', accountLimit], ['ip', ipLimit]]) {
      const key = current.keys[kind];
      const record = current[kind];
      record.failures.push(timestamp);
      if (record.failures.length >= limit) {
        record.failures = [];
        record.lockedUntil = timestamp + lockMs;
      }
      records.set(key, record);
    }
    return check(req, username);
  }

  function recordSuccess(req, username) {
    const pair = keys(req, username);
    records.delete(pair.account);
    records.delete(pair.ip);
  }

  function clear() {
    records.clear();
  }

  function sweep(timestamp = now()) {
    const before = records.size;
    for (const key of [...records.keys()]) activeRecord(key, timestamp);
    return { trackedKeys: records.size, removedKeys: before - records.size };
  }

  function stats() {
    return { trackedKeys: sweep().trackedKeys };
  }

  function stop() {
    if (!sweepTimer) return;
    cancelInterval(sweepTimer);
    sweepTimer = null;
  }

  if (options.autoSweep !== false) {
    sweepTimer = scheduleInterval(() => sweep(), sweepIntervalMs);
    sweepTimer?.unref?.();
  }

  return {
    check,
    recordFailure,
    recordSuccess,
    clear,
    sweep,
    stats,
    stop,
    config: Object.freeze({ accountLimit, ipLimit, windowMs, lockMs, sweepIntervalMs }),
  };
}

module.exports = {
  DEFAULTS,
  createLoginGuard,
  normalizeAddress,
  normalizeUsername,
  requestAddress,
};
