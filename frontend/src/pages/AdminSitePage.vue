<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import store from '../store.js';
import AdminUpdateStatus from '../components/admin/AdminUpdateStatus.vue';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const savingSite = ref(false);
const iconUploading = ref(false);
const users = ref([]);
const channels = ref([]);
const dms = ref([]);
const iconFileInputEl = ref(null);

const siteForm = reactive({
  siteName: 'Edgechat',
  siteIconUrl: ''
});
const publicGroupCount = computed(
  () => channels.value.filter((channel) => channel.kind === 'public').length
);
const privateGroupCount = computed(
  () => channels.value.filter((channel) => channel.kind === 'private').length
);
async function loadOverview() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.adminOverview();
    users.value = payload.users;
    channels.value = payload.channels;
    dms.value = payload.dms;
    siteForm.siteName = payload.site?.siteName || 'Edgechat';
    siteForm.siteIconUrl = payload.site?.siteIconUrl || '';
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

function openIconPicker() {
  iconFileInputEl.value?.click();
}

async function uploadSiteIcon(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  iconUploading.value = true;
  error.value = '';
  try {
    const payload = await api.uploadFile(file);
    siteForm.siteIconUrl = payload.file.url;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    iconUploading.value = false;
    event.target.value = '';
  }
}

async function saveSiteSettings() {
  savingSite.value = true;
  error.value = '';
  try {
    const payload = await api.updateAdminSiteSettings(siteForm);
    siteForm.siteName = payload.site.siteName;
    siteForm.siteIconUrl = payload.site.siteIconUrl;
    store.setSite(payload.site);
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    savingSite.value = false;
  }
}

onMounted(loadOverview);
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h1>网站设置</h1>
        <p>查看站点概况，并处理后台级的群组创建与管理入口。</p>
      </div>
      <UiButton variant="secondary" @click="loadOverview">刷新概况</UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="loading" class="muted">站点概况加载中...</p>

      <section class="admin-metric-grid admin-metric-grid--wide">
        <UiSurface class="admin-metric-card">
          <strong>{{ users.length }}</strong>
          <span>站内用户</span>
        </UiSurface>
        <UiSurface class="admin-metric-card">
          <strong>{{ publicGroupCount }}</strong>
          <span>公开群组</span>
        </UiSurface>
        <UiSurface class="admin-metric-card">
          <strong>{{ privateGroupCount }}</strong>
          <span>私有群组</span>
        </UiSurface>
        <UiSurface class="admin-metric-card">
          <strong>{{ dms.length }}</strong>
          <span>私信会话</span>
        </UiSurface>
      </section>

      <section class="admin-grid admin-grid--two">
        <AdminUpdateStatus />

        <UiSurface class="panel">
          <h3 class="panel-title">站点外观</h3>
          <label class="field">
            <span>站点名称</span>
            <input v-model.trim="siteForm.siteName" placeholder="例如：Edgechat" />
          </label>
          <label class="field">
            <span>站点图标 URL</span>
            <input v-model.trim="siteForm.siteIconUrl" placeholder="/files/... 或 https://..." />
          </label>
          <div class="inline-actions">
            <input
              ref="iconFileInputEl"
              type="file"
              accept="image/*"
              style="display: none"
              @change="uploadSiteIcon"
            />
            <UiButton variant="secondary" size="sm" :disabled="iconUploading" @click="openIconPicker">
              {{ iconUploading ? '上传中...' : '上传图标' }}
            </UiButton>
            <UiButton :disabled="savingSite" @click="saveSiteSettings">
              {{ savingSite ? '保存中...' : '保存设置' }}
            </UiButton>
          </div>
          <div class="admin-site-preview">
            <div
              class="admin-site-preview__icon"
              :class="{ 'admin-site-preview__icon--empty': !siteForm.siteIconUrl }"
            >
              <img v-if="siteForm.siteIconUrl" :src="siteForm.siteIconUrl" alt="site icon" />
              <span v-else>{{ siteForm.siteName.slice(0, 1) || 'C' }}</span>
            </div>
            <div class="admin-site-preview__meta">
              <strong>{{ siteForm.siteName || 'Edgechat' }}</strong>
              <span>{{ siteForm.siteIconUrl || '未设置图标 URL' }}</span>
            </div>
          </div>
        </UiSurface>

        <UiSurface class="panel">
          <h3 class="panel-title">后台入口说明</h3>
          <div class="admin-notes-grid">
            <div class="admin-note">
              <strong>用户管理</strong>
              <span>负责账号生命周期，包括创建、禁用、删号和密码重置。</span>
            </div>
            <div class="admin-note">
              <strong>消息查看</strong>
              <span>负责全站消息检索，以及打开任意群组和私信的完整对话。</span>
            </div>
            <div class="admin-note">
              <strong>网站设置</strong>
              <span>负责后台级配置入口和平台运行概况，不再混入消息巡检操作。</span>
            </div>
          </div>
          <div class="inline-actions">
            <UiButton variant="secondary" size="sm" @click="router.push('/admin/users')">
              去用户管理
            </UiButton>
            <UiButton variant="secondary" size="sm" @click="router.push('/admin/messages')">
              去消息查看
            </UiButton>
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

.admin-grid--two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  flex-shrink: 0;
}

.admin-metric-grid--wide {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  flex-shrink: 0;
}

:deep(.admin-metric-card) {
  padding: 14px 16px !important;
  border-radius: 16px !important;
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
  font-size: 24px !important;
  color: #2c4a6e;
}

:deep(.admin-metric-card span) {
  font-size: 11px !important;
  color: #6b8aab;
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

.field--checkbox {
  flex-direction: row !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 8px 0;
}

.field--checkbox input[type="checkbox"] {
  width: 16px !important;
  height: 16px;
  accent-color: #5b8dbf;
}

.field--checkbox span {
  font-size: 12px !important;
  color: #2c4a6e;
}

:deep(.inline-actions) {
  gap: 6px !important;
}

:deep(.admin-site-preview) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(91, 141, 191, 0.04);
  border: 1px solid rgba(91, 141, 191, 0.1);
}

:deep(.admin-site-preview__icon) {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(91, 141, 191, 0.15), rgba(91, 141, 191, 0.08));
  border: 1px solid rgba(91, 141, 191, 0.15);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #2c4a6e;
  flex-shrink: 0;
}

:deep(.admin-site-preview__icon img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:deep(.admin-site-preview__meta) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.admin-site-preview__meta strong) {
  font-size: 13px;
  color: #2c4a6e;
}

:deep(.admin-site-preview__meta span) {
  font-size: 11px;
  color: #6b8aab;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-notes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

:deep(.admin-note) {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(91, 141, 191, 0.04);
  border: 1px solid rgba(91, 141, 191, 0.08);
}

:deep(.admin-note strong) {
  font-size: 12px;
  color: #2c4a6e;
}

:deep(.admin-note span) {
  font-size: 11px;
  color: #6b8aab;
  line-height: 1.4;
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
  .admin-metric-grid--wide {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .admin-grid--two {
    grid-template-columns: 1fr;
  }

  .admin-section__header {
    flex-direction: column;
  }

  .admin-metric-grid--wide {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-section,
  :deep(.panel),
  :deep(.admin-metric-card) {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
