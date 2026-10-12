import { localApi } from './api.js';
import { gotoPage, prepareLeaveCurrentPage } from './navigation.js';
import { toast } from './components.js';

const pending = new Map();
const bounded = (value, max) => {
  const s = String(value ?? '');
  return s.length > max ? s.slice(0, max - 24) + '\n【内容过长，余下请查看原资料】' : s;
};

// Explicit user clicks only: no AI generation, publication or source-file writes.
export async function openCreatorWithSource({ kind, sourceId, title, brief, sources, autoDrafts = false }) {
  const key = `${kind}:${sourceId}`;
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    if (!await prepareLeaveCurrentPage()) return false;
    const identity = String(sourceId);
    const stableId = identity.length <= 500 ? identity : 'sha256:' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity)))).map(b => b.toString(16).padStart(2, '0')).join('');
    const result = await localApi('workbench/handoff', { method: 'POST', body: {
      kind, sourceId: stableId, title: bounded(title || '待完善的选题', 120),
      brief: bounded(brief, 30000), sources: bounded(sources, 10000),
    } });
    const entered = await gotoPage('workbench', { workbench: { projectId: result.project.id, autoDrafts } });
    if (entered !== false) toast(autoDrafts?'已进入内容创作，双平台初稿状态见页面上方。':result.reused?'已打开关联稿件，原稿未覆盖':'素材已转入内容创作', 'success');
    return entered;
  })().catch(error => { toast(`转入创作失败：${error.message}`, 'error'); return false; })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
