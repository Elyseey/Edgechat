<script setup>
import { ArrowRight, Paperclip } from "@lucide/vue";
import { computed, ref } from "vue";
import { t } from "../../i18n.js";
import UiTextarea from "../ui/Textarea.vue";
import PendingAttachmentPreview from "./PendingAttachmentPreview.vue";

const props = defineProps({
	modelValue: {
		type: String,
		default: "",
	},
	pendingAttachment: {
		type: Object,
		default: null,
	},
	sending: {
		type: Boolean,
		default: false,
	},
	disabled: {
		type: Boolean,
		default: false,
	},
	error: {
		type: String,
		default: "",
	},
});

const emit = defineEmits([
	"update:modelValue",
	"send",
	"upload",
	"clear-attachment",
]);
const fileInput = ref(null);
const sendDisabled = computed(
	() =>
		props.disabled ||
		props.sending ||
		(!props.modelValue.trim() && !props.pendingAttachment),
);

function handleKeydown(event) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		if (sendDisabled.value) {
			return;
		}
		emit("send");
	}
}

function openPicker() {
	fileInput.value?.click();
}
</script>

<template>
	<footer class="chat-composer">
		<div v-if="pendingAttachment" class="composer-attachment">
			<PendingAttachmentPreview
				:attachment="pendingAttachment"
				@clear="emit('clear-attachment')"
			/>
		</div>
		<div v-if="error" class="composer-error">{{ error }}</div>
		<div class="composer-row">
			<input
				ref="fileInput"
				type="file"
				class="composer-file-input"
				@change="emit('upload', $event)"
			/>
			<button
				type="button"
				class="composer-btn"
				:disabled="disabled"
				:title="t('chat.addAttachment')"
				:aria-label="t('chat.addAttachment')"
				@click="openPicker"
			>
				<Paperclip :size="20" aria-hidden="true" />
			</button>
			<UiTextarea
				:model-value="modelValue"
				class="composer-input"
				auto-grow
				:max-height="120"
				rows="1"
				:disabled="disabled"
				:placeholder="t('chat.messagePlaceholder')"
				@update:model-value="emit('update:modelValue', $event)"
				@keydown="handleKeydown"
			/>
			<button
				type="button"
				class="composer-send"
				:disabled="sendDisabled"
				:title="t('chat.sendMessage')"
				:aria-label="t('chat.sendMessage')"
				@click="emit('send')"
			>
				<ArrowRight :size="22" aria-hidden="true" />
			</button>
		</div>
	</footer>
</template>

<style scoped>
.chat-composer {
	position: relative;
	z-index: 2;
	margin: auto 0 0;
	padding: 10px 16px;
	border-top: 1px solid #e9edef;
	border-radius: 0;
	background: #f0f2f5;
}

.composer-attachment {
	min-width: 0;
	margin-bottom: 10px;
}

.composer-error {
	margin-bottom: 8px;
	color: #dc2626;
	font-size: 12px;
	text-align: center;
}

.composer-row {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.composer-file-input {
	display: none;
}

.composer-btn,
.composer-send {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border: none;
	border-radius: 50%;
	background: transparent;
	cursor: pointer;
	touch-action: manipulation;
}

.composer-btn {
	color: #54656f;
	transition: background 150ms, color 150ms;
}

.composer-btn:hover:not(:disabled) {
	background: rgba(0, 0, 0, 0.05);
	color: #111b21;
}

.composer-send {
	color: #3b82f6;
	transition: background 150ms;
}

.composer-send:hover:not(:disabled) {
	background: rgba(0, 0, 0, 0.05);
}

.composer-btn:active:not(:disabled),
.composer-send:active:not(:disabled) {
	background: rgba(0, 0, 0, 0.08);
}

.composer-btn:disabled {
	cursor: not-allowed;
	opacity: 0.4;
}

.composer-send:disabled {
	cursor: not-allowed;
	opacity: 0.3;
}

.composer-input {
	flex: 1;
	min-width: 0;
}

/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
:deep(.composer-input.ui-textarea) {
	width: 100%;
	min-width: 0;
	min-height: 40px;
	padding: 10px 16px;
	border: none;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: none;
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

@media (max-width: 960px) {
	.chat-composer {
		padding: 8px max(8px, env(safe-area-inset-right))
			max(8px, env(safe-area-inset-bottom))
			max(8px, env(safe-area-inset-left));
	}

	.composer-row {
		gap: 4px;
	}

	.composer-btn,
	.composer-send {
		width: 44px;
		height: 44px;
	}

	/* biome-ignore lint/correctness/noUnknownPseudoClass: Vue deep selector */
	:deep(.composer-input.ui-textarea) {
		min-height: 44px;
		padding: 11px 12px;
		font-size: 16px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.composer-btn,
	.composer-send {
		transition: none;
	}
}
</style>
