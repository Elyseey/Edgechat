<script setup>
import { reactive, ref } from 'vue';
import api from '../../api.js';
import UiButton from '../ui/Button.vue';
import UiSurface from '../ui/Surface.vue';

const props = defineProps({
  users: { type: Array, default: () => [] },
  channels: { type: Array, default: () => [] },
  dms: { type: Array, default: () => [] }
});
const emit = defineEmits(['open-room']);
const searchResults = ref([]);
const searchMode = ref('filters');
const searching = ref(false);
const hasSearched = ref(false);
const searchError = ref('');

const searchForm = reactive({ keyword: '', kind: '', userId: '', channelId: '' });
const pairSearchForm = reactive({ keyword: '', firstUserId: '', secondUserId: '' });

function roomTitle(room) {
  if (room.kind !== 'dm') {
    return room.name;
  }
  return props.dms.find((dm) => dm.id === room.id)?.participants || '私信会话';
}

function setSearchMode(mode) {
  searchMode.value = mode;
  searchResults.value = [];
  hasSearched.value = false;
  searchError.value = '';
}

async function searchMessages() {
  searchError.value = '';
  searchResults.value = [];
  hasSearched.value = false;

  if (searchMode.value === 'pair') {
    if (!pairSearchForm.firstUserId || !pairSearchForm.secondUserId) {
      searchError.value = '请选择两名用户';
      return;
    }
    if (String(pairSearchForm.firstUserId) === String(pairSearchForm.secondUserId)) {
      searchError.value = '请选择两名不同的用户';
      return;
    }
  }

  searching.value = true;
  try {
    const params = searchMode.value === 'pair' ? pairSearchForm : searchForm;
    const payload = await api.searchMessages(params);
    searchResults.value = payload.messages;
    hasSearched.value = true;
  } catch (currentError) {
    searchError.value = currentError.message;
  } finally {
    searching.value = false;
  }
}

function openRoom(item) {
  emit('open-room', item.room.kind, item.room.id, roomTitle(item.room));
}
</script>

<template>
  <UiSurface class="panel">
    <div class="search-panel-heading">
      <h3 class="panel-title">消息搜索</h3>
      <span v-if="hasSearched" class="search-result-count">{{ searchResults.length }} 条结果</span>
    </div>

    <div class="search-mode-switch" role="tablist" aria-label="搜索方式">
      <button
        type="button"
        role="tab"
        :aria-selected="searchMode === 'filters'"
        :class="{ 'search-mode-switch__item--active': searchMode === 'filters' }"
        @click="setSearchMode('filters')"
      >
        条件搜索
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="searchMode === 'pair'"
        :class="{ 'search-mode-switch__item--active': searchMode === 'pair' }"
        @click="setSearchMode('pair')"
      >
        两人私信
      </button>
    </div>

    <form class="message-search-form" @submit.prevent="searchMessages">
      <div v-if="searchMode === 'filters'" class="search-grid admin-search-grid">
        <label class="field">
          <span>关键词</span>
          <input v-model.trim="searchForm.keyword" />
        </label>
        <label class="field">
          <span>会话类型</span>
          <select v-model="searchForm.kind">
            <option value="">全部</option>
            <option value="public">公开群组</option>
            <option value="private">私有群组</option>
            <option value="dm">私信</option>
          </select>
        </label>
        <label class="field">
          <span>发送用户</span>
          <select v-model="searchForm.userId">
            <option value="">全部</option>
            <option v-for="user in users" :key="user.id" :value="user.id">{{ user.displayName }}</option>
          </select>
        </label>
        <label class="field">
          <span>群组</span>
          <select v-model="searchForm.channelId">
            <option value="">全部</option>
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">{{ channel.name }}</option>
          </select>
        </label>
      </div>

      <div v-else class="search-grid pair-search-grid">
        <label class="field">
          <span>用户一</span>
          <select v-model="pairSearchForm.firstUserId">
            <option value="">请选择用户</option>
            <option
              v-for="user in users"
              :key="user.id"
              :value="user.id"
              :disabled="String(user.id) === String(pairSearchForm.secondUserId)"
            >
              {{ user.displayName }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>用户二</span>
          <select v-model="pairSearchForm.secondUserId">
            <option value="">请选择用户</option>
            <option
              v-for="user in users"
              :key="user.id"
              :value="user.id"
              :disabled="String(user.id) === String(pairSearchForm.firstUserId)"
            >
              {{ user.displayName }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>关键词</span>
          <input v-model.trim="pairSearchForm.keyword" />
        </label>
      </div>

      <div class="inline-actions">
        <UiButton type="submit" :disabled="searching">
          {{ searching ? '搜索中...' : '开始搜索' }}
        </UiButton>
      </div>
    </form>

    <p v-if="searchError" class="error-text search-feedback">{{ searchError }}</p>
    <p v-else-if="searching" class="muted search-feedback">正在查询消息...</p>
    <p v-else-if="hasSearched && !searchResults.length" class="muted search-feedback">没有找到匹配的消息</p>

    <div v-else-if="searchResults.length" class="admin-table-wrap admin-table-wrap--bounded admin-table-wrap--search">
      <table class="list-table search-results-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>发送者</th>
            <th>会话</th>
            <th>内容</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in searchResults" :key="item.id">
            <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
            <td>{{ item.sender.displayName }}</td>
            <td>{{ item.room.kind === 'dm' ? '私信' : '群组' }} · {{ roomTitle(item.room) }}</td>
            <td>{{ item.content || item.attachmentName }}</td>
            <td>
              <UiButton variant="secondary" size="sm" @click="openRoom(item)">打开会话</UiButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiSurface>
</template>

<style scoped src="../../styles/admin/message-search.css"></style>
