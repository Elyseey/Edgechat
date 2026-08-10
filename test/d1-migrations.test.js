import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import { D1_MIGRATIONS } from "../.github/scripts/d1-migration-manifest.mjs";
import { buildD1MigrationPlan } from "../.github/scripts/d1-migration-plan.mjs";

const repositoryRoot = new URL("../", import.meta.url);

function readMigration(file) {
	return readFileSync(new URL(file, repositoryRoot), "utf8");
}

function artifactsThrough(migrationIndex) {
	return new Set(
		D1_MIGRATIONS.slice(0, migrationIndex + 1).flatMap((migration) => migration.artifacts),
	);
}

test("迁移清单覆盖全部 D1 SQL 且保持文件顺序", () => {
	const files = readdirSync(new URL("../worker/migrations/", import.meta.url))
		.filter((file) => file.endsWith(".sql"))
		.sort()
		.map((file) => `worker/migrations/${file}`);

	assert.deepEqual(
		D1_MIGRATIONS.map((migration) => migration.file),
		files,
	);
});

test("完整数据库只登记迁移基线，不重复执行历史 SQL", async () => {
	const plan = await buildD1MigrationPlan({
		migrations: D1_MIGRATIONS,
		appliedMigrations: new Map(),
		artifacts: artifactsThrough(D1_MIGRATIONS.length - 1),
		readSql: readMigration,
	});

	assert.equal(plan.decisions.every((decision) => decision.action === "baseline"), true);
	assert.doesNotMatch(plan.sql, /ALTER TABLE registration_invites/);
	assert.match(plan.sql, /CREATE TABLE IF NOT EXISTS edgechat_schema_migrations/);
});

test("旧数据库只执行缺失的邀请次数迁移", async () => {
	const inviteMigrationIndex = D1_MIGRATIONS.findIndex(
		(migration) => migration.id === "2026-07-29-registration-invite-usage",
	);
	const plan = await buildD1MigrationPlan({
		migrations: D1_MIGRATIONS,
		appliedMigrations: new Map(),
		artifacts: artifactsThrough(inviteMigrationIndex - 1),
		readSql: readMigration,
	});

	assert.equal(
		plan.decisions.find((decision) => decision.id === "2026-07-29-registration-invite-usage")?.action,
		"apply",
	);
	assert.match(plan.sql, /ADD COLUMN max_uses/);
	assert.match(plan.sql, /CREATE TABLE IF NOT EXISTS registration_invite_uses/);
	assert.doesNotMatch(plan.sql, /DROP TABLE channels/);
});

test("部分迁移状态会阻断部署，避免继续发布不兼容代码", async () => {
	const inviteMigrationIndex = D1_MIGRATIONS.findIndex(
		(migration) => migration.id === "2026-07-29-registration-invite-usage",
	);
	const artifacts = artifactsThrough(inviteMigrationIndex - 1);
	artifacts.add("column:registration_invites.max_uses");

	await assert.rejects(
		() =>
			buildD1MigrationPlan({
				migrations: D1_MIGRATIONS,
				appliedMigrations: new Map(),
				artifacts,
				readSql: readMigration,
			}),
		/数据库结构只完成了一部分/,
	);
});

test("Windows CRLF 迁移校验值会在 Linux Actions 中自动归一化", async () => {
	const sql = "CREATE TABLE example (id INTEGER);\n";
	const legacyChecksum = createHash("sha256")
		.update(sql.replaceAll("\n", "\r\n"))
		.digest("hex");
	const plan = await buildD1MigrationPlan({
		migrations: [
			{
				id: "cross-platform",
				file: "cross-platform.sql",
				artifacts: ["table:example"],
			},
		],
		appliedMigrations: new Map([["cross-platform", legacyChecksum]]),
		artifacts: new Set(["table:example"]),
		readSql() {
			return sql;
		},
	});

	assert.deepEqual(plan.decisions, [{ id: "cross-platform", action: "normalize" }]);
	assert.match(plan.sql, /统一 cross-platform 的跨平台换行符校验值/);
	assert.match(plan.sql, /UPDATE edgechat_schema_migrations/);
});

test("部署工作流每次发布都在 Worker 之前准备并执行 D1 迁移", () => {
	const workflow = readFileSync(
		new URL("../.github/workflows/deploy-worker.yml", import.meta.url),
		"utf8",
	).replaceAll("\r\n", "\n");
	const prepareIndex = workflow.indexOf("      - name: Prepare D1 migrations\n");
	const applyIndex = workflow.indexOf("      - name: Apply D1 migrations\n");
	const deployIndex = workflow.indexOf("      - name: Deploy worker\n");

	assert.ok(prepareIndex > 0);
	assert.ok(applyIndex > prepareIndex);
	assert.ok(deployIndex > applyIndex);
	assert.doesNotMatch(
		workflow.slice(prepareIndex, workflow.indexOf("      - name: ", prepareIndex + 20)),
		/d1_created == 'true'/,
	);
	assert.match(workflow, /prepare-d1-migrations\.mjs/);
	assert.match(workflow, /\.tmp\/edgechat-d1-migrations\.sql/);
});

test("CI Wrangler 配置保留收件箱 Durable Object 与管理员变量", () => {
	const config = readFileSync(new URL("../wrangler.example.toml", import.meta.url), "utf8");

	assert.match(config, /ADMIN_USERNAMES = "admin"/);
	assert.match(config, /name = "USER_INBOX"\s+class_name = "UserInbox"/);
	assert.match(config, /tag = "v2"\s+new_sqlite_classes = \["UserInbox"\]/);
});
