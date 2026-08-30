import { ref, type Ref } from "vue";

type ContextMessage = {
	id: number | string;
};

type MessageMenuState = {
	message: ContextMessage | null;
	x: number;
	y: number;
};

type LongPressOrigin = {
	pointerId: number;
	x: number;
	y: number;
};

type MessageContextMenuOptions = {
	canModerateMessages: Readonly<Ref<boolean>>;
};

const LONG_PRESS_DELAY_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

export function useMessageContextMenu({
	canModerateMessages,
}: MessageContextMenuOptions) {
	const messageMenu = ref<MessageMenuState>({
		message: null,
		x: 0,
		y: 0,
	});
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressOrigin: LongPressOrigin | null = null;

	function closeMessageMenu() {
		messageMenu.value = { message: null, x: 0, y: 0 };
	}

	function openMessageMenuAt(message: ContextMessage, x: number, y: number) {
		if (!canModerateMessages.value) {
			return;
		}
		messageMenu.value = { message, x, y };
	}

	function cancelMessageLongPress() {
		if (longPressTimer !== null) {
			globalThis.clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressOrigin = null;
	}

	function openMessageContextMenu(event: MouseEvent, message: ContextMessage) {
		if (!canModerateMessages.value) {
			return;
		}
		event.preventDefault();
		cancelMessageLongPress();
		openMessageMenuAt(message, event.clientX, event.clientY);
	}

	function startMessageLongPress(event: PointerEvent, message: ContextMessage) {
		cancelMessageLongPress();
		if (!canModerateMessages.value || event.pointerType === "mouse") {
			return;
		}

		const origin = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
		};
		longPressOrigin = origin;
		longPressTimer = globalThis.setTimeout(() => {
			openMessageMenuAt(message, origin.x, origin.y);
			longPressTimer = null;
		}, LONG_PRESS_DELAY_MS);
	}

	function trackMessageLongPress(event: PointerEvent) {
		if (!longPressOrigin || event.pointerId !== longPressOrigin.pointerId) {
			return;
		}
		if (
			Math.abs(event.clientX - longPressOrigin.x) >
				LONG_PRESS_MOVE_TOLERANCE_PX ||
			Math.abs(event.clientY - longPressOrigin.y) >
				LONG_PRESS_MOVE_TOLERANCE_PX
		) {
			cancelMessageLongPress();
		}
	}

	return {
		messageMenu,
		closeMessageMenu,
		cancelMessageLongPress,
		openMessageContextMenu,
		startMessageLongPress,
		trackMessageLongPress,
	};
}
