import { nextTick, ref, watch } from "vue";
import api from "../api.js";
import { dispatchAuthInvalid } from "../auth-storage.js";
import { createRealtimeSession } from "../realtime-session.js";
import { connectRoomSocket } from "../ws.js";

const WS_CLOSE_UNAUTHORIZED = 4401;
const WS_CLOSE_FORBIDDEN = 4403;
const WS_REASON_UNAUTHORIZED = "session_invalid";
const WS_REASON_FORBIDDEN = "room_forbidden";

export function useChatRoom({
	activeRoom,
	session,
	error,
	onRoomActivity = () => {},
	onRoomMessageDeleted = () => {},
	onRoomAccessRevoked = () => {},
	confirmAction = (message) => window.confirm(message),
}) {
	const messages = ref([]);
	const loading = ref(false);
	const wsStatus = ref("closed");
	const composerText = ref("");
	const pendingAttachment = ref(null);
	const sending = ref(false);
	const deletingMessageId = ref(null);
	const messagesEl = ref(null);
	const fileInputEl = ref(null);

	function isOwnMessage(message) {
		return Number(message.sender.id) === Number(session.value?.userId);
	}

	function scrollToBottom() {
		const element = messagesEl.value;
		if (element) {
			requestAnimationFrame(() => {
				element.scrollTop = element.scrollHeight;
			});
		}
	}

	function applyActiveRoomActivity(message) {
		if (!activeRoom.value || !message) {
			return;
		}

		onRoomActivity({ room: activeRoom.value, message });

		if (!isOwnMessage(message)) {
			void api
				.markRoomRead(activeRoom.value.kind, activeRoom.value.id, message.id)
				.catch(() => {});
		}
	}

	function handleRoomAccessRevoked() {
		const room = activeRoom.value;
		if (!room) {
			return;
		}

		disconnectSocket();
		messages.value = [];
		onRoomAccessRevoked(room);
	}

	function handleSocketClose(event) {
		const code = Number(event?.code || 0);
		const reason = String(event?.reason || "");
		if (code === WS_CLOSE_UNAUTHORIZED || reason === WS_REASON_UNAUTHORIZED) {
			dispatchAuthInvalid("Your session is no longer valid. Please sign in again.");
			return;
		}
		if (code === WS_CLOSE_FORBIDDEN || reason === WS_REASON_FORBIDDEN) {
			handleRoomAccessRevoked();
		}
	}

	const roomSession = createRealtimeSession({
		openConnection(params, handlers) {
			return connectRoomSocket({
				kind: params.kind,
				roomId: params.roomId,
				...handlers,
			});
		},
		onStatus(event) {
			wsStatus.value = event.status === "reconnecting" ? "connecting" : event.status;
		},
		onClose: handleSocketClose,
		onMessage(payload) {
			if (payload.type === "message" && payload.message) {
				if (messages.value.some((item) => item.id === payload.message.id)) {
					return;
				}
				messages.value = [...messages.value, payload.message];
				applyActiveRoomActivity(payload.message);
				nextTick().then(scrollToBottom);
			}
			if (payload.type === "message_deleted" && payload.messageId) {
				const messageId = Number(payload.messageId);
				const nextMessages = messages.value.filter((item) => Number(item.id) !== messageId);
				if (nextMessages.length !== messages.value.length) {
					messages.value = nextMessages;
					onRoomMessageDeleted({ messageId });
				}
			}
			if (payload.type === "error") {
				error.value = payload.error;
			}
		},
	});

	async function loadMessages(before = null, append = false) {
		if (!activeRoom.value) {
			return;
		}

		loading.value = true;
		error.value = "";
		try {
			const payload = await api.getMessages(
				activeRoom.value.kind,
				activeRoom.value.id,
				before,
			);
			messages.value = append
				? [...payload.messages, ...messages.value]
				: payload.messages;
			await nextTick();
			if (!append) {
				scrollToBottom();
			}
		} catch (currentError) {
			error.value = currentError.message;
		} finally {
			loading.value = false;
		}
	}

	function connectSocket() {
		if (!activeRoom.value) {
			return;
		}
		const key = `${activeRoom.value.kind}:${activeRoom.value.id}`;
		roomSession.connect(key, {
			kind: activeRoom.value.kind,
			roomId: activeRoom.value.id,
		});
	}

	function disconnectSocket() {
		roomSession.disconnect();
	}

	async function sendMessage() {
		const key = activeRoom.value
			? `${activeRoom.value.kind}:${activeRoom.value.id}`
			: "";
		if (!roomSession.isOpenFor(key)) {
			error.value = "Real-time connection is not ready. Please try again in a moment.";
			return;
		}
		if (!composerText.value.trim() && !pendingAttachment.value) {
			return;
		}

		sending.value = true;
		error.value = "";
		try {
			roomSession.send(
				JSON.stringify({
					type: "send",
					content: composerText.value,
					attachment: pendingAttachment.value,
				}),
				key,
			);
			composerText.value = "";
			pendingAttachment.value = null;
		} catch (currentError) {
			error.value = currentError.message;
		} finally {
			sending.value = false;
		}
	}

	async function deleteMessage(message) {
		const messageId = Number(message?.id);
		if (!Number.isInteger(messageId) || messageId <= 0 || deletingMessageId.value) {
			return;
		}
		if (!confirmAction("确认删除这条消息吗？附件也会在没有其他引用时回收。")) {
			return;
		}

		deletingMessageId.value = messageId;
		error.value = "";
		try {
			await api.deleteMessage(messageId);
			messages.value = messages.value.filter((item) => Number(item.id) !== messageId);
			onRoomMessageDeleted({ messageId });
		} catch (currentError) {
			error.value = currentError.message;
		} finally {
			deletingMessageId.value = null;
		}
	}

	function handleComposerKeydown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	function openFilePicker() {
		fileInputEl.value?.click();
	}

	async function uploadAttachment(event) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			const payload = await api.uploadFile(file);
			pendingAttachment.value = payload.file;
		} catch (currentError) {
			error.value = currentError.message;
		} finally {
			event.target.value = "";
		}
	}

	function clearAttachment() {
		pendingAttachment.value = null;
	}

	async function loadOlder() {
		if (loading.value) {
			return;
		}
		const firstMessage = messages.value[0];
		if (firstMessage) {
			await loadMessages(firstMessage.id, true);
		}
	}

	watch(
		messages,
		() => {
			nextTick().then(scrollToBottom);
		},
		{ flush: "post" },
	);

	return {
		messages,
		loading,
		wsStatus,
		composerText,
		pendingAttachment,
		sending,
		deletingMessageId,
		messagesEl,
		fileInputEl,
		isOwnMessage,
		loadMessages,
		connectSocket,
		disconnectSocket,
		sendMessage,
		deleteMessage,
		handleComposerKeydown,
		openFilePicker,
		uploadAttachment,
		clearAttachment,
		loadOlder,
	};
}
