<script setup>
import { KeyRound, RefreshCw, Save, Trash2 } from '@lucide/vue';
import { onMounted, reactive, ref } from 'vue';
import api from '../api.js';
import UiButton from '../components/ui/Button.vue';
import UiSurface from '../components/ui/Surface.vue';

const loading = ref(false);
const savingConfig = ref(false);
const savingMapping = ref(false);
const error = ref('');
const success = ref('');
const state = ref({ config: {}, channels: [], mappings: [] });
const configForm = reactive({ botToken: '' });
const mappingForm = reactive({ channelId: '', telegramChatId: '' });

function applyState(payload) {
  state.value = payload;
}

async function loadState() {
  loading.value = true;
  error.value = '';
  try {
    applyState(await api.adminTelegram());
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  savingConfig.value = true;
  error.value = '';
  success.value = '';
  try {
    applyState(await api.saveAdminTelegramConfig(configForm));
    configForm.botToken = '';
    success.value = 'Bot 已连接，Webhook 已更新。';
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    savingConfig.value = false;
  }
}

async function createMapping() {
  savingMapping.value = true;
  error.value = '';
  success.value = '';
  try {
    applyState(await api.createAdminTelegramMapping(mappingForm));
    mappingForm.telegramChatId = '';
    success.value = '群组映射已保存。';
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    savingMapping.value = false;
  }
}

async function toggleMapping(mapping) {
  error.value = '';
  try {
    applyState(await api.updateAdminTelegramMapping(mapping.id, { enabled: !mapping.enabled }));
  } catch (currentError) {
    error.value = currentError.message;
  }
}

async function removeMapping(mapping) {
  if (!window.confirm(`确认删除 ${mapping.channelName} 的 Telegram 映射吗？`)) return;
  error.value = '';
  try {
    applyState(await api.deleteAdminTelegramMapping(mapping.id));
  } catch (currentError) {
    error.value = currentError.message;
  }
}

onMounted(loadState);
</script>

<template>
  <div class="admin-section admin-telegram-page">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h2>Telegram 互通</h2>
        <p>连接一个 Telegram Bot，并将公开群组绑定到 Telegram 群聊。</p>
      </div>
      <UiButton variant="secondary" :disabled="loading" @click="loadState">
        <RefreshCw :size="16" :class="{ 'admin-spin': loading }" />
        刷新
      </UiButton>
    </header>

    <div class="admin-section__body">
      <p v-if="error" class="error-text">{{ error }}</p>
      <p v-if="success" class="success-text">{{ success }}</p>

      <UiSurface class="panel telegram-config-panel">
        <div class="telegram-panel-heading">
          <div>
            <h3 class="panel-title">Bot 连接</h3>
            <p class="muted">
              {{ state.config.configured ? `已连接 @${state.config.botUsername}` : '尚未连接 Bot' }}
            </p>
          </div>
          <span class="telegram-status" :class="{ 'telegram-status--online': state.config.configured }">
            {{ state.config.configured ? '已配置' : '未配置' }}
          </span>
        </div>
        <form class="telegram-config-form" @submit.prevent="saveConfig">
          <label class="field telegram-token-field">
            <span>Bot Token</span>
            <input v-model.trim="configForm.botToken" type="password" autocomplete="off" placeholder="123456789:AA..." />
          </label>
          <UiButton type="submit" :disabled="savingConfig || !configForm.botToken">
            <KeyRound v-if="!state.config.configured" :size="16" />
            <Save v-else :size="16" />
            {{ savingConfig ? '连接中...' : state.config.configured ? '更新 Token' : '连接 Bot' }}
          </UiButton>
        </form>
        <div v-if="state.config.webhookUrl" class="telegram-webhook-row">
          <span>Webhook</span>
          <code>{{ state.config.webhookUrl }}</code>
        </div>
      </UiSurface>

      <UiSurface class="panel panel--table">
        <div class="telegram-panel-heading">
          <div>
            <h3 class="panel-title">群组映射</h3>
            <p class="muted">{{ state.mappings.length }} 个 Telegram 群已绑定</p>
          </div>
        </div>
        <form class="telegram-mapping-form" @submit.prevent="createMapping">
          <label class="field">
            <span>EdgeChat 公开群组</span>
            <select v-model="mappingForm.channelId" required>
              <option disabled value="">选择群组</option>
              <option v-for="channel in state.channels" :key="channel.id" :value="channel.id">
                {{ channel.name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>Telegram 群 ID</span>
            <input v-model.trim="mappingForm.telegramChatId" required placeholder="-1001234567890" />
          </label>
          <UiButton type="submit" :disabled="savingMapping || !state.config.configured">
            <Save :size="16" />
            {{ savingMapping ? '保存中...' : '保存映射' }}
          </UiButton>
        </form>

        <div class="admin-table-wrap">
          <table class="list-table telegram-mapping-table">
            <thead>
              <tr><th>EdgeChat</th><th>Telegram</th><th>同步</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-if="loading && !state.mappings.length"><td colspan="4" class="muted">映射加载中...</td></tr>
              <tr v-else-if="!state.mappings.length"><td colspan="4" class="muted">暂无映射</td></tr>
              <tr v-for="mapping in state.mappings" :key="mapping.id">
                <td><strong>{{ mapping.channelName }}</strong></td>
                <td>
                  <strong>{{ mapping.telegramChatTitle || '未命名群聊' }}</strong>
                  <div class="muted telegram-chat-id">{{ mapping.telegramChatId }}</div>
                </td>
                <td>
                  <label class="telegram-switch">
                    <input type="checkbox" :checked="mapping.enabled" @change="toggleMapping(mapping)" />
                    <span aria-hidden="true"></span>
                    <span class="telegram-switch__label">{{ mapping.enabled ? '开启' : '暂停' }}</span>
                  </label>
                </td>
                <td>
                  <button type="button" class="admin-icon-button" title="删除映射" @click="removeMapping(mapping)">
                    <Trash2 :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiSurface>
    </div>
  </div>
</template>

<style scoped src="../styles/admin/telegram.css"></style>
