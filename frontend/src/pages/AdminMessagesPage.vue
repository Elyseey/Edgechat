<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const users = ref([]);
const channels = ref([]);
const dms = ref([]);
const searchResults = ref([]);
const searchMode = ref('filters');
const searching = ref(false);
const hasSearched = ref(false);
const searchError = ref('');

const searchForm = reactive({
  keyword: '',
  kind: '',
  userId: '',
  channelId: ''
});

const pairSearchForm = reactive({
  keyword: '',
  firstUserId: '',
  secondUserId: ''
});

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
    searchResults.value = [];
    hasSearched.value = false;
    searchError.value = currentError.message;
  } finally {
    searching.value = false;
  }
}

function setSearchMode(mode) {
  searchMode.value = mode;
  searchResults.value = [];
  hasSearched.value = false;
  searchError.value = '';
}

async function removeChannel(channel) {
  if (!window.confirm(`确认删除群组 ${channel.name} 吗？`)) {
    return;
  }
  await api.deleteChannel(channel.id);
  await loadAll();
}

function openRoom(kind, roomId, title) {
  router.push({
    name: 'admin-room',
    params: { kind, roomId },
    query: { title }
  });
}

function roomTitle(room) {
  if (room.kind !== 'dm') {
    return room.name;
  }

  return dms.value.find((dm) => dm.id === room.id)?.participants || '私信会话';
}

onMounted(loadAll);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h1>消息查看</h1>
        <p>搜索全站消息，并进入任意群组或私信的完整会话页查看上下文。</p>
      </div>
      <UiButton variant="secondary" @click="loadAll">刷新数据</UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="loading" class="muted">消息索引与会话数据加载中...</p>

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
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.displayName }}
                </option>
              </select>
            </label>
            <label class="field">
              <span>群组</span>
              <select v-model="searchForm.channelId">
                <option value="">全部</option>
                <option v-for="channel in channels" :key="channel.id" :value="channel.id">
                  {{ channel.name }}
                </option>
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

        <div
          v-else-if="searchResults.length"
          class="admin-table-wrap admin-table-wrap--bounded admin-table-wrap--search"
        >
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
                  <UiButton
                    variant="secondary"
                    size="sm"
                    @click="openRoom(item.room.kind, item.room.id, roomTitle(item.room))"
                  >
                    打开会话
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSurface>

      <section class="admin-grid admin-grid--two">
        <UiSurface class="panel">
          <h3 class="panel-title">群组列表</h3>
          <div class="admin-table-wrap">
            <table class="list-table">
              <thead>
                <tr>
                  <th>群组</th>
                  <th>统计</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="channel in channels" :key="channel.id">
                  <td>
                    <strong>{{ channel.name }}</strong>
                    <div class="muted">
                      {{ channel.kind === 'private' ? '私有群组' : '公开群组' }} · 群主 {{ channel.ownerDisplayName }}
                    </div>
                    <div class="muted">{{ channel.description || '无描述' }}</div>
                  </td>
                  <td>{{ channel.memberCount }} 人 / {{ channel.messageCount }} 条</td>
                  <td>
                    <div class="inline-actions">
                      <UiButton
                        variant="secondary"
                        size="sm"
                        @click="openRoom(channel.kind, channel.id, channel.name)"
                      >
                        打开对话
                      </UiButton>
                      <UiButton variant="destructive" size="sm" @click="removeChannel(channel)">
                        删除
                      </UiButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiSurface>

        <UiSurface class="panel">
          <h3 class="panel-title">私信列表</h3>
          <div class="admin-table-wrap">
            <table class="list-table">
              <thead>
                <tr>
                  <th>参与者</th>
                  <th>DM Key</th>
                  <th>消息数</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="dm in dms" :key="dm.id">
                  <td><strong>{{ dm.participants }}</strong></td>
                  <td class="muted">{{ dm.name }}</td>
                  <td>{{ dm.messageCount }}</td>
                  <td>
                    <UiButton variant="secondary" size="sm" @click="openRoom('dm', dm.id, dm.participants)">
                      打开对话
                    </UiButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiSurface>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
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

.admin-grid--two {
  display: grid;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  flex-shrink: 0;
}

.admin-search-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.pair-search-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.search-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-result-count {
  font-size: 11px;
  color: #6b8aab;
}

.search-mode-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-self: flex-start;
  padding: 3px;
  border: 1px solid rgba(91, 141, 191, 0.15);
  border-radius: 8px;
  background: rgba(91, 141, 191, 0.06);
}

.search-mode-switch button {
  min-width: 96px;
  padding: 7px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b8aab;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.search-mode-switch button:focus-visible {
  outline: 2px solid rgba(91, 141, 191, 0.45);
  outline-offset: 2px;
}

.search-mode-switch .search-mode-switch__item--active {
  background: rgba(255, 255, 255, 0.9);
  color: #2c4a6e;
  box-shadow: 0 1px 4px rgba(44, 74, 110, 0.12);
}

.message-search-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-feedback {
  margin: 0;
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

:deep(.panel:nth-child(1)) {
  animation-delay: 0.1s;
}

:deep(.panel:nth-child(2)) {
  animation-delay: 0.15s;
}

:deep(.panel:nth-child(3)) {
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

:deep(.field input),
:deep(.field select) {
  padding: 10px 12px !important;
  font-size: 13px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(91, 141, 191, 0.15) !important;
  background: rgba(255, 255, 255, 0.6) !important;
  color: #2c4a6e;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

:deep(.field input:focus),
:deep(.field select:focus) {
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
}

.admin-table-wrap--bounded {
  max-height: 180px;
}

.admin-table-wrap--search {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.search-results-table {
  width: 640px;
  min-width: 640px;
}

.search-results-table th:first-child,
.search-results-table td:first-child,
.search-results-table th:nth-child(2),
.search-results-table td:nth-child(2),
.search-results-table th:nth-child(3),
.search-results-table td:nth-child(3),
.search-results-table th:last-child,
.search-results-table td:last-child {
  white-space: nowrap;
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

@media (max-width: 960px) {
  .admin-search-grid,
  .pair-search-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .admin-grid--two {
    grid-template-columns: 1fr;
  }

  .admin-section__header {
    flex-direction: column;
  }

  .admin-search-grid,
  .pair-search-grid {
    grid-template-columns: 1fr;
  }

  .search-mode-switch {
    width: 100%;
  }

  .search-mode-switch button {
    min-width: 0;
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
