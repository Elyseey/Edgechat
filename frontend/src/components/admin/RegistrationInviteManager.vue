<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../api.js';
import UiButton from '../ui/Button.vue';
import UiSurface from '../ui/Surface.vue';

const loading = ref(false);
const error = ref('');
const inviteSubmitting = ref(false);
const invites = ref([]);
const copiedInviteId = ref(0);
const inviteForm = reactive({
  note: '',
  maxUses: 1
});

const inviteMaxUsesValid = computed(
  () => Number.isInteger(inviteForm.maxUses) && inviteForm.maxUses >= 1 && inviteForm.maxUses <= 1000
);

function inviteLinkUrl(token) {
  return new URL(`/register/${token}`, window.location.origin).toString();
}

async function loadInvites() {
  loading.value = true;
  error.value = '';
  try {
    const payload = await api.listAdminRegisterLinks();
    invites.value = payload.invites || [];
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    loading.value = false;
  }
}

async function createInvite() {
  inviteSubmitting.value = true;
  error.value = '';
  try {
    const payload = await api.createAdminRegisterLink(inviteForm);
    invites.value = [payload.invite, ...invites.value];
    inviteForm.note = '';
    inviteForm.maxUses = 1;
  } catch (currentError) {
    error.value = currentError.message;
  } finally {
    inviteSubmitting.value = false;
  }
}

async function copyInvite(invite) {
  try {
    await navigator.clipboard.writeText(inviteLinkUrl(invite.token));
    copiedInviteId.value = invite.id;
    window.setTimeout(() => {
      if (copiedInviteId.value === invite.id) {
        copiedInviteId.value = 0;
      }
    }, 1600);
  } catch {
    error.value = '复制失败，请手动复制链接';
  }
}

async function revokeInvite(invite) {
  if (!window.confirm('确认停用这个注册链接吗？')) {
    return;
  }

  try {
    await api.revokeAdminRegisterLink(invite.id);
    invites.value = invites.value.filter((item) => item.id !== invite.id);
  } catch (currentError) {
    error.value = currentError.message;
  }
}

onMounted(loadInvites);
</script>

<template>
  <UiSurface class="panel registration-invite-manager">
    <h3 class="panel-title">注册链接</h3>
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="loading" class="muted">注册链接加载中...</p>

    <div class="invite-form-grid">
      <label class="field">
        <span>链接备注</span>
        <input v-model.trim="inviteForm.note" placeholder="例如：四月新成员入口" />
      </label>
      <label class="field">
        <span>可使用次数</span>
        <input v-model.number="inviteForm.maxUses" type="number" min="1" max="1000" step="1" />
      </label>
    </div>
    <UiButton block :disabled="inviteSubmitting || !inviteMaxUsesValid" @click="createInvite">
      {{ inviteSubmitting ? '创建中...' : '创建注册链接' }}
    </UiButton>

    <div class="invite-list">
      <div v-if="!loading && !invites.length" class="muted">还没有注册链接。</div>
      <UiSurface
        v-for="invite in invites"
        :key="invite.id"
        tone="soft"
        class="admin-invite-card"
      >
        <div class="admin-invite-card__head">
          <div>
            <strong>{{ invite.note || '未命名注册链接' }}</strong>
            <p>
              {{ invite.isAvailable
                ? `可用，已使用 ${invite.usedCount} / ${invite.maxUses} 次`
                : invite.deletedAt ? '已停用' : '次数已用完' }}
            </p>
          </div>
          <div class="inline-actions">
            <UiButton variant="secondary" size="sm" @click="copyInvite(invite)">
              {{ copiedInviteId === invite.id ? '已复制' : '复制链接' }}
            </UiButton>
            <UiButton
              v-if="invite.isAvailable"
              variant="destructive"
              size="sm"
              @click="revokeInvite(invite)"
            >
              停用
            </UiButton>
          </div>
        </div>
        <div class="admin-invite-card__url">{{ inviteLinkUrl(invite.token) }}</div>
        <div class="admin-invite-card__meta">
          <span>创建者：{{ invite.creatorDisplayName }}</span>
          <span>创建时间：{{ new Date(invite.createdAt).toLocaleString() }}</span>
          <span>剩余次数：{{ invite.remainingUses }}</span>
          <span v-if="invite.consumerDisplayName">最近使用者：{{ invite.consumerDisplayName }}</span>
        </div>
      </UiSurface>
    </div>
  </UiSurface>
</template>

<style scoped>
.registration-invite-manager {
  min-width: 0;
}

.invite-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 10px;
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
}

.invite-list::-webkit-scrollbar {
  width: 4px;
}

.invite-list::-webkit-scrollbar-track {
  background: transparent;
}

.invite-list::-webkit-scrollbar-thumb {
  background: rgba(91, 141, 191, 0.15);
  border-radius: 2px;
}

.admin-invite-card {
  padding: 10px;
  border-radius: 12px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.admin-invite-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 141, 191, 0.08);
}

.admin-invite-card__head strong {
  font-size: 12px;
  color: #2c4a6e;
}

.admin-invite-card__head p {
  font-size: 10px;
  color: #6b8aab;
}

.admin-invite-card__url {
  font-size: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(91, 141, 191, 0.06);
  color: #5b8dbf;
  word-break: break-all;
}

.admin-invite-card__meta {
  font-size: 10px;
  gap: 10px;
  color: #6b8aab;
}

@media (max-width: 560px) {
  .invite-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
