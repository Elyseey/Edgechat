import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const routerSource = read('../frontend/src/router.js');
const mainSource = read('../frontend/src/main.js');
const navigationSource = read('../frontend/src/admin/navigation.js');
const sidebarSource = read('../frontend/src/components/admin/AdminSidebar.vue');
const dashboardSource = read('../frontend/src/pages/AdminDashboardPage.vue');
const usersSource = read('../frontend/src/pages/AdminUsersPage.vue');
const invitesSource = read('../frontend/src/pages/AdminInvitesPage.vue');
const siteSource = read('../frontend/src/pages/AdminSitePage.vue');
const siteAppearanceSource = read('../frontend/src/components/admin/AdminSiteAppearance.vue');
const messagesSource = read('../frontend/src/pages/AdminMessagesPage.vue');
const messageSearchSource = read('../frontend/src/components/admin/AdminMessageSearchPanel.vue');
const conversationListsSource = read('../frontend/src/components/admin/AdminConversationLists.vue');
const adminStyles = read('../frontend/src/styles/admin.css');
const adminTokens = read('../frontend/src/styles/admin/tokens.css');
const legacyTokens = read('../frontend/src/styles/tokens.css');
const messageSearchStyles = read('../frontend/src/styles/admin/message-search.css');

test('后台默认进入仪表盘并新增受保护的注册邀请页', () => {
  assert.match(routerSource, /import AdminDashboardPage/);
  assert.match(routerSource, /import AdminInvitesPage/);
  assert.match(routerSource, /redirect: \{ name: 'admin-dashboard' \}/);
  assert.match(routerSource, /path: 'dashboard'/);
  assert.match(routerSource, /path: 'invites'/);
  assert.match(routerSource, /adminTitle: '注册邀请'/);
  assert.match(routerSource, /meta: \{ admin: true/);
});

test('侧栏只保留四个一级分类并折叠注册邀请与网站设置的二级项', () => {
  assert.match(sidebarSource, /Edgecht 管理后台/);
  for (const id of ['dashboard', 'users', 'invites', 'site']) {
    assert.match(navigationSource, new RegExp(`id: '${id}'`));
  }
  assert.match(navigationSource, /label: '创建用户'/);
  assert.match(navigationSource, /label: '注册链接'/);
  assert.match(navigationSource, /label: '站点外观'/);
  assert.match(navigationSource, /label: '版本更新'/);
  assert.doesNotMatch(navigationSource, /label: '消息查看'/);
  assert.match(sidebarSource, /v-if="!item\.children"/);
  assert.match(sidebarSource, /:aria-expanded="isGroupOpen\(item\)"/);
  assert.match(sidebarSource, /v-show="isGroupOpen\(item\)"/);
});

test('用户管理只维护用户列表，创建用户和注册链接集中在注册邀请页', () => {
  assert.match(usersSource, /用户列表/);
  assert.doesNotMatch(usersSource, /AdminUserCreator|RegistrationInviteManager|创建用户|注册链接/);
  assert.match(invitesSource, /import AdminUserCreator/);
  assert.match(invitesSource, /import RegistrationInviteManager/);
  assert.match(invitesSource, /id="create-user"/);
  assert.match(invitesSource, /id="registration-links"/);
});

test('网站设置只读取站点配置且不重复展示统计信息', () => {
  assert.match(siteAppearanceSource, /api\.adminSiteSettings\(\)/);
  assert.doesNotMatch(siteSource, /adminOverview|admin-metric|站内用户|公开群组|私信会话/);
  assert.match(siteSource, /id="site-appearance"/);
  assert.match(siteSource, /id="version-update"/);
});

test('仪表盘复用现有概况接口并只展示可验证统计', () => {
  assert.match(dashboardSource, /api\.adminOverview\(\)/);
  assert.match(dashboardSource, /channel\.messageCount/);
  assert.match(dashboardSource, /dm\.messageCount/);
  assert.match(dashboardSource, /overview\.value\.users\.filter/);
  assert.match(dashboardSource, /快捷访问/);
  assert.match(dashboardSource, /运行概况/);
});

test('后台操作面板保持纵向排列，消息搜索当前项使用黑底白字方块', () => {
  assert.doesNotMatch(`${usersSource}${invitesSource}${siteSource}${messagesSource}`, /admin-grid--two/);
  assert.match(messagesSource, /AdminMessageSearchPanel/);
  assert.match(messagesSource, /AdminConversationLists/);
  assert.match(conversationListsSource, /class="admin-stack"/);
  assert.doesNotMatch(conversationListsSource, /admin-grid--two/);
  assert.match(messageSearchSource, /search-mode-switch__item--active/);
  assert.match(
    messageSearchStyles,
    /button\.search-mode-switch__item--active\s*\{[\s\S]*background: var\(--admin-ink\);[\s\S]*color: var\(--admin-panel\);/
  );
});

test('后台视觉令牌匹配参考图并按职责拆分样式文件', () => {
  assert.match(mainSource, /import '\.\/styles\/admin\.css';/);
  assert.match(adminStyles, /@import '\.\/admin\/tokens\.css';/);
  assert.match(adminStyles, /@import '\.\/admin\/layout\.css';/);
  assert.match(adminStyles, /@import '\.\/admin\/controls\.css';/);
  assert.match(adminTokens, /--admin-workspace: #f0f3f8;/);
  assert.match(adminTokens, /--admin-panel: #ffffff;/);
  assert.match(adminTokens, /--admin-ink: #0d1731;/);
  assert.match(adminTokens, /--admin-green-bg: #f1fdfb;/);
  assert.match(adminTokens, /--admin-green: #168c87;/);
  assert.doesNotMatch(adminTokens, /backdrop-filter|linear-gradient/);
  assert.doesNotMatch(legacyTokens, /admin-shell|admin-grid--two|admin-metric-grid--wide/);
});

test('后台核心 Vue 文件保持在单一职责的可维护规模', () => {
  for (const [name, source] of [
    ['AdminSidebar', sidebarSource],
    ['AdminDashboardPage', dashboardSource],
    ['AdminUsersPage', usersSource],
    ['AdminSitePage', siteSource],
    ['AdminMessagesPage', messagesSource],
    ['AdminMessageSearchPanel', messageSearchSource]
  ]) {
    assert.ok(source.split('\n').length < 260, `${name} 不应重新膨胀为超大文件`);
  }
});
