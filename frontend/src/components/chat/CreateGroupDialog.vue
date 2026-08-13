<script setup>
import { ref, toRef } from 'vue';
import { useOverlayLifecycle } from '../../composables/useOverlayLifecycle.js';
import UiAvatar from '../ui/Avatar.vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  users: { type: Array, default: () => [] },
  form: { type: Object, required: true },
  submitting: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'toggle-member', 'submit']);
const nameInputEl = ref(null);

useOverlayLifecycle({
  open: toRef(props, 'show'),
  onClose: () => emit('close'),
  focusTarget: nameInputEl
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="room-dialog-overlay" @click.self="emit('close')">
      <section class="room-dialog" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
        <h2 id="create-group-title">创建群聊</h2>
        <label class="room-dialog__field">
          <span>群聊名称</span>
          <input ref="nameInputEl" v-model="form.name" type="text" class="room-dialog__input" autocomplete="off" />
        </label>

        <div class="room-dialog__members">
          <label>选择成员</label>
          <div class="room-dialog__member-list">
            <button
              v-for="user in users"
              :key="user.id"
              type="button"
              class="room-dialog__member"
              :class="{ 'room-dialog__member--selected': form.memberUserIds.includes(user.id) }"
              @click="emit('toggle-member', user.id)"
            >
              <UiAvatar :src="user.avatarUrl" :fallback="user.displayName?.[0] || '?'" size="sm" />
              <span>{{ user.displayName }}</span>
            </button>
          </div>
        </div>

        <div class="room-dialog__actions">
          <button type="button" class="room-dialog__secondary" @click="emit('close')">取消</button>
          <button
            type="button"
            class="room-dialog__primary"
            :disabled="!form.name.trim() || submitting"
            @click="emit('submit')"
          >
            {{ submitting ? '创建中...' : '创建' }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.room-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  background: rgba(0, 0, 0, 0.4);
}

.room-dialog {
  width: min(420px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.room-dialog h2 { margin: 0 0 20px; font-size: 18px; color: #111b21; }
.room-dialog__field { display: grid; gap: 8px; color: #6b7c93; font-size: 13px; }
.room-dialog__input { width: 100%; min-height: 44px; padding: 10px 14px; border: 1px solid #e8ecf0; border-radius: 8px; background: #f9fafb; font-size: 16px; }
.room-dialog__members { margin-top: 20px; }
.room-dialog__members > label { display: block; margin-bottom: 8px; font-size: 13px; color: #6b7c93; }
.room-dialog__member-list { display: flex; flex-wrap: wrap; gap: 8px; max-height: 180px; overflow-y: auto; }
.room-dialog__member { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 12px; border: 1px solid #e8ecf0; border-radius: 20px; background: #fff; cursor: pointer; touch-action: manipulation; }
.room-dialog__member--selected { border-color: #008069; background: #e8f0fe; }
.room-dialog__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.room-dialog__secondary, .room-dialog__primary { min-height: 44px; padding: 10px 20px; border-radius: 8px; cursor: pointer; touch-action: manipulation; }
.room-dialog__secondary { border: 1px solid #e8ecf0; background: #fff; }
.room-dialog__primary { border: 0; background: #008069; color: #fff; }
.room-dialog__primary:disabled { cursor: not-allowed; opacity: 0.55; }
.modal-fade-enter-active { transition: opacity 200ms; }
.modal-fade-leave-active { transition: opacity 150ms; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .room-dialog-overlay {
    align-items: flex-end;
    padding: env(safe-area-inset-top) 0 0;
  }

  .room-dialog {
    width: 100%;
    max-height: calc(100dvh - env(safe-area-inset-top));
    padding: 20px 16px max(16px, env(safe-area-inset-bottom));
    border-radius: 16px 16px 0 0;
  }

  .room-dialog__actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
