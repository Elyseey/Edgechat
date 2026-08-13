import { ref } from "vue";

export function useChatViewport({ activeRoom }) {
	const isMobileViewport = ref(false);
	const mobileView = ref("list");
	let viewportInitialized = false;

	function syncViewportState() {
		const nextIsMobile = window.innerWidth <= 960;
		if (viewportInitialized && nextIsMobile === isMobileViewport.value) {
			return;
		}

		viewportInitialized = true;
		isMobileViewport.value = nextIsMobile;
		mobileView.value = nextIsMobile && !activeRoom.value ? "list" : "chat";
	}

	function syncViewportHeight() {
		const viewportHeight = window.visualViewport?.height || window.innerHeight;
		document.documentElement.style.setProperty(
			"--chat-viewport-height",
			`${Math.round(viewportHeight)}px`,
		);
	}

	function startViewportSync() {
		syncViewportState();
		syncViewportHeight();
		window.addEventListener("resize", syncViewportState);
		window.addEventListener("resize", syncViewportHeight);
		window.visualViewport?.addEventListener("resize", syncViewportHeight);
	}

	function stopViewportSync() {
		window.removeEventListener("resize", syncViewportState);
		window.removeEventListener("resize", syncViewportHeight);
		window.visualViewport?.removeEventListener("resize", syncViewportHeight);
		document.documentElement.style.removeProperty("--chat-viewport-height");
	}

	function openConversationView() {
		if (isMobileViewport.value) {
			mobileView.value = "chat";
		}
	}

	function returnToConversationList() {
		if (isMobileViewport.value) {
			mobileView.value = "list";
		}
	}

	return {
		isMobileViewport,
		mobileView,
		startViewportSync,
		stopViewportSync,
		openConversationView,
		returnToConversationList,
	};
}
