import { currentPage } from './state.js';
import { toast } from './components.js';
import { gotoPage } from './navigation.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderHotlist, clearHotCache } from './pages/hotlist.js';
import { renderInspiration } from './pages/inspiration.js';
import { renderSearch, doSearch, showSearchHistory } from './pages/search.js';
import { renderTracker } from './pages/tracker.js';
import { renderLibrary } from './pages/knowledgebase.js';
import { renderSkills, clearSkillCache } from './pages/agent.js';
import { renderAgent } from './pages/agent.js';
import { renderSettings } from './pages/settings.js';
import { renderContentProjects } from './pages/content-projects.js';
import { renderCreator } from './pages/creator.js';
import { refreshDetail } from './pages/detail.js';

export { gotoPage, toggleSidebar, openMobileSidebar, closeMobileSidebar } from './navigation.js';

export async function refreshCurrent() {
  let refresh = null;
  if (currentPage === 'dashboard') refresh = () => renderDashboard();
  else if (currentPage === 'workbench') refresh = () => gotoPage('workbench', { replaceHistory: true });
  else if (currentPage === 'news') refresh = () => gotoPage('news', {replaceHistory:true});
  else if (currentPage === 'hotlist') refresh = () => { clearHotCache(); return renderHotlist(); };
  else if (currentPage === 'inspiration') refresh = () => renderInspiration();
  else if (currentPage === 'projects') refresh = () => renderContentProjects();
  else if (currentPage === 'tracker') refresh = () => renderTracker();
  else if (currentPage === 'library' || currentPage === 'knowledgebase') refresh = () => renderLibrary();
  else if (currentPage === 'creator') refresh = () => renderCreator();
  else if (currentPage === 'detail') refresh = () => refreshDetail();
  else if (currentPage === 'skills') refresh = () => { clearSkillCache(); return renderSkills(); };
  else if (currentPage === 'agent') refresh = () => renderAgent();
  else if (currentPage === 'settings') refresh = () => renderSettings();
  else if (currentPage === 'search') refresh = () => showSearchHistory();
  if (!refresh) {
    toast('当前页面不支持刷新', 'info');
    return false;
  }
  try {
    const result = await refresh();
    if (result === false) {
      toast(currentPage === 'detail' ? '没有可重新加载的作品' : '页面已刷新，但部分状态读取失败', 'info');
      return false;
    }
    toast('已刷新', 'success');
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') toast(`刷新失败：${error.message}`, 'error');
    return false;
  }
}

export async function doGlobalSearch() {
  const kw = document.getElementById('globalSearch').value.trim();
  if (!kw) return;
  if (await gotoPage('search') === false) return;
  document.getElementById('searchInput').value = kw;
  doSearch();
}
