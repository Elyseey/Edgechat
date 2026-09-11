import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import initSqlJs from "sql.js";

import { ORPHAN_UPLOAD_QUERY, runScheduledGc } from "../worker/src/gc.js";
import { createD1Adapter } from "./support/d1.js";

const SQL = await initSqlJs();
const schemaSql = readFileSync(new URL("../worker/schema.sql", import.meta.url), "utf8");

function createDatabase() {
	const database = new SQL.Database();
	database.exec(schemaSql);
	return database;
}

function insertUser(database, username, { deleted = false } = {}) {
	database.run(
		`INSERT INTO users (
		   username, display_name, password_hash, password_salt, deleted_at
		 ) VALUES (?, ?, 'hash', 'salt', ${deleted ? "datetime('now', '-61 day')" : "NULL"})`,
		[username, username],
	);
	return Number(database.exec("SELECT last_insert_rowid()")[0].values[0][0]);
}

function scalar(database, sql) {
	return Number(database.exec(sql)[0]?.values?.[0]?.[0] || 0);
}

test("孤儿扫描使用匹配索引，失败对象进入退避且不阻塞后续批次", async () => {
	const database = createDatabase();
	const userId = insertUser(database, "gc-owner");
	const plan = database.prepare(`EXPLAIN QUERY PLAN ${ORPHAN_UPLOAD_QUERY}`);
	plan.bind(["-1 day", "", "", "", 500]);
	const details = [];
	while (plan.step()) {
		details.push(String(plan.getAsObject().detail || ""));
	}
	plan.free();
	assert.equal(
		details.some((detail) => /SCAN (uploaded_files|messages|users|channels)/.test(detail)),
		false,
		details.join("\n"),
	);

	database.run(
		`INSERT INTO uploaded_files (object_key, owner_user_id, created_at) VALUES
		 (?, ?, datetime('now', '-4 day')),
		 (?, ?, datetime('now', '-3 day')),
		 (?, ?, datetime('now', '-2 day'))`,
		["1/a", userId, "1/b", userId, "1/c", userId],
	);
	const attempts = [];
	await runScheduledGc({
		DB: createD1Adapter(database),
		FILES: {
			async delete(key) {
				attempts.push(key);
				throw new Error("simulated R2 outage");
			},
		},
		GC_BATCH_SIZE: 2,
		GC_MAX_BATCHES_PER_RUN: 3,
		ORPHAN_UPLOAD_RETENTION_DAYS: 1,
	});

	assert.deepEqual(attempts, ["1/a", "1/b", "1/c"]);
	assert.equal(scalar(database, "SELECT COUNT(*) FROM pending_r2_delete"), 3);
	assert.equal(
		scalar(
			database,
			"SELECT COUNT(*) FROM pending_r2_delete WHERE retry_count = 1 AND next_retry_at > CURRENT_TIMESTAMP",
		),
		3,
	);
});

test("待删除占位原子阻止消息附件与头像重新引用", () => {
	const database = createDatabase();
	const userId = insertUser(database, "claim-owner");
	const channelId = scalar(database, "SELECT id FROM channels WHERE name = 'general'");
	database.run(
		"INSERT INTO uploaded_files (object_key, owner_user_id) VALUES ('1/race', ?)",
		[userId],
	);
	assert.equal(
		scalar(
			database,
			"SELECT COUNT(*) FROM uploaded_files WHERE object_key = '1/race' AND owner_user_id = " +
				userId,
		),
		1,
	);
	database.run("INSERT INTO pending_r2_delete (object_key) VALUES ('1/race')");

	assert.throws(
		() =>
			database.run(
				"INSERT INTO messages (channel_id, sender_id, content, attachment_key) VALUES (?, ?, 'x', '1/race')",
				[channelId, userId],
			),
		/r2_object_pending_delete/,
	);
	assert.throws(
		() => database.run("UPDATE users SET avatar_key = '1/race' WHERE id = ?", [userId]),
		/r2_object_pending_delete/,
	);
	assert.throws(
		() => database.run("UPDATE channels SET avatar_key = '1/race' WHERE id = ?", [channelId]),
		/r2_object_pending_delete/,
	);
});

test("硬删除用户前先持久化其 R2 清理任务", async () => {
	const database = createDatabase();
	const userId = insertUser(database, "deleted-owner", { deleted: true });
	database.run(
		"INSERT INTO uploaded_files (object_key, owner_user_id) VALUES ('1/durable', ?)",
		[userId],
	);
	const baseDb = createD1Adapter(database);
	const failingDb = {
		...baseDb,
		prepare(sql) {
			const statement = baseDb.prepare(sql);
			const failMetadataDelete =
				String(sql).includes("DELETE FROM uploaded_files") &&
				String(sql).includes("owner_user_id IN");
			return {
				bind(...values) {
					statement.bind(...values);
					return this;
				},
				all() {
					return statement.all();
				},
				run() {
					if (failMetadataDelete) {
						throw new Error("simulated metadata delete failure");
					}
					return statement.run();
				},
			};
		},
	};

	await assert.rejects(
		runScheduledGc({ DB: failingDb, FILES: { async delete() {} } }),
		/simulated metadata delete failure/,
	);
	assert.equal(
		scalar(
			database,
			"SELECT COUNT(*) FROM pending_r2_delete WHERE object_key = '1/durable'",
		),
		1,
	);
});
