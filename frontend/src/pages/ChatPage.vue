<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AddConversationDialog from '../components/chat/AddConversationDialog.vue';
import CreateGroupDialog from '../components/chat/CreateGroupDialog.vue';
import GroupSettingsDialog from '../components/chat/GroupSettingsDialog.vue';
import MemberPanel from '../components/chat/MemberPanel.vue';
import MessageAttachment from '../components/chat/MessageAttachment.vue';
import PendingAttachmentPreview from '../components/chat/PendingAttachmentPreview.vue';
import UiAvatar from '../components/ui/Avatar.vue';
import UiTextarea from '../components/ui/Textarea.vue';
import { useActiveRoom } from '../composables/useActiveRoom.js';
import { useChatRoom } from '../composables/useChatRoom.js';
import { useChatSidebar } from '../composables/useChatSidebar.js';
import { useConversationCreation } from '../composables/useConversationCreation.js';
import { useRoomManagement } from '../composables/useRoomManagement.js';
import { useUnreadInbox } from '../composables/useUnreadInbox.js';
import store from '../store.js';

const router = useRouter();
const error = ref('');
const activeRoom = ref(null);
const session = computed(() => store.session);
const showAdminEntry = computed(() => Boolean(session.value?.isAdmin));

const { activeRoomKey, canManageActiveRoom, applyActiveChannel, selectDm, roomLabel } =
  useActiveRoom({ activeRoom });

const {
  channels, dms, users, sidebarLoading, conversationItems, formatListTime,
  refreshSidebar, openConversation, markConversationRead, applyConversationActivity
} = useChatSidebar({ applyActiveChannel, selectDm });

function handleRoomActivity({ room, message }) {
  applyConversationActivity({
    kind: room.kind,
    roomId: room.id,
    lastMessageAt: message.createdAt,
    unreadCount: 0
  });
  markConversationRead(room.kind, room.id);
}

function handleRoomAccessRevoked(room) {
  const roomName = room.name || 'this private room';
  error.value = room.kind === 'private'
    ? `You no longer have access to "${roomName}".`
    : 'You no longer have access to this room.';
  activeRoom.value = null;
  void refreshSidebar();
}

const {
  messages, loading, wsStatus, composerText, pendingAttachment, sending,
  messagesEl, fileInputEl, isOwnMessage,
  loadMessages, connectSocket, disconnectSocket, sendMessage, handleComposerKeydown,
  openFilePicker, uploadAttachment, clearAttachment, loadOlder
} = useChatRoom({
  activeRoom,
  session,
  error,
  onRoomActivity: handleRoomActivity,
  onRoomAccessRevoked: handleRoomAccessRevoked
});

const { connectUnreadInbox, disconnectUnreadInbox } = useUnreadInbox({
  activeRoom,
  markConversationRead,
  applyConversationActivity
});

const wsConnected = computed(() => wsStatus.value === 'open');

const roomManagement = useRoomManagement({
  activeRoom, channels, users, error, refreshSidebar, conversationItems,
  openConversation, canManageActiveRoom,
  onRoomDeleted: () => {
    disconnectSocket();
    messages.value = [];
  }
});
const { creation, members: memberManagement, settings: groupSettings, deleteGroup } = roomManagement;
const {
  show: showCreateGroup,
  form: createGroupForm,
  submitting: creatingGroup,
  open: openCreateGroup,
  close: closeCreateGroup,
  toggleMember: toggleCreateGroupMember,
  submit: createGroup
} = creation;
const {
  show: showAddConversation,
  usersWithoutDm,
  openingDmUserId,
  open: openAddConversation,
  close: closeAddConversation,
  startGroupCreation,
  openDm
} = useConversationCreation({
  users,
  dms,
  error,
  refreshSidebar,
  conversationItems,
  openConversation,
  openGroupDialog: openCreateGroup
});
const {
  show: showMemberPanel,
  items: groupMembers,
  loading: memberLoading,
  inviteUserId,
  availableUsers: availableInviteUsers,
  inviteSubmitting,
  toggle: toggleMemberPanel,
  invite: inviteMember,
  remove: removeMember
} = memberManagement;
const {
  show: showGroupEditor,
  form: groupSettingsForm,
  saving: groupSettingsSaving,
  avatarUploading: groupAvatarUploading,
  open: openGroupEditor,
  close: closeGroupEditor,
  uploadAvatar: uploadGroupAvatar,
  save: saveGroupSettings
} = groupSettings;

async function selectConversation(item) {
  await openConversation(item);
}

function logout() { store.logout(); router.push('/login'); }
function openAdmin() { router.push('/admin'); }

async function bootstrap() {
  error.value = '';
  try { await refreshSidebar(); }
  catch (e) { error.value = e.message; }
}

watch(activeRoomKey, async (k) => {
  if (!k) return;
  await loadMessages();
  connectSocket();
  for (const delay of [0, 50, 150, 300]) {
    await new Promise(r => setTimeout(r, delay));
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  }
});
onMounted(() => {
  void bootstrap().then(connectUnreadInbox);
});
function formatBubbleTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

onBeforeUnmount(() => {
  disconnectUnreadInbox();
  disconnectSocket();
});
</script>

<template>
  <div class="chat-layout">
    <!-- Far-Left Navigation Sidebar -->
    <aside class="right-sidebar">
      <div class="right-sidebar-inner">
        <div class="right-sidebar-section right-sidebar-actions">
          <button v-if="showAdminEntry" type="button" class="right-sidebar-action tooltip" data-tooltip="后台" @click="openAdmin">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
              <title>后台</title>
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>

        <div class="right-sidebar-section right-sidebar-user-group">
          <button type="button" class="right-sidebar-user tooltip" data-tooltip="个人设置" @click="router.push('/settings')">
            <UiAvatar :src="session?.avatarUrl" :fallback="session?.displayName?.[0] || 'U'" size="sm" />
          </button>
          <button type="button" class="right-sidebar-action right-sidebar-action--danger tooltip" data-tooltip="退出" @click="logout">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
              <title>退出</title>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Middle-Left Chat List Sidebar -->
    <aside class="left-sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <h1 class="brand-title">EdgeChat</h1>
          <button
            type="button"
            class="header-action"
            title="添加人员"
            aria-label="添加人员"
            aria-haspopup="dialog"
            :aria-expanded="showAddConversation"
            @click="openAddConversation"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <title>添加人员</title>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </button>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section sidebar-list">
          <div v-if="sidebarLoading" class="sidebar-hint">加载中...</div>
          <div v-else-if="!conversationItems.length" class="sidebar-hint">暂无会话</div>
          <button
            type="button"
            v-for="item in conversationItems" :key="item.key"
            class="sidebar-item" :class="{ 'sidebar-item--active': activeRoomKey === item.key }"
            @click="selectConversation(item)"
          >
            <UiAvatar :src="item.avatarUrl" :fallback="item.fallback?.[0] || '?'" size="sm" />
            <div class="sidebar-label-group">
              <div class="sidebar-item__top">
                <strong class="sidebar-label">{{ item.title }}</strong>
                <span class="sidebar-label sidebar-item__time">{{ formatListTime(item.lastMessageAt) }}</span>
              </div>
              <div class="sidebar-item__bottom">
                <p class="sidebar-label sidebar-item__preview">{{ item.subtitle }}</p>
                <span v-if="item.unreadCount > 0" class="sidebar-unread-badge">
                  {{ item.unreadCount > 99 ? '99+' : item.unreadCount }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </aside>

    <!-- Right Main Chat Window -->
    <main class="chat-main">
      <template v-if="activeRoom">
        <header class="chat-header">
          <h2>{{ roomLabel(activeRoom) }}</h2>
          <div class="chat-header__actions">
            <div class="chat-header__status" :class="wsConnected ? 'online' : 'offline'"></div>
            <button v-if="activeRoom.kind !== 'dm'" type="button" class="chat-header__button" @click="toggleMemberPanel">
              {{ showMemberPanel ? '收起成员' : '成员' }}
            </button>
            <button v-if="canManageActiveRoom" type="button" class="chat-header__button" @click="openGroupEditor">
              群设置
            </button>
          </div>
        </header>

        <section ref="messagesEl" class="chat-messages">
          <button v-if="messages.length" type="button" class="load-more-btn" @click="loadOlder">加载更早</button>
          <div v-if="loading" class="messages-hint">加载中...</div>
          <div v-else-if="!messages.length" class="messages-hint">暂无消息</div>

          <article
            v-for="msg in messages" :key="msg.id"
            class="message-row" :class="{ 'message-row--own': isOwnMessage(msg) }"
          >
            <div
              class="message-bubble"
              :class="{ 'message-bubble--with-attachment': msg.attachment }"
            >
              <div v-if="activeRoom.kind !== 'dm' && !isOwnMessage(msg)" class="message-sender-name">
                {{ msg.sender.displayName }}
              </div>
              <p v-if="msg.content">{{ msg.content }}</p>
              <MessageAttachment v-if="msg.attachment" :attachment="msg.attachment" />
              <span class="message-time">{{ formatBubbleTime(msg.createdAt) }}</span>
            </div>
          </article>
        </section>

        <footer class="chat-composer">
          <div v-if="pendingAttachment" class="composer-attachment">
            <PendingAttachmentPreview :attachment="pendingAttachment" @clear="clearAttachment" />
          </div>
          <div v-if="error" class="composer-error">{{ error }}</div>
          <div class="composer-row">
            <input ref="fileInputEl" type="file" class="composer-file-input" @change="uploadAttachment" />
            <button type="button" class="composer-btn" :disabled="!activeRoom" @click="openFilePicker">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
                <title>添加附件</title>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <UiTextarea
              v-model="composerText" class="composer-input" auto-grow :max-height="120" rows="1"
              :disabled="!activeRoom" placeholder="输入消息..." @keydown="handleComposerKeydown"
            />
            <button type="button" class="composer-send" :disabled="sending || !activeRoom" @click="sendMessage">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <title>发送</title>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <polyline points="14 6 20 12 14 18"/>
              </svg>
            </button>
          </div>
        </footer>
      </template>

      <div v-else class="chat-empty">
        <div class="empty-content">
          <div class="empty-brand">
            <span class="empty-title">EdgeChat</span>
          </div>
        </div>
      </div>
    </main>

    <aside v-if="showMemberPanel" class="room-management-sidebar">
      <MemberPanel
        :room="activeRoom"
        :members="groupMembers"
        :loading="memberLoading"
        :can-manage="canManageActiveRoom"
        :invite-user-id="inviteUserId"
        :available-invite-users="availableInviteUsers"
        :invite-submitting="inviteSubmitting"
        @update:invite-user-id="inviteUserId = $event"
        @invite="inviteMember"
        @remove-member="removeMember"
        @delete-group="deleteGroup"
      />
    </aside>

    <AddConversationDialog
      :show="showAddConversation"
      :users="usersWithoutDm"
      :opening-dm-user-id="openingDmUserId"
      :error="error"
      @close="closeAddConversation"
      @create-group="startGroupCreation"
      @open-dm="openDm"
    />

    <CreateGroupDialog
      :show="showCreateGroup"
      :users="users"
      :form="createGroupForm"
      :submitting="creatingGroup"
      @close="closeCreateGroup"
      @toggle-member="toggleCreateGroupMember"
      @submit="createGroup"
    />

    <GroupSettingsDialog
      :show="showGroupEditor"
      :room="activeRoom"
      :form="groupSettingsForm"
      :saving="groupSettingsSaving"
      :avatar-uploading="groupAvatarUploading"
      @close="closeGroupEditor"
      @upload-avatar="uploadGroupAvatar"
      @save="saveGroupSettings"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  background: #efeae2;
  width: 100%;
}

.left-sidebar {
  flex-shrink: 0;
  width: 350px;
  height: 100vh;
  position: relative;
  z-index: 10;
  overflow: hidden;
  background: #ffffff;
  border-right: 1px solid #e9edef;
}

.left-sidebar .sidebar-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  background: #ffffff;
}

.brand-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #008069;
  font-family: system-ui, -apple-system, sans-serif;
}

.header-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.header-action:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #111b21;
}

.sidebar-section {
  flex-shrink: 0;
}

.sidebar-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
}

.sidebar-list::-webkit-scrollbar { width: 4px; }
.sidebar-list::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 2px; }

.sidebar-divider {
  flex-shrink: 0;
  height: 1px;
  background: #f0f2f5;
}

.sidebar-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 8px;
  font-size: 13px;
  color: #8696a0;
}

.sidebar-item svg {
  flex-shrink: 0;
}

.sidebar-label-group {
  flex: 1;
  min-width: 0;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
.sidebar-item :deep(.ui-avatar) {
  flex-shrink: 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 150ms;
}

.sidebar-item:hover {
  background: #f5f6f6;
}

.sidebar-item--active {
  background: #f0f2f5;
}

.sidebar-item__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sidebar-item__top strong {
  font-size: 15px;
  font-weight: 500;
  color: #111b21;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item__time {
  font-size: 12px;
  color: #667781;
  flex-shrink: 0;
}

.sidebar-item__preview {
  margin: 0;
  font-size: 13px;
  color: #667781;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item__bottom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  min-width: 0;
}

.sidebar-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #25d366;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.right-sidebar {
  flex-shrink: 0;
  width: 68px;
  height: 100vh;
  position: relative;
  z-index: 10;
  overflow: hidden;
  background: #f0f2f5;
  border-right: 1px solid #e9edef;
}

.right-sidebar-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #f0f2f5;
  padding: 16px 8px;
  align-items: center;
}

.right-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.right-sidebar-user-group {
  margin-top: auto;
}

.right-sidebar-action,
.right-sidebar-user {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  transition: background 150ms, color 150ms, transform 150ms;
  padding: 0;
  position: relative;
}

.right-sidebar-action:hover,
.right-sidebar-user:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #111b21;
}

.right-sidebar-action--danger:hover {
  background: rgba(254, 242, 242, 0.8);
  color: #dc2626;
}

.tooltip {
  position: relative;
}

.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 120%;
  top: 50%;
  transform: translateY(-50%);
  background: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease, transform 150ms ease;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip:hover::after {
  opacity: 1;
  transform: translateY(-50%) translateX(4px);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #efeae2;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #f0f2f5;
  border-bottom: 1px solid #e9edef;
}

.chat-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header__button {
  padding: 6px 10px;
  border: 1px solid #d8dee2;
  border-radius: 8px;
  background: #fff;
  color: #54656f;
  font-size: 12px;
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}

.chat-header__button:hover {
  background: #f5f7fa;
  border-color: #c7d0d6;
  color: #111b21;
}

.chat-header h2 {
  margin: 0;
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111b21;
  background: transparent;
  border-radius: 0;
}

.chat-header__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
}

.chat-header__status.online {
  background: #10b981;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 3px; }

.load-more-btn {
  display: block;
  margin: 0 auto 16px;
  padding: 6px 16px;
  border: 1px solid #e8ecf0;
  border-radius: 16px;
  background: #fff;
  color: #54656f;
  font-size: 12px;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.load-more-btn:hover {
  background: #f5f7fa;
  border-color: #d1d5db;
}

.messages-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #8696a0;
  font-size: 14px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
  width: 100%;
  justify-content: flex-start;
}

.message-row--own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 65%;
  padding: 6px 10px 7px;
  border-radius: 8px;
  background: #ffffff;
  border: none;
  position: relative;
  word-break: break-word;
  box-shadow: 0 1px 0.5px rgba(11,20,26,.13);
}

.message-bubble--with-attachment {
  padding-bottom: 20px;
}

.message-row--own .message-bubble {
  background: #d9fdd3;
}

.message-sender-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #008069;
  margin-bottom: 4px;
}

.message-time {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 11px;
  line-height: 1;
  color: #667781;
  white-space: nowrap;
  user-select: none;
}

.message-bubble p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.45;
  color: #111b21;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 短消息在末行预留时间戳宽度，避免气泡收缩后正文与右下角时间重叠。 */
.message-bubble:not(.message-bubble--with-attachment) p::after {
  content: '';
  display: inline-block;
  width: 3.5em;
  height: 0;
}

.chat-composer {
  margin-top: auto;
  margin-bottom: 0;
  padding: 10px 16px;
  background: #f0f2f5;
  border-top: 1px solid #e9edef;
  position: relative;
  z-index: 2;
  margin-left: 0;
  margin-right: 0;
  border-radius: 0;
}

.composer-attachment {
  margin-bottom: 10px;
}

.composer-error {
  margin-bottom: 8px;
  font-size: 12px;
  color: #dc2626;
  text-align: center;
}

.composer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.composer-file-input {
  display: none;
}

.composer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #54656f;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
}

.composer-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
  color: #111b21;
}

.composer-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.composer-input {
  flex: 1;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
:deep(.composer-input.ui-textarea) {
  border: none;
  background: #ffffff;
  box-shadow: none;
  min-height: 40px;
  border-radius: 8px;
  padding: 10px 16px;
  color: #111b21;
  font-size: 15px;
  resize: none;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
:deep(.composer-input.ui-textarea:focus) {
  border-color: transparent;
  box-shadow: none;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
:deep(.composer-input.ui-textarea::placeholder) {
  color: #8696a0;
}

.composer-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 150ms;
}

.composer-send:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.composer-send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  user-select: none;
}

.empty-title {
  font-size: 28px;
  font-weight: 400;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-style: italic;
  letter-spacing: 0.02em;
  color: #111b21;
}

.room-management-sidebar {
  width: 340px;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  background: #f7f9fa;
  border-left: 1px solid #e9edef;
}

@media (max-width: 768px) {
  .left-sidebar {
    width: 280px;
  }
  .right-sidebar {
    width: 60px;
    padding: 10px 4px;
  }
  .right-sidebar-inner {
    padding: 10px 4px;
  }
  .right-sidebar-action,
  .right-sidebar-user {
    width: 36px;
    height: 36px;
  }
  .room-management-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 30;
    width: min(340px, 92vw);
    box-shadow: -12px 0 30px rgba(11, 20, 26, 0.16);
  }
}
</style>
