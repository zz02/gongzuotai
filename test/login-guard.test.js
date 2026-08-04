const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoginGuard, requestAddress } = require('../lib/login-guard');

function request(ip = '127.0.0.1', forwarded = '') {
  return { socket: { remoteAddress: ip }, headers: forwarded ? { 'x-forwarded-for': forwarded } : {} };
}

test('账号达到失败上限后临时锁定，到期自动恢复', () => {
  let timestamp = 1_000;
  const guard = createLoginGuard({ accountLimit: 3, ipLimit: 20, windowMs: 60_000, lockMs: 30_000, now: () => timestamp });
  const req = request('10.0.0.1');
  assert.deepEqual(guard.recordFailure(req, 'Admin'), { allowed: true, remainingAttempts: 2, retryAfterSeconds: 0 });
  assert.deepEqual(guard.recordFailure(req, 'admin'), { allowed: true, remainingAttempts: 1, retryAfterSeconds: 0 });
  const locked = guard.recordFailure(req, 'Ａｄｍｉｎ');
  assert.equal(locked.allowed, false, 'NFKC 与大小写变体应视为同一账号');
  assert.equal(locked.retryAfterSeconds, 30);
  timestamp += 30_001;
  assert.deepEqual(guard.check(req, 'admin'), { allowed: true, remainingAttempts: 3, retryAfterSeconds: 0 });
});

test('同一 IP 的不同账号共享 IP 失败上限', () => {
  const guard = createLoginGuard({ accountLimit: 10, ipLimit: 3, windowMs: 60_000, lockMs: 45_000, now: () => 5_000 });
  const req = request('10.0.0.2');
  guard.recordFailure(req, 'alpha');
  guard.recordFailure(req, 'beta');
  const locked = guard.recordFailure(req, 'gamma');
  assert.equal(locked.allowed, false);
  assert.equal(guard.check(req, 'delta').allowed, false);
});

test('不同 IP 和不同账号相互隔离，成功登录清空当前账号与 IP 记录', () => {
  const guard = createLoginGuard({ accountLimit: 3, ipLimit: 5, now: () => 8_000 });
  const first = request('10.0.0.3');
  const second = request('10.0.0.4');
  guard.recordFailure(first, 'admin');
  assert.equal(guard.check(second, 'other').remainingAttempts, 3);
  guard.recordSuccess(first, 'admin');
  assert.equal(guard.check(first, 'admin').remainingAttempts, 3);
  assert.equal(guard.stats().trackedKeys, 0);
});

test('窗口外的失败记录不继续累计', () => {
  let timestamp = 10_000;
  const guard = createLoginGuard({ accountLimit: 3, ipLimit: 10, windowMs: 1_000, lockMs: 5_000, now: () => timestamp });
  const req = request('10.0.0.5');
  guard.recordFailure(req, 'admin');
  timestamp += 1_001;
  assert.equal(guard.recordFailure(req, 'admin').remainingAttempts, 2);
});

test('周期清理会移除过期记录，并可在服务关闭时停止', () => {
  let timestamp = 20_000;
  let scheduled = null;
  let scheduledMs = 0;
  let unrefCalled = false;
  let cancelled = null;
  const timer = { unref: () => { unrefCalled = true; } };
  const guard = createLoginGuard({
    accountLimit: 5,
    ipLimit: 20,
    windowMs: 1_000,
    lockMs: 5_000,
    sweepIntervalMs: 250,
    now: () => timestamp,
    setInterval: (callback, interval) => {
      scheduled = callback;
      scheduledMs = interval;
      return timer;
    },
    clearInterval: value => { cancelled = value; },
  });
  guard.recordFailure(request('10.0.0.6'), 'admin');
  assert.equal(guard.stats().trackedKeys, 2);
  assert.equal(scheduledMs, 250);
  assert.equal(unrefCalled, true);
  timestamp += 1_001;
  scheduled();
  assert.deepEqual(guard.sweep(), { trackedKeys: 0, removedKeys: 0 });
  guard.stop();
  assert.equal(cancelled, timer);
  guard.stop();
});

test('默认忽略伪造的 X-Forwarded-For，仅可信代理可转发来源地址', () => {
  const forged = request('127.0.0.1', '203.0.113.8, 127.0.0.1');
  assert.equal(requestAddress(forged), '127.0.0.1');
  assert.equal(requestAddress(forged, ['127.0.0.1']), '203.0.113.8');
  assert.equal(requestAddress(request('127.0.0.1', 'not-an-ip'), ['127.0.0.1']), '127.0.0.1');
});
