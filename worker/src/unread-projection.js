import {
	countUnreadMentions,
	countUnreadMessages,
	listRoomMemberIds,
} from "./data/unread.js";
import { notifyUserInbox } from "./do-bridge.js";

function logProjectionFailure(message, data) {
	console.warn(JSON.stringify({ message, ...data }));
}

export function createUnreadProjection({
	countUnread = countUnreadMessages,
	countMentions = countUnreadMentions,
	listMemberIds = listRoomMemberIds,
	notifyInbox = notifyUserInbox,
	logFailure = logProjectionFailure,
} = {}) {
	async function notifyRecipient(env, room, message, userId) {
		try {
			const mentionsMe = (message.mentionUserIds || []).includes(Number(userId));
			const [unreadCount, mentionUnreadCount] = await Promise.all([
				countUnread(env.DB, { channelId: room.id, userId }),
				mentionsMe
					? countMentions(env.DB, { channelId: room.id, userId })
					: Promise.resolve(undefined),
			]);
				await notifyInbox(env, userId, {
					protocolVersion: 1,
					type: "room_message",
				room: {
					id: Number(room.id),
					kind: room.kind,
					name: room.name,
				},
					messageId: Number(message.id),
					createdAt: message.createdAt,
					unreadCount,
					...(mentionUnreadCount === undefined ? {} : { mentionUnreadCount }),
					mentionsMe,
					contentPreview: String(message.content || "").slice(0, 160),
					sender: message.sender,
				});
		} catch (error) {
			logFailure("unread recipient projection failed", {
				roomId: Number(room.id),
				userId: Number(userId),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return async function projectUnreadMessage(env, { room, senderId, message }) {
		try {
			const memberIds = await listMemberIds(env.DB, room.id);
			const recipientIds = memberIds.filter(
				(userId) => Number(userId) !== Number(senderId),
			);
			await Promise.all(
				recipientIds.map((userId) => notifyRecipient(env, room, message, userId)),
			);
		} catch (error) {
			logFailure("unread projection failed", {
				roomId: Number(room.id),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};
}

export const projectUnreadMessage = createUnreadProjection();
