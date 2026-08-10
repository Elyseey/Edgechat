<script setup>
import { Gauge, Settings } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminRouteIcons } from '../../admin/navigation.js';

const route = useRoute();
const router = useRouter();

const currentIcon = computed(() => adminRouteIcons[route.meta.adminIcon] || Gauge);
const currentTitle = computed(() => route.meta.adminTitle || '管理后台');
</script>

<template>
  <header class="admin-topbar">
    <div class="admin-topbar__title">
      <component :is="currentIcon" :size="23" aria-hidden="true" />
      <h1>{{ currentTitle }}</h1>
    </div>
    <button type="button" class="admin-topbar__settings" @click="router.push('/admin/site')">
      <Settings :size="19" aria-hidden="true" />
      <span>设置</span>
    </button>
  </header>
</template>

<style scoped src="../../styles/admin/topbar.css"></style>
