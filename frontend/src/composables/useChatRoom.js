import { nextTick, ref, watch } from "vue";
import api from "../api.js";
import { dispatchAuthInvalid } from "../auth-storage.js";
import { createRealtimeSession } from "../realtime-session.js";
import { connectRoomSocket } from "../ws.js";
import { t } from "../i18n.js";
import { localizeErrorMessage } from "../localized-error.js";

const WS_CLOSE_UNAUTHORIZED = 4401;
const WS_CLOSE_FORBIDDEN = 4403;
const WS_REASON_UNAUTHORIZED = "session_invalid";
const WS_REASON_FORBIDDEN = "room_forbidden";

export function useChatRoom({
	activeRoom,
	session,
	error,
	onRoomActivity = () => {},
	onRoomAccessRevoked = () => {},
	roomApi = api,
	openRoomConnection = connectRoomSocket,
}) {
	const messages = ref([]);
	const pinnedMessage = ref(null);
	const highlightedMessageId = ref(null);
	const loading = ref(false);
	const wsStatus = ref("closed");
	const composerText = ref("");
	const pendingAttachment = ref(null);
	const sending = ref(false);
	const messagesEl = ref(null);
	let messageLoadGeneration = 0;
	let highlightTimer = null;

	function roomKey(room = activeRoom.value) {
		return room?.kind && room?.id ? `${room.kind}:${room.id}` : "";
	}

	function isOwnMessage(message) {
		return (
			message.sender.kind !== "external" &&
			Number(message.sender.id) === Number(session.value?.userId)
		);
	}

	function scrollToBottom() {
		const element = messagesEl.value;
		if (element) {
			requestAnimationFrame(() => {
				element.scrollTop = element.scrollHeight;
			});
		}
	}

	function mergeMessages(...collections) {
		const byId = new Map();
		for (const collection of collections) {
			for (const message of collection || []) {
				byId.set(Number(message.id), message);
			}
		}
		return [...byId.values()].sort((left, right) => Number(left.id) - Number(right.id));
	}

	function highlightMessage(messageId) {
		const numericMessageId = Number(messageId);
		const element = messagesEl.value?.querySelector(
			`[data-message-id="${numericMessageId}"]`,
		);
		if (!element) {
			return false;
		}
		element.scrollIntoView({ behavior: "smooth", block: "center" });
		highlightedMessageId.value = numericMessageId;
		if (highlightTimer !== null) {
			globalThis.clearTimeout(highlightTimer);
		}
		highlightTimer = globalThis.setTimeout(() => {
			highlightedMessageId.value = null;
			highlightTimer = null;
		}, 1400);
		return true;
	}

	function clearMessageHighlight() {
		highlightedMessageId.value = null;
		if (highlightTimer !== null) {
			globalThis.clearTimeout(highlightTimer);
			highlightTimer = null;
		}
	}

	function applyActiveRoomActivity(message) {
		if (!activeRoom.value || !message) {
			return;
		}

		onRoomActivity({ room: activeRoom.value, message });

		if (!isOwnMessage(message)) {
			void roomApi
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
		pinnedMessage.value = null;
		clearMessageHighlight();
		onRoomAccessRevoked(room);
	}

	function handleSocketClose(event) {
		const code = Number(event?.code || 0);
		const reason = String(event?.reason || "");
		if (code === WS_CLOSE_UNAUTHORIZED || reason === WS_REASON_UNAUTHORIZED) {
			dispatchAuthInvalid(t('chat.sessionInvalid'));
			return;
		}
		if (code === WS_CLOSE_FORBIDDEN || reason === WS_REASON_FORBIDDEN) {
			handleRoomAccessRevoked();
		}
	}

	const roomSession = createRealtimeSession({
		openConnection(params, handlers) {
			return openRoomConnection({
				kind: params.kind,
				roomId: params.roomId,
				...handlers,
			});
		},
		onStatus(event) {
			wsStatus.value = event.status === "reconnecting" ? "connecting" : event.status;
		},
		onClose: handleSocketClose,
		onMessage(payload, connection) {
			if (connection?.key !== roomKey()) {
				return;
			}
			if (payload.type === "message" && payload.message) {
				if (messages.value.some((item) => item.id === payload.message.id)) {
					return;
				}
				messages.value = [...messages.value, payload.message];
				applyActiveRoomActivity(payload.message);
				nextTick().then(scrollToBottom);
			}
			if (payload.type === "message_deleted") {
				const messageId = Number(payload.messageId);
				messages.value = messages.value.filter(
					(message) => Number(message.id) !== messageId,
				);
				if (Number(pinnedMessage.value?.id) === messageId) {
					pinnedMessage.value = null;
				}
			}
			if (payload.type === "message_pinned" && payload.message) {
				pinnedMessage.value = payload.message;
			}
			if (
				payload.type === "message_unpinned" &&
				Number(pinnedMessage.value?.id) === Number(payload.messageId)
			) {
				pinnedMessage.value = null;
			}
			if (payload.type === "error") {
				error.value = localizeErrorMessage(payload.error);
			}
		},
	});

	async function loadMessages(before = null, append = false) {
		const room = activeRoom.value;
		const key = roomKey(room);
		if (!key) {
			return false;
		}

		const generation = ++messageLoadGeneration;
		loading.value = true;
		error.value = "";
		try {
			const payload = await roomApi.getMessages(room.kind, room.id, before);
			if (generation !== messageLoadGeneration || roomKey() !== key) {
				return false;
			}
			messages.value = append
				? mergeMessages(payload.messages, messages.value)
				: payload.messages;
			pinnedMessage.value = payload.pinnedMessage || null;
			await nextTick();
			if (!append) {
				scrollToBottom();
			}
			return true;
		} catch (currentError) {
			if (generation === messageLoadGeneration && roomKey() === key) {
				error.value = currentError.message;
			}
			return false;
		} finally {
			if (generation === messageLoadGeneration) {
				loading.value = false;
			}
		}
	}

	async function activateRoom() {
		messageLoadGeneration += 1;
		messages.value = [];
		pinnedMessage.value = null;
		clearMessageHighlight();
		loading.value = false;
		connectSocket();
		return loadMessages();
	}

	function deactivateRoom() {
		messageLoadGeneration += 1;
		messages.value = [];
		pinnedMessage.value = null;
		clearMessageHighlight();
		loading.value = false;
		disconnectSocket();
	}

	function connectSocket() {
		if (!activeRoom.value) {
			return;
		}
		const key = roomKey();
		roomSession.connect(key, {
			kind: activeRoom.value.kind,
			roomId: activeRoom.value.id,
		});
	}

	function disconnectSocket() {
		roomSession.disconnect();
	}

	async function sendMessage(mentionUserIds = []) {
		const key = activeRoom.value
			? `${activeRoom.value.kind}:${activeRoom.value.id}`
			: "";
		if (!roomSession.isOpenFor(key)) {
			error.value = t('chat.realtimeNotReady');
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
					mentionUserIds,
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

	function deleteMessage(messageId) {
		const key = activeRoom.value
			? `${activeRoom.value.kind}:${activeRoom.value.id}`
			: "";
		if (!roomSession.isOpenFor(key)) {
			error.value = t('chat.realtimeNotReady');
			return false;
		}

		error.value = "";
		return roomSession.send(
			JSON.stringify({ type: "delete_message", messageId: Number(messageId) }),
			key,
		);
	}

	function pinMessage(messageId) {
		const key = roomKey();
		if (!roomSession.isOpenFor(key)) {
			error.value = t('chat.realtimeNotReady');
			return false;
		}
		error.value = "";
		return roomSession.send(
			JSON.stringify({ type: "pin_message", messageId: Number(messageId) }),
			key,
		);
	}

	function unpinMessage(messageId) {
		const key = roomKey();
		if (!roomSession.isOpenFor(key)) {
			error.value = t('chat.realtimeNotReady');
			return false;
		}
		error.value = "";
		return roomSession.send(
			JSON.stringify({ type: "unpin_message", messageId: Number(messageId) }),
			key,
		);
	}

	async function revealPinnedMessage() {
		const targetId = Number(pinnedMessage.value?.id);
		const key = roomKey();
		if (!targetId || !key) {
			return false;
		}
		await nextTick();
		if (highlightMessage(targetId)) {
			return true;
		}

		try {
			const room = activeRoom.value;
			const payload = await roomApi.getMessages(room.kind, room.id, targetId + 1);
			if (roomKey() !== key || Number(pinnedMessage.value?.id) !== targetId) {
				return false;
			}
			pinnedMessage.value = payload.pinnedMessage || null;
			if (Number(pinnedMessage.value?.id) !== targetId) {
				return false;
			}
			messages.value = mergeMessages(payload.messages, messages.value);
			await nextTick();
			return highlightMessage(targetId);
		} catch (currentError) {
			error.value = currentError.message;
			return false;
		}
	}

	async function uploadAttachment(event) {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		try {
			const payload = await roomApi.uploadFile(file);
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
		(current, previous) => {
			const receivedNewLastMessage =
				current.length > previous.length &&
				current.at(-1)?.id !== previous.at(-1)?.id;
			if (receivedNewLastMessage) {
				nextTick().then(scrollToBottom);
			}
		},
		{ flush: "post" },
	);

	return {
		messages,
		pinnedMessage,
		highlightedMessageId,
		loading,
		wsStatus,
		composerText,
		pendingAttachment,
		sending,
		messagesEl,
		isOwnMessage,
		loadMessages,
		activateRoom,
		deactivateRoom,
		connectSocket,
		disconnectSocket,
		sendMessage,
		deleteMessage,
		pinMessage,
		unpinMessage,
		revealPinnedMessage,
		uploadAttachment,
		clearAttachment,
		loadOlder,
	};
}
