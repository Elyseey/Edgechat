import { createRouter, createWebHistory } from 'vue-router';
import { isDemoMode } from './runtime.js';
import store from './store.js';
import LoginPage from './pages/LoginPage.vue';
import RegisterPage from './pages/RegisterPage.vue';
import ChatPage from './pages/ChatPage.vue';
import AdminPage from './pages/AdminPage.vue';
import AdminDashboardPage from './pages/AdminDashboardPage.vue';
import AdminUsersPage from './pages/AdminUsersPage.vue';
import AdminStoragePage from './pages/AdminStoragePage.vue';
import AdminInvitesPage from './pages/AdminInvitesPage.vue';
import AdminSitePage from './pages/AdminSitePage.vue';
import AdminTelegramPage from './pages/AdminTelegramPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import { addAuthInvalidListener } from './auth-storage.js';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { public: true, transition: 'page' }
    },
    {
      path: '/register/:token',
      name: 'register',
      component: RegisterPage,
      meta: { public: true, transition: 'page' }
    },
    {
      path: '/',
      name: 'chat',
      component: ChatPage,
      meta: { transition: 'page' }
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { admin: true, transition: 'page' },
      children: [
        {
          path: '',
          redirect: { name: 'admin-dashboard' }
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboardPage,
          meta: { admin: true, adminTitle: '仪表盘', adminIcon: 'dashboard', transition: 'page' }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsersPage,
          meta: { admin: true, adminTitle: '用户管理', adminIcon: 'users', transition: 'page' }
        },
        {
          path: 'storage',
          name: 'admin-storage',
          component: AdminStoragePage,
          meta: { admin: true, adminTitle: '存储统计', adminIcon: 'storage', transition: 'page' }
        },
        {
          path: 'invites',
          name: 'admin-invites',
          component: AdminInvitesPage,
          meta: { admin: true, adminTitle: '注册邀请', adminIcon: 'invites', transition: 'page' }
        },
        {
          path: 'telegram',
          name: 'admin-telegram',
          component: AdminTelegramPage,
          meta: { admin: true, adminTitle: 'Telegram 互通', adminIcon: 'telegram', transition: 'page' }
        },
        {
          path: 'site',
          name: 'admin-site',
          component: AdminSitePage,
          meta: { admin: true, adminTitle: '网站设置', adminIcon: 'site', transition: 'page' }
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
      meta: { transition: 'page' }
    }
  ]
});

if (typeof window !== 'undefined') {
  addAuthInvalidListener(() => {
    if (router.currentRoute.value.path !== '/login') {
      void router.push('/login');
    }
  });
}

router.beforeEach(async (to) => {
  if (!store.ready) {
    await store.initialize();
  }

  if (to.meta.public) {
    if (!isDemoMode && store.session && to.path === '/login') {
      return '/';
    }
    return true;
  }

  if (!store.session) {
    return '/login';
  }

  if (to.meta.admin && !store.session.isAdmin) {
    return '/';
  }

  return true;
});

export default router;
