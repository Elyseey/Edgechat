import api from "../api.js";
import { createRealtimeSession } from "../realtime-session.js";
import { connectInboxSocket } from "../ws.js";

export function useUnreadInbox({
  activeRoom,
  applyConversationActivity,
  markConversationRead
}) {
  function isActiveRoom(room) {
    return (
      activeRoom.value &&
      activeRoom.value.kind === room.kind &&
      Number(activeRoom.value.id) === Number(room.id)
    );
  }

	const inboxSession = createRealtimeSession({
		openConnection(_params, handlers) {
			return connectInboxSocket(handlers);
		},
		onMessage(payload) {
        if (payload.type !== 'room_message' || !payload.room) {
          return;
        }

		if (isActiveRoom(payload.room)) {
			markConversationRead(payload.room.kind, payload.room.id);
			void api
				.markRoomRead(payload.room.kind, payload.room.id, payload.messageId)
				.catch(() => {});
			return;
		}

        applyConversationActivity({
          kind: payload.room.kind,
          roomId: payload.room.id,
          lastMessageAt: payload.createdAt,
          unreadCount: payload.unreadCount
        });
		},
	});

	function connectUnreadInbox() {
		inboxSession.connect("inbox");
	}

  return {
    connectUnreadInbox,
		disconnectUnreadInbox: inboxSession.disconnect,
  };
}
