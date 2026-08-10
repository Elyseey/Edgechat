<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import AdminConversationLists from '../components/admin/AdminConversationLists.vue';
import AdminMessageSearchPanel from '../components/admin/AdminMessageSearchPanel.vue';
import UiButton from '../components/ui/Button.vue';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const users = ref([]);
const channels = ref([]);
const dms = ref([]);

async function loadAll() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.adminOverview();
    users.value = payload.users;
    channels.value = payload.channels;
    dms.value = payload.dms;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

async function removeChannel(channel) {
  if (!window.confirm(`确认删除群组 ${channel.name} 吗？`)) {
    return;
  }
  await api.deleteChannel(channel.id);
  await loadAll();
}

function openRoom(kind, roomId, title) {
  void router.push({ name: 'admin-room', params: { kind, roomId }, query: { title } });
}

onMounted(loadAll);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h2>消息巡检</h2>
        <p>搜索全站消息，并进入任意群组或私信的完整会话页查看上下文。</p>
      </div>
      <UiButton variant="secondary" :disabled="loading" @click="loadAll">
        {{ loading ? '刷新中...' : '刷新数据' }}
      </UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <AdminMessageSearchPanel :users="users" :channels="channels" :dms="dms" @open-room="openRoom" />
      <AdminConversationLists
        :channels="channels"
        :dms="dms"
        @open-room="openRoom"
        @remove-channel="removeChannel"
      />
    </div>
  </div>
</template>
