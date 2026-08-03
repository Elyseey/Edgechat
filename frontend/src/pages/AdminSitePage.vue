<script setup>
import AdminSiteAppearance from '../components/admin/AdminSiteAppearance.vue';
import AdminUpdateStatus from '../components/admin/AdminUpdateStatus.vue';
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h2>网站设置</h2>
        <p>维护站点外观与版本状态，不在此处重复展示仪表盘统计。</p>
      </div>
    </header>

    <div class="admin-section__body">
      <section id="site-appearance" class="admin-anchor-section">
        <AdminSiteAppearance />
      </section>
      <section id="version-update" class="admin-anchor-section">
        <AdminUpdateStatus />
      </section>
    </div>
  </div>
</template>
