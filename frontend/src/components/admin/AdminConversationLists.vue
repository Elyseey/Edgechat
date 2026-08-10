<script setup>
import UiButton from '../ui/Button.vue';
import UiSurface from '../ui/Surface.vue';

defineProps({
  channels: { type: Array, default: () => [] },
  dms: { type: Array, default: () => [] }
});
const emit = defineEmits(['open-room', 'remove-channel']);
</script>

<template>
  <section class="admin-stack">
    <UiSurface class="panel">
      <h3 class="panel-title">群组列表</h3>
      <div class="admin-table-wrap">
        <table class="list-table">
          <thead>
            <tr>
              <th>群组</th>
              <th>统计</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in channels" :key="channel.id">
              <td>
                <strong>{{ channel.name }}</strong>
                <div class="muted">
                  {{ channel.kind === 'private' ? '私有群组' : '公开群组' }} · 群主 {{ channel.ownerDisplayName }}
                </div>
                <div class="muted">{{ channel.description || '无描述' }}</div>
              </td>
              <td>{{ channel.memberCount }} 人 / {{ channel.messageCount }} 条</td>
              <td>
                <div class="inline-actions">
                  <UiButton
                    variant="secondary"
                    size="sm"
                    @click="emit('open-room', channel.kind, channel.id, channel.name)"
                  >
                    打开对话
                  </UiButton>
                  <UiButton variant="destructive" size="sm" @click="emit('remove-channel', channel)">
                    删除
                  </UiButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiSurface>

    <UiSurface class="panel">
      <h3 class="panel-title">私信列表</h3>
      <div class="admin-table-wrap">
        <table class="list-table">
          <thead>
            <tr>
              <th>参与者</th>
              <th>DM Key</th>
              <th>消息数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dm in dms" :key="dm.id">
              <td><strong>{{ dm.participants }}</strong></td>
              <td class="muted">{{ dm.name }}</td>
              <td>{{ dm.messageCount }}</td>
              <td>
                <UiButton variant="secondary" size="sm" @click="emit('open-room', 'dm', dm.id, dm.participants)">
                  打开对话
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiSurface>
  </section>
</template>
