import { Gauge, MessageSquare, Settings, UserCog, UserPlus } from '@lucide/vue';

export const adminNavigation = [
  {
    id: 'dashboard',
    label: '仪表盘',
    description: '查看站点运行概况',
    to: '/admin/dashboard',
    icon: Gauge
  },
  {
    id: 'users',
    label: '用户管理',
    description: '维护现有账号与权限',
    to: '/admin/users',
    icon: UserCog
  },
  {
    id: 'invites',
    label: '注册邀请',
    description: '创建账号与管理注册链接',
    to: '/admin/invites',
    icon: UserPlus,
    children: [
      { id: 'create-user', label: '创建用户', hash: '#create-user' },
      { id: 'registration-links', label: '注册链接', hash: '#registration-links' }
    ]
  },
  {
    id: 'messages',
    label: '信息查看',
    description: '检索群组与私信消息',
    to: '/admin/messages',
    icon: MessageSquare
  },
  {
    id: 'site',
    label: '网站设置',
    description: '维护站点外观与版本状态',
    to: '/admin/site',
    icon: Settings,
    children: [
      { id: 'site-appearance', label: '站点外观', hash: '#site-appearance' },
      { id: 'version-update', label: '版本更新', hash: '#version-update' }
    ]
  }
];

export const adminRouteIcons = {
  dashboard: Gauge,
  users: UserCog,
  invites: UserPlus,
  messages: MessageSquare,
  site: Settings
};
