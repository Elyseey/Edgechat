<script setup>
import AdminUserCreator from '../components/admin/AdminUserCreator.vue';
import RegistrationInviteManager from '../components/admin/RegistrationInviteManager.vue';
</script>

<template>
  <div class="admin-section">
    <header class="admin-section__header">
      <div class="admin-section__heading">
        <h2>注册邀请</h2>
        <p>创建站内账号，或发放带使用次数限制的注册链接。</p>
      </div>
    </header>

    <div class="admin-section__body">
      <section id="create-user" class="admin-anchor-section">
        <AdminUserCreator />
      </section>
      <section id="registration-links" class="admin-anchor-section">
        <RegistrationInviteManager />
      </section>
    </div>
  </div>
</template>
