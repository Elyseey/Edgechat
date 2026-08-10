import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadEncryptionKeyring } from "../../worker/src/encryption.js";
import {
	createKeyring,
	prepareWorkerEncryptionSecret,
} from "./prepare-worker-encryption-secret.mjs";

test("generated deployment keyrings contain a random 32-byte active key", () => {
	const first = createKeyring();
	const second = createKeyring();
	assert.notEqual(first, second);
	assert.equal(loadEncryptionKeyring(first).keys.get("v1").bytes.byteLength, 32);
});

test("first deployment writes a temporary secret file and existing deployments preserve it", async (t) => {
	const originalFetch = globalThis.fetch;
	const directory = mkdtempSync(join(tmpdir(), "edgechat-secret-test-"));
	t.after(() => {
		globalThis.fetch = originalFetch;
		rmSync(directory, { recursive: true, force: true });
	});

	globalThis.fetch = async () => Response.json({ success: true, result: [] });
	const secretsFile = join(directory, "secrets.json");
	const created = await prepareWorkerEncryptionSecret({
		accountId: "account",
		apiToken: "token",
		workerName: "cfchat",
		secretsFile,
	});
	assert.equal(created.generated, true);
	const payload = JSON.parse(readFileSync(secretsFile, "utf8"));
	assert.equal(
		loadEncryptionKeyring(payload.EDGECHAT_ENCRYPTION_KEYRING).keys.get("v1").bytes.byteLength,
		32,
	);

	globalThis.fetch = async () =>
		Response.json({
			success: true,
			result: [{ name: "EDGECHAT_ENCRYPTION_KEYRING", type: "secret_text" }],
		});
	const preserved = await prepareWorkerEncryptionSecret({
		accountId: "account",
		apiToken: "token",
		workerName: "cfchat",
		secretsFile: join(directory, "unused.json"),
	});
	assert.deepEqual(preserved, { generated: false });
});
