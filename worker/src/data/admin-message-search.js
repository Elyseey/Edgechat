import { decryptMessageContent } from "../encryption.js";

const SEARCH_SCAN_LIMIT = 5000;
const DECRYPT_BATCH_SIZE = 100;

function mapAdminMessage(row, content) {
	return {
		id: Number(row.id),
		content,
		attachmentName: row.attachment_name,
		createdAt: row.created_at,
		room: { id: Number(row.channel_id), name: row.channel_name, kind: row.channel_kind },
		sender: {
			id: Number(row.sender_id),
			username: row.sender_username,
			displayName: row.sender_display_name,
		},
	};
}

export async function searchAdminMessages(
	env,
	{ keyword = "", channelId = null, userId = null, kind = "", dmUserIds = null, limit = 50 } = {},
) {
	const filters = ["m.deleted_at IS NULL", "c.deleted_at IS NULL"];
	const binds = [];
	if (dmUserIds) {
		filters.push("c.kind = 'dm'", "c.dm_key = ?");
		binds.push(dmUserIds.slice().sort((a, b) => a - b).join(":"));
	} else {
		if (channelId !== null) { filters.push("c.id = ?"); binds.push(channelId); }
		if (userId !== null) { filters.push("u.id = ?"); binds.push(userId); }
		if (["public", "private", "dm"].includes(kind)) { filters.push("c.kind = ?"); binds.push(kind); }
	}

	const queryLimit = keyword ? SEARCH_SCAN_LIMIT + 1 : limit;
	const { results } = await env.DB
		.prepare(
			`SELECT m.id, m.content, m.attachment_name, m.created_at,
			 c.id AS channel_id, c.name AS channel_name, c.kind AS channel_kind,
			 u.id AS sender_id, u.display_name AS sender_display_name,
			 u.username AS sender_username
			 FROM messages m
			 JOIN channels c ON c.id = m.channel_id
			 JOIN users u ON u.id = m.sender_id
			 WHERE ${filters.join(" AND ")}
			 ORDER BY m.id DESC LIMIT ?`,
		)
		.bind(...binds, queryLimit)
		.all();

	const candidates = keyword ? results.slice(0, SEARCH_SCAN_LIMIT) : results;
	const normalizedKeyword = keyword.toLocaleLowerCase();
	const messages = [];
	let scannedCount = 0;
	for (let offset = 0; offset < candidates.length; offset += DECRYPT_BATCH_SIZE) {
		const rows = candidates.slice(offset, offset + DECRYPT_BATCH_SIZE);
		const decrypted = await Promise.all(rows.map(async (row) => ({
			row,
			content: await decryptMessageContent(env, row.content, {
				channelId: row.channel_id,
				senderId: row.sender_id,
			}),
		})));
		for (const { row, content } of decrypted) {
			scannedCount += 1;
			if (keyword && !content.toLocaleLowerCase().includes(normalizedKeyword)
				&& !String(row.attachment_name || "").toLocaleLowerCase().includes(normalizedKeyword)) continue;
			if (messages.length < limit) messages.push(mapAdminMessage(row, content));
		}
	}
	return {
		messages,
		scannedCount,
		searchTruncated: Boolean(keyword && results.length > SEARCH_SCAN_LIMIT),
	};
}
