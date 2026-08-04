const test = require('node:test');
const assert = require('node:assert/strict');

const { checkNativeDependencies } = require('../scripts/check-native-dependencies');

test('本机数据库原生依赖可在当前 Node 运行时加载', () => {
  assert.deepEqual(checkNativeDependencies(), { ok: true });
});

test('原生依赖检查返回脱敏错误码并始终关闭临时数据库', () => {
  let closed = false;
  class BrokenDatabase {
    prepare() {
      return { get() { throw Object.assign(new Error('/private/path should not leak'), { code: 'ERR_DLOPEN_FAILED' }); } };
    }

    close() { closed = true; }
  }

  assert.deepEqual(
    checkNativeDependencies(() => BrokenDatabase),
    { ok: false, code: 'ERR_DLOPEN_FAILED' },
  );
  assert.equal(closed, true);
});
