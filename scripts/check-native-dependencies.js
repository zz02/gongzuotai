#!/usr/bin/env node

function checkNativeDependencies(loadDatabase = () => require('better-sqlite3')) {
  let database;
  try {
    const Database = loadDatabase();
    database = new Database(':memory:');
    database.prepare('SELECT 1 AS ok').get();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: String(error?.code || error?.name || 'UNKNOWN_ERROR'),
    };
  } finally {
    try { database?.close(); } catch { /* best-effort cleanup */ }
  }
}

if (require.main === module) {
  const result = checkNativeDependencies();
  if (!result.ok) {
    process.stderr.write(
      `[runtime] 当前 Node ${process.version}（ABI ${process.versions.modules}）无法加载本机数据库模块：${result.code}\n`,
    );
    process.exitCode = 1;
  }
}

module.exports = { checkNativeDependencies };
