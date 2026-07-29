<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../api.js';
import RegistrationInviteManager from '../components/admin/RegistrationInviteManager.vue';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const loading = ref(false);
const error = ref('');
const users = ref([]);
const createUserForm = reactive({
  username: '',
  displayName: '',
  password: ''
});
const activeUserCount = computed(() => users.value.filter((user) => !user.isDisabled).length);

async function loadUsers() {
  loading.value = true;
  error.value = '';
  try {
    const usersPayload = await api.adminUsers();
    users.value = usersPayload.users;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

async function submitUser() {
  await api.createUser(createUserForm);
  createUserForm.username = '';
  createUserForm.displayName = '';
  createUserForm.password = '';
  await loadUsers();
}

async function toggleUser(user) {
  await api.updateUser(user.id, {
    isDisabled: !user.isDisabled,
    displayName: user.displayName
  });
  await loadUsers();
}

async function resetPassword(user) {
  const password = window.prompt(`为 ${user.displayName} 设置新密码`);
  if (!password) {
    return;
  }
  await api.resetPassword(user.id, password);
}

async function removeUser(user) {
  if (!window.confirm(`确认删除用户 ${user.displayName} 吗？`)) {
    return;
  }
  await api.deleteUser(user.id);
  await loadUsers();
}

onMounted(loadUsers);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h1>用户管理</h1>
        <p>统一处理站内账号的创建、状态控制和密码维护。</p>
      </div>
      <div class="admin-metric-grid admin-metric-grid--compact">
        <UiSurface class="admin-metric-card">
          <strong>{{ users.length }}</strong>
          <span>总用户数</span>
        </UiSurface>
        <UiSurface class="admin-metric-card">
          <strong>{{ activeUserCount }}</strong>
          <span>正常用户</span>
        </UiSurface>
      </div>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="loading" class="muted">用户数据加载中...</p>

      <section class="admin-grid admin-grid--two">
        <UiSurface class="panel">
          <h3 class="panel-title">创建用户</h3>
          <label class="field">
            <span>用户名</span>
            <input v-model.trim="createUserForm.username" />
          </label>
          <label class="field">
            <span>显示名称</span>
            <input v-model.trim="createUserForm.displayName" />
          </label>
          <label class="field">
            <span>初始密码</span>
            <input v-model="createUserForm.password" type="password" />
          </label>
          <UiButton block @click="submitUser">创建用户</UiButton>
        </UiSurface>

        <RegistrationInviteManager />
      </section>

      <UiSurface class="panel panel--table">
        <h3 class="panel-title">用户列表</h3>
        <div class="admin-table-wrap">
          <table class="list-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <strong>{{ user.displayName }}</strong>
                  <div class="muted">@{{ user.username }}</div>
                </td>
                <td>{{ user.isDisabled ? '已禁用' : '正常' }}</td>
                <td>{{ new Date(user.createdAt).toLocaleString() }}</td>
                <td>
                  <div class="inline-actions">
                    <UiButton variant="secondary" size="sm" @click="toggleUser(user)">
                      {{ user.isDisabled ? '启用' : '禁用' }}
                    </UiButton>
                    <UiButton variant="secondary" size="sm" @click="resetPassword(user)">重置密码</UiButton>
                    <UiButton variant="destructive" size="sm" @click="removeUser(user)">删除</UiButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSurface>
    </div>
  </div>
</template>

<style scoped>
.admin-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
  animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.admin-section__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
}

.admin-section__heading h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2c4a6e;
  letter-spacing: -0.02em;
}

.admin-section__heading p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b8aab;
}

.admin-section__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.admin-section__body::-webkit-scrollbar { width: 5px; }
.admin-section__body::-webkit-scrollbar-track { background: transparent; }
.admin-section__body::-webkit-scrollbar-thumb {
  background: rgba(91, 141, 191, 0.2);
  border-radius: 3px;
}

.admin-metric-grid--compact {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

:deep(.admin-metric-card) {
  padding: 10px 16px !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow:
    0 4px 16px rgba(91, 141, 191, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

:deep(.admin-metric-card:hover) {
  transform: translateY(-2px);
  box-shadow:
    0 8px 24px rgba(91, 141, 191, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
}

:deep(.admin-metric-card strong) {
  font-size: 20px !important;
  color: #2c4a6e;
}

:deep(.admin-metric-card span) {
  font-size: 10px !important;
  color: #6b8aab;
}

.admin-grid--two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  flex-shrink: 0;
}

:deep(.panel) {
  padding: 18px !important;
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  box-shadow:
    0 8px 32px rgba(91, 141, 191, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  gap: 12px !important;
  opacity: 0;
  animation: cardRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

:deep(.panel--table) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.panel:nth-child(1)) {
  animation-delay: 0.1s;
}

:deep(.panel:nth-child(2)) {
  animation-delay: 0.2s;
}

:deep(.panel-title) {
  font-size: 14px !important;
  font-weight: 600 !important;
  margin: 0 !important;
  color: #2c4a6e;
}

:deep(.field) {
  gap: 4px !important;
  margin-bottom: 0 !important;
}

:deep(.field span) {
  font-size: 11px !important;
  color: #6b8aab;
  font-weight: 500;
}

:deep(.field input) {
  padding: 10px 12px !important;
  font-size: 13px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(91, 141, 191, 0.15) !important;
  background: rgba(255, 255, 255, 0.6) !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

:deep(.field input:focus) {
  border-color: rgba(91, 141, 191, 0.4) !important;
  box-shadow: 0 0 0 3px rgba(91, 141, 191, 0.1) !important;
  background: rgba(255, 255, 255, 0.9) !important;
}

:deep(.inline-actions) {
  gap: 6px !important;
}

:deep(.list-table) {
  font-size: 12px !important;
  width: 100%;
  border-collapse: collapse;
}

:deep(.list-table th) {
  padding: 8px 12px !important;
  font-size: 11px !important;
  font-weight: 600;
  color: #6b8aab;
  text-align: left;
  border-bottom: 1px solid rgba(91, 141, 191, 0.12);
}

:deep(.list-table td) {
  padding: 10px 12px !important;
  border-bottom: 1px solid rgba(91, 141, 191, 0.08);
}

:deep(.list-table td strong) {
  font-size: 12px !important;
  color: #2c4a6e;
}

:deep(.list-table .muted) {
  font-size: 10px !important;
  color: #6b8aab;
}

:deep(.list-table tbody tr) {
  transition: background 0.15s ease;
}

:deep(.list-table tbody tr:hover) {
  background: rgba(91, 141, 191, 0.03);
}

:deep(.error-text) {
  font-size: 12px !important;
  color: #d9534f;
  padding: 10px 14px;
  background: rgba(217, 83, 79, 0.08);
  border-radius: 10px;
}

:deep(.muted) {
  font-size: 12px !important;
  color: #6b8aab;
}

.admin-table-wrap {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .admin-grid--two {
    grid-template-columns: 1fr;
  }

  .admin-section__header {
    flex-direction: column;
  }

  .admin-metric-grid--compact {
    width: 100%;
  }

  :deep(.admin-metric-card) {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-section,
  :deep(.panel) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
