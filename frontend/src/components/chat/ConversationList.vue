<script setup>
import { BellOff } from "@lucide/vue";
import { t } from "../../i18n.js";
import UiAvatar from "../ui/Avatar.vue";

defineProps({
	items: {
		type: Array,
		default: () => [],
	},
	activeKey: {
		type: String,
		default: "",
	},
	loading: {
		type: Boolean,
		default: false,
	},
	isRoomMuted: {
		type: Function,
		default: () => false,
	},
});

const emit = defineEmits(["select"]);
</script>

<template>
	<div class="sidebar-section sidebar-list">
		<div v-if="loading" class="sidebar-hint">
			{{ t("chat.loadingConversations") }}
		</div>
		<div v-else-if="!items.length" class="sidebar-hint">
			{{ t("chat.noConversations") }}
		</div>
		<button
			v-for="item in items"
			:key="item.key"
			type="button"
			class="sidebar-item"
			:class="{ 'sidebar-item--active': activeKey === item.key }"
			@click="emit('select', item)"
		>
			<UiAvatar
				:src="item.avatarUrl"
				:fallback="item.fallback?.[0] || '?'"
				size="sm"
			/>
			<div class="sidebar-label-group">
				<div class="sidebar-item__top">
					<strong>{{ item.title }}</strong>
					<span class="sidebar-item__time">{{ item.dateLabel }}</span>
				</div>
				<div class="sidebar-item__bottom">
					<p class="sidebar-item__preview">{{ item.subtitle }}</p>
					<span
						v-if="isRoomMuted(item)"
						class="sidebar-muted-indicator"
						:title="t('chat.muted')"
						:aria-label="t('chat.muted')"
					>
						<BellOff :size="14" aria-hidden="true" />
					</span>
					<span v-if="item.unreadCount > 0" class="sidebar-unread-badge">
						{{ item.unreadCount > 99 ? "99+" : item.unreadCount }}
					</span>
				</div>
			</div>
		</button>
	</div>
</template>

<style scoped>
.sidebar-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
	padding: 0;
	touch-action: pan-y;
}

.sidebar-list::-webkit-scrollbar {
	width: 4px;
}

.sidebar-list::-webkit-scrollbar-thumb {
	border-radius: 2px;
	background: rgba(0, 0, 0, 0.15);
}

.sidebar-hint {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px 8px;
	color: #8696a0;
	font-size: 13px;
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
	touch-action: manipulation;
	transition: background 150ms;
}

.sidebar-item:hover {
	background: #f5f6f6;
}

.sidebar-item:active {
	background: rgba(0, 0, 0, 0.08);
}

.sidebar-item--active {
	background: #f0f2f5;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
.sidebar-item :deep(.ui-avatar) {
	flex-shrink: 0;
}

.sidebar-label-group {
	flex: 1;
	min-width: 0;
}

.sidebar-item__top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.sidebar-item__top strong {
	overflow: hidden;
	color: #111b21;
	font-size: 15px;
	font-weight: 500;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sidebar-item__time {
	flex-shrink: 0;
	color: #667781;
	font-size: 12px;
}

.sidebar-item__bottom {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	margin-top: 4px;
}

.sidebar-item__preview {
	flex: 1;
	min-width: 0;
	margin: 0;
	overflow: hidden;
	color: #667781;
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sidebar-muted-indicator {
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	color: #8696a0;
}

.sidebar-unread-badge {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	border-radius: 999px;
	background: #25d366;
	color: #ffffff;
	font-size: 11px;
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	line-height: 1;
}

@media (max-width: 960px) {
	.sidebar-list {
		padding-bottom: max(8px, env(safe-area-inset-bottom));
		overscroll-behavior: contain;
	}

	.sidebar-item {
		width: 100%;
		min-height: 68px;
		margin: 0;
		padding: 11px max(16px, env(safe-area-inset-right)) 11px
			max(16px, env(safe-area-inset-left));
		border-radius: 0;
	}

	.sidebar-item + .sidebar-item {
		border-top: 1px solid #f0f2f5;
	}
}

@media (prefers-reduced-motion: reduce) {
	.sidebar-item {
		transition: none;
	}
}
</style>
