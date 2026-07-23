import { publicFileUrl } from "../utils.js";

function mapUserSummary(row) {
	return {
		id: Number(row.id),
		username: row.username,
		displayName: row.display_name,
		avatarUrl: row.avatar_key ? publicFileUrl(row.avatar_key) : "",
	};
}

function mapAdminUser(row) {
	return {
		...mapUserSummary(row),
		isDisabled: Boolean(Number(row.is_disabled)),
		createdAt: row.created_at,
	};
}

export async function getUserByUsername(db, username) {
	const { results } = await db
		.prepare(
			`SELECT *
			 FROM users
			 WHERE username = ?
			   AND deleted_at IS NULL
			 LIMIT 1`,
		)
		.bind(username)
		.all();
	return results[0] || null;
}

export async function isUserActiveById(db, userId) {
	const { results } = await db
		.prepare(
			`SELECT id
			 FROM users
			 WHERE id = ?
			   AND deleted_at IS NULL
			   AND is_disabled = 0
			 LIMIT 1`,
		)
		.bind(Number(userId))
		.all();
	return Boolean(results[0]);
}

export async function listActiveUsers(db, excludeUserId) {
	const { results } = await db
		.prepare(
			`SELECT id, username, display_name, avatar_key
			 FROM users
			 WHERE deleted_at IS NULL
			   AND is_disabled = 0
			   AND id != ?
			 ORDER BY display_name ASC`,
		)
		.bind(Number(excludeUserId))
		.all();
	return results.map(mapUserSummary);
}

export async function listAdminUsers(db) {
	const { results } = await db
		.prepare(
			`SELECT id, username, display_name, avatar_key, is_disabled, created_at
			 FROM users
			 WHERE deleted_at IS NULL
			 ORDER BY created_at DESC`,
		)
		.all();
	return results.map(mapAdminUser);
}
