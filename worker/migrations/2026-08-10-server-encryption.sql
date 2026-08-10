CREATE TABLE IF NOT EXISTS encryption_migration_state (
  resource_type TEXT NOT NULL CHECK (resource_type IN ('attachment')),
  resource_key TEXT NOT NULL,
  key_id TEXT NOT NULL,
  migrated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resource_type, resource_key)
);

CREATE INDEX IF NOT EXISTS idx_encryption_migration_state_key
  ON encryption_migration_state(resource_type, key_id, resource_key);
