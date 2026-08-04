const fs = require('fs');

const STATUS_ORDER = Object.freeze({ normal: 0, warning: 1, error: 2 });

function item(id, name, status, summary, impact, nextStep, details = {}) {
  return { id, name, status, summary, impact, nextStep, details };
}

function safeRow(database, sql) {
  try { return database.prepare(sql).get() || null; } catch { return null; }
}

function newestUsableBackup(backups) {
  return (Array.isArray(backups) ? backups : []).find(entry => entry?.status !== 'invalid') || null;
}

function make(options = {}) {
  const database = options.database;
  const backupManager = options.backupManager;
  const contentProjects = options.contentProjects;
  const dataRoot = options.dataRoot;
  const appVersion = String(options.appVersion || '0.0.0');
  const schedulerEnabled = options.schedulerEnabled !== false;
  const envProvider = typeof options.env === 'function' ? options.env : () => (options.env || process.env);
  const xhsMcpService = options.xhsMcpService;
  const kbEncryption = options.kbEncryption || {};
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const uptime = typeof options.uptime === 'function' ? options.uptime : process.uptime;

  function serviceItem() {
    return item(
      'service', '工作台服务', 'normal', `服务正在运行，版本 v${appVersion}`,
      '内容管理、Skills 与设置页面可以响应。',
      '无需处理。',
      { version: appVersion, uptimeSeconds: Math.max(0, Math.floor(Number(uptime()) || 0)), schedulerEnabled },
    );
  }

  function databaseItem() {
    if (!database) {
      return item('database', '本机数据库', 'error', '数据库服务未初始化', '账号、配置与工作记录无法可靠读取。', '重启服务；仍失败时先保留数据目录并查看服务日志。');
    }
    try {
      const rows = database.pragma('quick_check');
      const messages = rows.map(row => String(row.quick_check || Object.values(row)[0] || ''));
      if (messages.length !== 1 || messages[0].toLowerCase() !== 'ok') {
        return item('database', '本机数据库', 'error', '数据库一致性检查未通过', '继续写入可能扩大数据损坏范围。', '停止批量操作，先创建文件副本并按恢复说明处理。');
      }
      database.prepare('SELECT COUNT(*) AS count FROM sqlite_master').get();
      return item('database', '本机数据库', 'normal', '数据库结构与一致性正常', '账号、配置与工作记录可以读取。', '无需处理。');
    } catch {
      return item('database', '本机数据库', 'error', '数据库无法完成读取检查', '账号、配置与工作记录可能不可用。', '重启服务；仍失败时使用已校验备份恢复。');
    }
  }

  function backupItem() {
    if (!backupManager) {
      return item('backup', '数据备份', 'error', '备份服务未初始化', '升级或设备故障后无法按受管流程恢复。', '重启服务并重新执行系统诊断。');
    }
    try {
      const result = backupManager.listBackups();
      const backups = Array.isArray(result.backups) ? result.backups : [];
      const invalidCount = backups.filter(entry => entry?.status === 'invalid').length;
      const latest = newestUsableBackup(backups);
      if (invalidCount) {
        return item('backup', '数据备份', 'error', `发现 ${invalidCount} 个异常备份`, '异常备份不能作为可靠恢复点。', '在“数据保护”中保留正常备份，并检查异常记录。', { count: result.count || backups.length, invalidCount, latestAt: latest?.createdAt || null });
      }
      if (!latest) {
        return item('backup', '数据备份', 'warning', '尚未创建受管备份', '本机数据库或配置损坏时没有可验证的恢复点。', '立即创建一次备份并执行校验。', { count: 0, invalidCount: 0, latestAt: null });
      }
      return item('backup', '数据备份', 'normal', '存在可校验的受管备份', '本机数据库与配置具备恢复点。', '重要配置变更和版本升级前继续创建备份。', { count: result.count || backups.length, invalidCount: 0, latestAt: latest.createdAt || null });
    } catch {
      return item('backup', '数据备份', 'error', '备份目录无法读取', '系统无法确认现有恢复点是否可用。', '检查数据目录权限和磁盘状态后重试。');
    }
  }

  function storageItem() {
    try {
      fs.accessSync(dataRoot, fs.constants.R_OK | fs.constants.W_OK);
      const stats = fs.statfsSync(dataRoot);
      const availableBytes = Number(stats.bavail) * Number(stats.bsize);
      if (!Number.isFinite(availableBytes)) throw new Error('space unavailable');
      if (availableBytes < 64 * 1024 * 1024) {
        return item('storage', '本机存储', 'error', '可用空间低于 64 MB', '数据库写入和备份可能随时失败。', '立即清理磁盘，至少保留 512 MB 可用空间。', { availableBytes });
      }
      if (availableBytes < 512 * 1024 * 1024) {
        return item('storage', '本机存储', 'warning', '可用空间低于 512 MB', '后续备份和内容缓存容易失败。', '清理磁盘并保留更多可用空间。', { availableBytes });
      }
      return item('storage', '本机存储', 'normal', '数据目录可读写，空间充足', '数据库、日志和受管备份可以继续写入。', '无需处理。', { availableBytes });
    } catch {
      return item('storage', '本机存储', 'error', '数据目录权限或磁盘状态异常', '数据库和备份可能无法写入。', '检查数据目录读写权限与磁盘挂载状态。');
    }
  }

  function workspaceItem() {
    try {
      const config = contentProjects?.workspaceConfig?.();
      if (!config?.configured) {
        return item('content-workspace', '内容工作区', 'warning', config?.message || '尚未配置内容工作区', '原自媒体项目、脚本和 Skills 无法在工作台中联动。', '前往“内容项目”配置原工作区路径。', { configured: false });
      }
      return item('content-workspace', '内容工作区', 'normal', '原工作区已无损接入', '内容项目与原脚本仍使用同一事实源。', '无需迁移文件；继续在内容项目中使用。', { configured: true });
    } catch {
      return item('content-workspace', '内容工作区', 'error', '内容工作区检查失败', '原项目与 Skills 的联动状态无法确认。', '重新配置工作区路径并确认目录结构完整。', { configured: false });
    }
  }

  function configuredIntegration(id, name, configured, impact, nextStep) {
    return configured
      ? item(id, name, 'normal', '已配置', impact.configured, '无需处理。', { configured: true })
      : item(id, name, 'warning', '未配置', impact.missing, nextStep, { configured: false });
  }

  function integrationItems() {
    const env = envProvider() || {};
    const items = [
      configuredIntegration('redfox', 'RedFox 数据源', Boolean(String(env.REDFOX_API_KEY || '').trim()), {
        configured: '热点、榜单与平台数据能力可调用。',
        missing: '本地内容和 Skills 可用，但全网数据获取暂不可用。',
      }, '在“API Key 与环境”中配置 RedFox API。'),
      configuredIntegration('llm', 'LLM 服务', Boolean(String(env.LLM_API_KEY || '').trim() && String(env.LLM_BASE_URL || '').trim() && String(env.LLM_MODEL || '').trim()), {
        configured: '需要模型的分析与改写能力已具备调用条件。',
        missing: '不依赖模型的本地流程可用，分析与改写能力受限。',
      }, '配置 LLM 地址、密钥和模型后重启服务。'),
      configuredIntegration('github', 'Skill 更新', Boolean(String(env.GITHUB_API_TOKEN || '').trim()), {
        configured: 'Skill 中心更新具备较高请求额度。',
        missing: 'Skill 更新仍可匿名请求，但更容易触发频率限制。',
      }, '如需频繁更新 Skill，可配置无权限 GitHub Token。'),
    ];

    const notion = safeRow(database, 'SELECT notion_api_key, notion_database_id FROM kb_config LIMIT 1');
    items.push(configuredIntegration('notion', 'Notion 知识库', Boolean(notion?.notion_api_key && notion?.notion_database_id), {
      configured: 'Notion 内容可以作为知识库来源。',
      missing: '本地内容流程不受影响，Notion 同步暂不可用。',
    }, '如需使用 Notion，在知识库设置中完成授权。'));

    const wersss = safeRow(database, 'SELECT base_url, username, token, token_expires_at, enabled FROM wersss_config WHERE id = 1');
    if (!wersss?.base_url || !wersss?.username) {
      items.push(item('wersss', '公众号采集', 'warning', '未配置', '本地内容流程不受影响，公众号同步暂不可用。', '在“外部服务接入”中配置 WeRss。', { configured: false }));
    } else if (!wersss.enabled) {
      items.push(item('wersss', '公众号采集', 'warning', '已配置但未启用', '公众号同步不会自动执行。', '在 WeRss 设置中启用接入。', { configured: true, enabled: false }));
    } else if (!wersss.token || (wersss.token_expires_at && wersss.token_expires_at <= now())) {
      items.push(item('wersss', '公众号采集', 'warning', '需要重新授权', '公众号同步暂时无法获取新内容。', '重新扫码授权后再次诊断。', { configured: true, enabled: true, authorized: false }));
    } else {
      items.push(item('wersss', '公众号采集', 'normal', '已配置并已授权', '公众号同步具备调用条件。', '无需处理。', { configured: true, enabled: true, authorized: true }));
    }

    let xhs = null;
    try { xhs = xhsMcpService?.getPublicConfig?.(); } catch {}
    if (!xhs?.configured || !xhs?.enabled) {
      items.push(item('xhs-mcp', '小红书 MCP', 'warning', '未启用', '本地内容流程不受影响，小红书自动发布暂不可用。', '在“外部服务接入”中配置并启用小红书 MCP。', { configured: Boolean(xhs?.configured), enabled: Boolean(xhs?.enabled) }));
    } else if (xhs.loginStatus !== 'logged_in') {
      items.push(item('xhs-mcp', '小红书 MCP', 'warning', xhs.loginStatus === 'logged_out' ? '需要登录' : '登录状态待确认', '小红书自动发布暂不可用或状态不确定。', '在小红书 MCP 设置中检查服务并完成登录。', { configured: true, enabled: true, loginStatus: xhs.loginStatus || 'unknown' }));
    } else {
      items.push(item('xhs-mcp', '小红书 MCP', 'normal', '已配置并已登录', '小红书自动发布具备调用条件。', '无需处理。', { configured: true, enabled: true, loginStatus: 'logged_in' }));
    }
    return items;
  }

  function encryptionItem() {
    if (kbEncryption.insecure) {
      return item('credential-security', '凭证保护', 'warning', '知识库仍使用旧版或过短密钥', '已保存的外部服务凭证保护强度不足。', '先创建备份，再重新保存凭证并更换至少 32 位密钥。');
    }
    return item('credential-security', '凭证保护', 'normal', '知识库凭证使用安全密钥保护', '已保存凭证不会以明文写入数据库。', '无需处理。', { source: kbEncryption.source === 'environment' ? 'environment' : 'managed' });
  }

  function run() {
    const items = [serviceItem(), databaseItem(), backupItem(), storageItem(), workspaceItem(), encryptionItem(), ...integrationItems()];
    const counts = items.reduce((result, entry) => {
      result[entry.status] += 1;
      return result;
    }, { normal: 0, warning: 0, error: 0 });
    const status = items.reduce((current, entry) => STATUS_ORDER[entry.status] > STATUS_ORDER[current] ? entry.status : current, 'normal');
    return {
      status,
      checkedAt: new Date(now()).toISOString(),
      counts,
      items,
    };
  }

  return { run };
}

module.exports = { STATUS_ORDER, make };
