import { pickAttachment, publicFileUrl } from "../utils.js";

function toNullableNumber(value) {
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function mapMessage(row) {
	return {
		id: Number(row.id),
		content: row.content,
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

const MESSAGE_SELECT = `SELECT
  m.id, m.content, m.attachment_key, m.attachment_name, m.attachment_type,
  m.attachment_size, m.created_at,
  u.id AS sender_id, u.username AS sender_username,
  u.display_name AS sender_display_name, u.avatar_key AS sender_avatar_key
 FROM messages m JOIN users u ON u.id = m.sender_id`;

export async function listMessages(db, roomId, before = null, limit = 30) {
	const filters = ["m.channel_id = ?", "m.deleted_at IS NULL"];
	const binds = [Number(roomId)];
	if (before) {
		filters.push("m.id < ?");
		binds.push(Number(before));
	}
	const { results } = await db
		.prepare(`${MESSAGE_SELECT} WHERE ${filters.join(" AND ")} ORDER BY m.id DESC LIMIT ?`)
		.bind(...binds, Number(limit))
		.all();
	return results.map(mapMessage).reverse();
}

export async function getMessageById(db, messageId) {
	const { results } = await db
		.prepare(`${MESSAGE_SELECT} WHERE m.id = ? LIMIT 1`)
		.bind(Number(messageId))
		.all();
	return results[0] ? mapMessage(results[0]) : null;
}

export async function insertMessage(db, { channelId, senderId, content, attachment }) {
	const cleanAttachment = pickAttachment(attachment);
	const cleanContent = String(content || "").trim();
	if (!cleanContent && !cleanAttachment) {
		throw new Error("Message content cannot be empty");
	}
	const result = await db
		.prepare(
			`INSERT INTO messages (
			   channel_id, sender_id, content, attachment_key,
			   attachment_name, attachment_type, attachment_size
			 ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			Number(channelId), Number(senderId), cleanContent,
			cleanAttachment?.key || null, cleanAttachment?.name || null,
			cleanAttachment?.type || null, cleanAttachment?.size || null,
		)
		.run();
	return getMessageById(db, result.meta.last_row_id);
}
