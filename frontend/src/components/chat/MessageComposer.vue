<script setup>
import { ArrowRight, Mic, Paperclip, Send, Trash2, X } from "@lucide/vue";
import { computed, nextTick, ref } from "vue";
import { t } from "../../i18n.js";
import { useVoiceRecorder } from "../../composables/useVoiceRecorder.ts";
import { formatVoiceDuration } from "../../voice-message.js";
import UiTextarea from "../ui/Textarea.vue";
import UiAvatar from "../ui/Avatar.vue";
import PendingAttachmentPreview from "./PendingAttachmentPreview.vue";
import MessageReplyPreview from "./MessageReplyPreview.vue";

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
	mentionCandidates: {
		type: Array,
		default: () => [],
	},
	replyingTo: {
		type: Object,
		default: null,
	},
});

const emit = defineEmits([
	"update:modelValue",
	"send",
	"upload",
	"clear-attachment",
	"voice-recorded",
	"cancel-reply",
]);
const fileInput = ref(null);
const textarea = ref(null);
const mentionStart = ref(-1);
const mentionQuery = ref("");
const activeMentionIndex = ref(0);
const recordingError = ref("");
const { recording, elapsedMs, liveWaveform, start, finish, cancel } = useVoiceRecorder();
const filteredMentions = computed(() => {
	const query = mentionQuery.value.toLocaleLowerCase();
	return props.mentionCandidates
		.filter((member) => {
			if (!query) return true;
			return [member.username, member.displayName].some((value) =>
				String(value || "").toLocaleLowerCase().includes(query),
			);
		})
		.slice(0, 8);
});
const mentionMenuOpen = computed(
	() => mentionStart.value >= 0 && filteredMentions.value.length > 0,
);
const sendDisabled = computed(
	() =>
		props.disabled ||
		props.sending ||
		(!props.modelValue.trim() && !props.pendingAttachment),
);
const showVoiceButton = computed(
	() => !props.modelValue.trim() && !props.pendingAttachment && !props.sending,
);

function handleKeydown(event) {
	if (mentionMenuOpen.value) {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			const direction = event.key === "ArrowDown" ? 1 : -1;
			activeMentionIndex.value =
				(activeMentionIndex.value + direction + filteredMentions.value.length) %
				filteredMentions.value.length;
			return;
		}
		if (event.key === "Enter" || event.key === "Tab") {
			event.preventDefault();
			selectMention(filteredMentions.value[activeMentionIndex.value]);
			return;
		}
		if (event.key === "Escape") {
			event.preventDefault();
			closeMentionMenu();
			return;
		}
	}
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		if (sendDisabled.value) {
			return;
		}
		emit("send");
	}
	if (event.key === "Escape" && props.replyingTo) {
		event.preventDefault();
		emit("cancel-reply");
	}
}

function syncMentionQuery(event) {
	const input = event.target;
	const cursor = input.selectionStart;
	const match = input.value.slice(0, cursor).match(/(^|[\s([{])@([^\s@]*)$/u);
	if (!match || props.mentionCandidates.length === 0) {
		closeMentionMenu();
		return;
	}
	mentionQuery.value = match[2];
	mentionStart.value = cursor - match[2].length - 1;
	activeMentionIndex.value = 0;
}

function closeMentionMenu() {
	mentionStart.value = -1;
	mentionQuery.value = "";
	activeMentionIndex.value = 0;
}

function selectMention(member) {
	if (!member || mentionStart.value < 0) return;
	const input = textarea.value?.element;
	const cursor = input?.selectionStart ?? props.modelValue.length;
	const replacement = `@${member.username} `;
	const nextValue =
		props.modelValue.slice(0, mentionStart.value) +
		replacement +
		props.modelValue.slice(cursor);
	const nextCursor = mentionStart.value + replacement.length;
	emit("update:modelValue", nextValue);
	closeMentionMenu();
	nextTick(() => {
		textarea.value?.focus();
		textarea.value?.element?.setSelectionRange(nextCursor, nextCursor);
	});
}

function openPicker() {
	fileInput.value?.click();
}

async function startVoiceRecording() {
	recordingError.value = "";
	closeMentionMenu();
	try {
		await start();
	} catch (error) {
		recordingError.value =
			error?.message === "voice_recording_unsupported"
				? t("voice.unsupported")
				: t("voice.permissionDenied");
	}
}

async function cancelVoiceRecording() {
	await cancel();
}

async function sendVoiceRecording() {
	const result = await finish();
	if (!result) return;
	if (result.durationMs < 500) {
		recordingError.value = t("voice.tooShort");
		return;
	}
	emit("voice-recorded", result);
}

defineExpose({
	focus() {
		textarea.value?.focus();
	},
});
</script>

<template>
	<footer class="chat-composer">
		<div v-if="replyingTo" class="composer-reply">
			<MessageReplyPreview :reply="replyingTo" />
			<button
				type="button"
				class="composer-reply__cancel"
				:title="t('messages.cancelReply')"
				:aria-label="t('messages.cancelReply')"
				@click="emit('cancel-reply')"
			>
				<X :size="18" aria-hidden="true" />
			</button>
		</div>
		<div v-if="pendingAttachment" class="composer-attachment">
			<PendingAttachmentPreview
				:attachment="pendingAttachment"
				@clear="emit('clear-attachment')"
			/>
		</div>
			<div v-if="error || recordingError" class="composer-error">{{ error || recordingError }}</div>
		<div v-if="mentionMenuOpen" class="mention-menu" role="listbox">
			<button
				v-for="(member, index) in filteredMentions"
				:key="member.id"
				type="button"
				class="mention-option"
				:class="{ 'mention-option--active': index === activeMentionIndex }"
				role="option"
				:aria-selected="index === activeMentionIndex"
				@mousedown.prevent
				@click="selectMention(member)"
			>
				<UiAvatar
					:src="member.avatarUrl"
					:fallback="member.displayName || member.username"
					size="xs"
				/>
				<span class="mention-option__label">
					<strong>{{ member.displayName }}</strong>
					<small>@{{ member.username }}</small>
				</span>
			</button>
		</div>
			<div v-if="recording" class="composer-recording" role="status" :aria-label="t('voice.recording')">
				<button type="button" class="composer-btn composer-recording__cancel" :title="t('voice.cancel')" :aria-label="t('voice.cancel')" @click="cancelVoiceRecording">
					<Trash2 :size="20" aria-hidden="true" />
				</button>
				<span class="composer-recording__dot" aria-hidden="true"></span>
				<span class="composer-recording__time">{{ formatVoiceDuration(elapsedMs) }}</span>
				<div class="composer-recording__wave" aria-hidden="true">
					<span v-for="(sample, index) in liveWaveform" :key="index" :style="{ height: `${Math.max(18, sample)}%` }"></span>
				</div>
				<button type="button" class="composer-send composer-recording__send" :title="t('voice.send')" :aria-label="t('voice.send')" @click="sendVoiceRecording">
					<Send :size="20" aria-hidden="true" />
				</button>
			</div>
			<div v-else class="composer-row">
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
				ref="textarea"
				:model-value="modelValue"
				class="composer-input"
				auto-grow
				:max-height="120"
				rows="1"
				:disabled="disabled"
				:placeholder="t('chat.messagePlaceholder')"
				@update:model-value="emit('update:modelValue', $event)"
				@input="syncMentionQuery"
				@keydown="handleKeydown"
				/>
				<button
					v-if="showVoiceButton"
					type="button"
					class="composer-send composer-voice"
					:disabled="disabled"
					:title="t('voice.record')"
					:aria-label="t('voice.record')"
					@click="startVoiceRecording"
				>
					<Mic :size="21" aria-hidden="true" />
				</button>
				<button
					v-else
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

.composer-reply {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 32px;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
}

.composer-reply__cancel {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: #667781;
	cursor: pointer;
}

.composer-reply__cancel:hover,
.composer-reply__cancel:focus-visible {
	background: rgba(0, 0, 0, 0.08);
}

.composer-error {
	margin-bottom: 8px;
	color: #dc2626;
	font-size: 12px;
	text-align: center;
}

.mention-menu {
	position: absolute;
	right: 68px;
	bottom: calc(100% - 2px);
	left: 68px;
	z-index: 4;
	max-height: 280px;
	padding: 6px;
	overflow-y: auto;
	border: 1px solid #dfe5e2;
	border-radius: 8px;
	background: #ffffff;
	box-shadow: 0 10px 28px rgba(17, 27, 33, 0.14);
}

.mention-option {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-height: 44px;
	padding: 6px 10px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
	text-align: left;
}

.mention-option:hover,
.mention-option--active {
	background: #edf8f2;
}

.mention-option__label {
	display: grid;
	min-width: 0;
}

.mention-option__label strong,
.mention-option__label small {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mention-option__label strong {
	color: #111b21;
	font-size: 14px;
	font-weight: 600;
}

.mention-option__label small {
	color: #667781;
	font-size: 12px;
}

.composer-row {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.composer-recording {
	display: grid;
	grid-template-columns: 40px auto auto minmax(80px, 1fr) 40px;
	align-items: center;
	gap: 10px;
	min-height: 40px;
}

.composer-recording__cancel {
	color: #d93025;
}

.composer-recording__dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: #d93025;
	animation: recording-pulse 1.2s ease-in-out infinite;
}

.composer-recording__time {
	min-width: 38px;
	color: #111b21;
	font-size: 14px;
	font-variant-numeric: tabular-nums;
}

.composer-recording__wave {
	display: flex;
	align-items: center;
	gap: 2px;
	height: 28px;
	overflow: hidden;
}

.composer-recording__wave span {
	flex: 1 1 2px;
	min-width: 2px;
	max-width: 4px;
	border-radius: 2px;
	background: #25a36f;
}

.composer-voice,
.composer-recording__send {
	color: #008069;
}

@keyframes recording-pulse {
	50% { opacity: 0.35; }
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

	.mention-menu {
		right: max(56px, env(safe-area-inset-right));
		left: max(56px, env(safe-area-inset-left));
	}

		.composer-row {
			gap: 4px;
		}

		.composer-recording {
			grid-template-columns: 44px auto auto minmax(48px, 1fr) 44px;
			gap: 6px;
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
	.composer-send,
	.composer-recording__dot {
		transition: none;
		animation: none;
	}
}
</style>
