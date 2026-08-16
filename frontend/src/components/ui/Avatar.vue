<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  fallback: {
    type: String,
    default: '?'
  },
  size: {
    type: String,
    default: 'default'
  }
});

const initials = computed(() => String(props.fallback || '?').slice(0, 2).toUpperCase());
const failedSrc = ref('');
const showImage = computed(() => Boolean(props.src) && failedSrc.value !== props.src);

function handleImageError() {
  failedSrc.value = props.src;
}
</script>

<template>
  <div class="ui-avatar" :class="`ui-avatar--${size}`">
    <img v-if="showImage" :src="src" :alt="alt" @error="handleImageError" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
