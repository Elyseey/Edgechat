<script setup>
import { LoaderCircle, Mic, Paperclip, Send, Trash2, X } from "@lucide/vue";
import { computed, nextTick, ref, watch } from "vue";
import { isCapacitorAndroid, openNativeAppSettings, pickNativeFile } from "../../capacitor-platform.ts";
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
const pickerError = ref("");
const showPermissionSettings = ref(false);
const finishingRecording = ref(false);
const composing = ref(false);
const { recording, starting, elapsedMs, liveWaveform, start, finish, cancel } = useVoiceRecorder();
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
		starting.value ||
		(!props.modelValue.trim() && !props.pendingAttachment),
);
// 房间切换或连接失效时不允许继续采集上一段语音。
watch(() => props.disabled, (disabled) => {
	if (disabled) void cancel();
});

function handleKeydown(event) {
	// 输入法的 Enter 用来确认候选，不应触发发送或选择 @成员。
	if (composing.value || event.isComposing || event.keyCode === 229) return;
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

async function openPicker() {
	pickerError.value = "";
	if (!isCapacitorAndroid) {
		fileInput.value?.click();
		return;
	}

	try {
		const file = await pickNativeFile();
		if (file) emit("upload", file);
	} catch {
		pickerError.value = t("chat.fileSelectionFailed");
	}
}

function handleFileSelected(event) {
	const file = event.target.files?.[0];
	if (file) emit("upload", file);
	event.target.value = "";
}

async function startVoiceRecording() {
	recordingError.value = "";
	showPermissionSettings.value = false;
	closeMentionMenu();
	try {
		await start();
	} catch (error) {
		const permissionDenied =
			error?.message === "native_microphone_permission_denied" ||
			error?.name === "NotAllowedError" ||
			error?.name === "SecurityError";
		showPermissionSettings.value = isCapacitorAndroid && permissionDenied;
		recordingError.value = t(
			error?.message === "voice_recording_unsupported"
				? "voice.unsupported"
				: permissionDenied
					? isCapacitorAndroid ? "voice.nativePermissionDenied" : "voice.permissionDenied"
					: error?.name === "NotFoundError"
						? "voice.noMicrophone"
						: "voice.startFailed",
		);
	}
}

async function openMicrophoneSettings() {
	try {
		await openNativeAppSettings();
	} catch {
		recordingError.value = t("voice.settingsFailed");
	}
}

async function cancelVoiceRecording() {
	await cancel();
}

async function sendVoiceRecording() {
	if (finishingRecording.value || props.disabled || props.sending) return;
	finishingRecording.value = true;
	try {
		const result = await finish();
		if (!result) return;
		if (result.durationMs < 500) {
			recordingError.value = t("voice.tooShort");
			return;
		}
		emit("voice-recorded", result);
	} catch {
		await cancel();
		recordingError.value = t("voice.startFailed");
	} finally {
		finishingRecording.value = false;
	}
}

defineExpose({
	focus() {
		textarea.value?.focus();
	},
});
</script>

<template>
	<footer class="message-composer">
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
			<div v-if="error || recordingError || pickerError" class="composer-error" role="alert">
				<span>{{ error || recordingError || pickerError }}</span>
				<button v-if="showPermissionSettings" type="button" class="composer-settings" @click="openMicrophoneSettings">{{ t('voice.openSettings') }}</button>
			</div>
			<div v-if="starting" class="composer-permission" role="status">
				<span>{{ t('voice.requestingPermission') }}</span>
				<button type="button" class="composer-btn" :aria-label="t('voice.cancel')" @click="cancelVoiceRecording">
					<X :size="20" aria-hidden="true" />
				</button>
			</div>
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
				<div v-if="recording" class="composer-recording" :aria-label="t('voice.recording')">
					<button type="button" class="composer-btn composer-recording__cancel" :disabled="finishingRecording" :title="t('voice.cancel')" :aria-label="t('voice.cancel')" @click="cancelVoiceRecording">
					<Trash2 :size="20" aria-hidden="true" />
				</button>
					<div class="composer-recording__status">
						<span class="composer-recording__dot" aria-hidden="true"></span>
						<span>{{ t('voice.recordingShort') }}</span>
						<span class="composer-recording__time">{{ formatVoiceDuration(elapsedMs) }}</span>
					</div>
				<div class="composer-recording__wave" aria-hidden="true">
					<span v-for="(sample, index) in liveWaveform" :key="index" :style="{ height: `${Math.max(18, sample)}%` }"></span>
				</div>
					<button type="button" class="composer-send composer-recording__send" :disabled="disabled || sending || finishingRecording" :title="t('voice.send')" :aria-label="t('voice.send')" @click="sendVoiceRecording">
						<Send :size="20" aria-hidden="true" />
						<span>{{ t('chat.send') }}</span>
				</button>
			</div>
			<div v-else class="composer-row">
			<input
				ref="fileInput"
				type="file"
				class="composer-file-input"
				@change="handleFileSelected"
			/>
				<button
					type="button"
				class="composer-btn"
				:disabled="disabled || starting"
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
				:disabled="disabled || starting"
				:placeholder="t('chat.messagePlaceholder')"
				:aria-label="t('chat.messagePlaceholder')"
				@update:model-value="emit('update:modelValue', $event)"
				@input="syncMentionQuery"
				@keydown="handleKeydown"
				@compositionstart="composing = true"
				@compositionend="composing = false"
				/>
				<button
					type="button"
					class="composer-btn composer-voice"
					:disabled="disabled || sending || starting"
					:aria-busy="starting"
					:title="t('voice.record')"
					:aria-label="t('voice.record')"
					@click="startVoiceRecording"
				>
					<LoaderCircle v-if="starting" :size="21" class="composer-spinner" aria-hidden="true" />
					<Mic v-else :size="21" aria-hidden="true" />
				</button>
				<button
					type="button"
				class="composer-send"
				:disabled="sendDisabled"
				:title="t('chat.sendMessage')"
				:aria-label="t('chat.sendMessage')"
				@click="emit('send')"
			>
				<LoaderCircle v-if="sending" :size="20" class="composer-spinner" aria-hidden="true" />
				<Send v-else :size="20" aria-hidden="true" />
				<span>{{ t('chat.send') }}</span>
			</button>
		</div>
	</footer>
</template>

<style scoped>
.message-composer {
	position: relative;
	z-index: 2;
	flex-shrink: 0;
	min-width: 0;
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

.composer-settings {
	display: block;
	min-height: 44px;
	margin: 4px auto 0;
	padding: 8px 12px;
	border: 1px solid currentColor;
	border-radius: 8px;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.composer-permission {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-bottom: 8px;
	color: #54656f;
	font-size: 14px;
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
	align-items: flex-end;
	gap: 8px;
	min-width: 0;
}

.composer-recording {
	display: grid;
	grid-template-columns: 44px minmax(0, 1fr) auto;
	align-items: center;
	gap: 4px 8px;
	min-height: 56px;
}

.composer-recording__cancel {
	grid-row: 1 / 3;
	color: #d93025;
}

.composer-recording__status {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	color: #54656f;
	font-size: 12px;
}

.composer-recording__send {
	grid-column: 3;
	grid-row: 1 / 3;
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
	grid-column: 2;
	display: flex;
	align-items: center;
	gap: 2px;
	min-width: 0;
	height: 22px;
	overflow: hidden;
}

.composer-recording__wave span {
	flex: 1 1 2px;
	min-width: 2px;
	max-width: 4px;
	border-radius: 2px;
	background: #25a36f;
}

.composer-voice {
	color: #008069;
}

@keyframes recording-pulse {
	50% { opacity: 0.35; }
}

.composer-spinner {
	animation: composer-spin 1s linear infinite;
}

@keyframes composer-spin {
	to { transform: rotate(360deg); }
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
	width: 44px;
	height: 44px;
	padding: 0;
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
	width: auto;
	min-width: 72px;
	gap: 6px;
	padding: 0 12px;
	border-radius: 12px;
	background: #008069;
	color: #ffffff;
	font: inherit;
	font-size: 14px;
	font-weight: 600;
	white-space: nowrap;
	transition: background 150ms;
}

.composer-send:hover:not(:disabled) {
	background: #006b58;
}

.composer-btn:active:not(:disabled) {
	background: rgba(0, 0, 0, 0.08);
}

.composer-send:active:not(:disabled) {
	background: #005846;
}

.composer-btn:focus-visible,
.composer-send:focus-visible,
.composer-settings:focus-visible {
	outline: 2px solid #008069;
	outline-offset: 2px;
}

.composer-btn:disabled {
	cursor: not-allowed;
	opacity: 0.4;
}

.composer-send:disabled {
	cursor: not-allowed;
	background: #d9e2de;
	color: #60716a;
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
	.message-composer {
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
			gap: 4px 8px;
		}

	.composer-btn {
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
		.composer-spinner,
	.composer-recording__dot {
		transition: none;
		animation: none;
	}
}
</style>
