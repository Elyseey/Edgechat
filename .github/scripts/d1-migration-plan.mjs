import { createHash } from "node:crypto";

export const D1_MIGRATION_LEDGER = "edgechat_schema_migrations";

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function migrationChecksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

function ledgerInsert(migration, checksum) {
  return `INSERT INTO ${D1_MIGRATION_LEDGER} (migration_id, checksum)
VALUES (${sqlString(migration.id)}, ${sqlString(checksum)});`;
}

export async function buildD1MigrationPlan({ migrations, appliedMigrations, artifacts, readSql }) {
  const chunks = [
    `CREATE TABLE IF NOT EXISTS ${D1_MIGRATION_LEDGER} (
  migration_id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
  ];
  const decisions = [];

  for (const migration of migrations) {
    const sql = await readSql(migration.file);
    const checksum = migrationChecksum(sql);
    const recordedChecksum = appliedMigrations.get(migration.id);

    if (recordedChecksum) {
      if (recordedChecksum !== checksum) {
        throw new Error(`迁移 ${migration.id} 已执行，但文件校验值发生变化`);
      }
      decisions.push({ id: migration.id, action: "skip" });
      continue;
    }

    const presentArtifacts = migration.artifacts.filter((artifact) => artifacts.has(artifact));
    const allPresent = presentArtifacts.length === migration.artifacts.length;
    const nonePresent = presentArtifacts.length === 0;

    if (allPresent) {
      chunks.push(`-- 现有数据库已具备 ${migration.id} 的结构，仅登记迁移基线。`);
      chunks.push(ledgerInsert(migration, checksum));
      decisions.push({ id: migration.id, action: "baseline" });
      continue;
    }

    if (!nonePresent && !migration.rerunnable) {
      const missing = migration.artifacts.filter((artifact) => !artifacts.has(artifact));
      throw new Error(
        `迁移 ${migration.id} 的数据库结构只完成了一部分；已存在：${presentArtifacts.join(", ")}；缺少：${missing.join(", ")}`,
      );
    }

    chunks.push(`-- 执行迁移 ${migration.id}。`);
    chunks.push(sql.trim());
    chunks.push(ledgerInsert(migration, checksum));
    decisions.push({ id: migration.id, action: "apply" });
  }

  return {
    sql: `${chunks.join("\n\n")}\n`,
    decisions,
  };
}
