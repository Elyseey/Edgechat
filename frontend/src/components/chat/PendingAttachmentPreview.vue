<script setup>
import { computed } from 'vue';
import UiBadge from '../ui/Badge.vue';
import UiButton from '../ui/Button.vue';
import { isPreviewableImageAttachment } from './attachment-utils.js';

const props = defineProps({
  attachment: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['clear']);
const isImage = computed(() => isPreviewableImageAttachment(props.attachment));
const displayName = computed(() => props.attachment?.name || '附件');
</script>

<template>
  <div class="pending-attachment" :class="{ 'pending-attachment--image': isImage }">
    <img
      v-if="isImage"
      class="pending-attachment__thumb"
      :src="attachment.url"
      :alt="displayName"
      loading="lazy"
    />
    <UiBadge variant="secondary">{{ displayName }}</UiBadge>
    <UiButton variant="ghost" size="sm" @click="emit('clear')">移除</UiButton>
  </div>
</template>
