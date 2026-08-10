<script setup>
import { onMounted, ref } from 'vue';
import api from '../api.js';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const loading = ref(false);
const error = ref('');
const users = ref([]);

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
        <h2>用户管理</h2>
        <p>查看现有账号，并处理禁用、密码重置与删除操作。</p>
      </div>
      <UiButton variant="secondary" :disabled="loading" @click="loadUsers">
        {{ loading ? '刷新中...' : '刷新用户' }}
      </UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>

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
              <tr v-if="loading && !users.length">
                <td colspan="4" class="muted">用户数据加载中...</td>
              </tr>
              <tr v-else-if="!users.length">
                <td colspan="4" class="muted">暂无用户</td>
              </tr>
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
