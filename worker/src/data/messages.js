import { decryptMessageContent, encryptMessageContent } from "../encryption.js";
import { pickAttachment, publicFileUrl } from "../utils.js";
import { fileBelongsToUser } from "./uploaded-files.js";

function toNullableNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function mapMessage(row, content = row.content) {
	return {
		id: Number(row.id),
		content,
		createdAt: row.created_at,
		sender: {
			id: Number(row.sender_id),
			username: row.sender_username,
			displayName: row.sender_display_name,
			avatarUrl: row.sender_avatar_key ? publicFileUrl(row.sender_avatar_key) : "",
		},
		attachment: row.attachment_key
			? {
					key: row.attachment_key,
					name: row.attachment_name,
					type: row.attachment_type,
					size: toNullableNumber(row.attachment_size) || 0,
					url: publicFileUrl(row.attachment_key),
				}
			: null,
	};
}

async function mapDecryptedMessage(env, row) {
	const content = await decryptMessageContent(env, row.content, {
		channelId: row.channel_id,
		senderId: row.sender_id,
	});
	return mapMessage(row, content);
}
const MESSAGE_SELECT = `SELECT
  m.id, m.channel_id, m.content, m.attachment_key, m.attachment_name, m.attachment_type,
  m.attachment_size, m.created_at,
  u.id AS sender_id, u.username AS sender_username,
  u.display_name AS sender_display_name, u.avatar_key AS sender_avatar_key
 FROM messages m JOIN users u ON u.id = m.sender_id`;

export async function listMessages(env, roomId, before = null, limit = 30) {
	const filters = ["m.channel_id = ?", "m.deleted_at IS NULL"];
	const binds = [Number(roomId)];
	if (before) {
		filters.push("m.id < ?");
		binds.push(Number(before));
	}
	const { results } = await env.DB
		.prepare(`${MESSAGE_SELECT} WHERE ${filters.join(" AND ")} ORDER BY m.id DESC LIMIT ?`)
		.bind(...binds, Number(limit))
		.all();
	return (await Promise.all(results.map((row) => mapDecryptedMessage(env, row)))).reverse();
}

export async function getMessageById(env, messageId) {
	const { results } = await env.DB
		.prepare(`${MESSAGE_SELECT} WHERE m.id = ? LIMIT 1`)
		.bind(Number(messageId))
		.all();
	return results[0] ? mapDecryptedMessage(env, results[0]) : null;
}

export async function insertMessage(env, { channelId, senderId, content, attachment }) {
	const hasAttachment = attachment !== undefined && attachment !== null;
	const cleanAttachment = pickAttachment(attachment, { ownerUserId: senderId });
	const cleanContent = String(content || "").trim();
	if (hasAttachment && !cleanAttachment) throw new Error("Invalid attachment");
	if (cleanAttachment && !(await fileBelongsToUser(env.DB, cleanAttachment.key, senderId))) {
		throw new Error("Attachment is not available");
	}
	if (!cleanContent && !cleanAttachment) throw new Error("Message content cannot be empty");
	const storedContent = await encryptMessageContent(env, cleanContent, { channelId, senderId });
	const result = await env.DB
		.prepare(
			`INSERT INTO messages (
			   channel_id, sender_id, content, attachment_key,
			   attachment_name, attachment_type, attachment_size
			 ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			Number(channelId), Number(senderId), storedContent,
			cleanAttachment?.key || null, cleanAttachment?.name || null,
			cleanAttachment?.type || null, cleanAttachment?.size || null,
		)
		.run();
	return getMessageById(env, result.meta.last_row_id);
}
