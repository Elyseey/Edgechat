<script setup>
import { ref } from 'vue';
import UiAvatar from '../ui/Avatar.vue';

defineProps({
  show: { type: Boolean, default: false },
  room: { type: Object, default: null },
  form: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  avatarUploading: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'upload-avatar', 'save']);
const avatarInput = ref(null);

function openAvatarPicker() {
  avatarInput.value?.click();
}
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="room-dialog-overlay" @click.self="emit('close')">
      <section class="room-dialog" aria-labelledby="group-settings-title">
        <h2 id="group-settings-title">群组设置</h2>

        <div class="room-dialog__avatar-row">
          <UiAvatar :src="form.avatarUrl" :fallback="room?.name?.[0] || '?'" />
          <input ref="avatarInput" type="file" class="room-dialog__file" accept="image/*" @change="emit('upload-avatar', $event)" />
          <button type="button" class="room-dialog__secondary" :disabled="avatarUploading" @click="openAvatarPicker">
            {{ avatarUploading ? '上传中...' : '更换头像' }}
          </button>
        </div>

        <label class="room-dialog__field">
          <span>群组名称</span>
          <input v-model="form.name" type="text" class="room-dialog__input" :disabled="room?.isGeneral" />
        </label>

        <div class="room-dialog__actions">
          <button type="button" class="room-dialog__secondary" @click="emit('close')">取消</button>
          <button type="button" class="room-dialog__primary" :disabled="!form.name.trim() || saving" @click="emit('save')">
            {{ saving ? '保存中...' : '保存' }}
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
  background: rgba(0, 0, 0, 0.4);
}
.room-dialog { width: min(420px, calc(100vw - 32px)); padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); }
.room-dialog h2 { margin: 0 0 20px; font-size: 18px; color: #111b21; }
.room-dialog__avatar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.room-dialog__file { display: none; }
.room-dialog__field { display: grid; gap: 8px; color: #6b7c93; font-size: 13px; }
.room-dialog__input { width: 100%; padding: 12px 16px; border: 1px solid #e8ecf0; border-radius: 10px; background: #f9fafb; }
.room-dialog__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.room-dialog__secondary, .room-dialog__primary { padding: 10px 20px; border-radius: 10px; cursor: pointer; }
.room-dialog__secondary { border: 1px solid #e8ecf0; background: #fff; }
.room-dialog__primary { border: 0; background: #008069; color: #fff; }
.room-dialog__primary:disabled, .room-dialog__secondary:disabled { cursor: not-allowed; opacity: 0.55; }
.modal-fade-enter-active { transition: opacity 200ms; }
.modal-fade-leave-active { transition: opacity 150ms; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
