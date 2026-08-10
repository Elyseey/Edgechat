#!/usr/bin/env node

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { loadEncryptionKeyring } from "../../worker/src/encryption.js";

const API_BASE_URL = "https://api.cloudflare.com/client/v4";
const SECRET_NAME = "EDGECHAT_ENCRYPTION_KEYRING";

function requireEnv(name) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function setOutput(name, value) {
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value)}\n`);
	}
}

function apiError(payload, fallback) {
	if (!Array.isArray(payload?.errors) || payload.errors.length === 0) return fallback;
	return payload.errors.map((error) => `${error.code}: ${error.message}`).join("; ");
}

async function listWorkerSecrets({ accountId, apiToken, workerName }) {
	const response = await fetch(
		`${API_BASE_URL}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(workerName)}/secrets`,
		{ headers: { Authorization: `Bearer ${apiToken}` } },
	);
	const payload = await response.json().catch(() => null);
	if (response.status === 404) return [];
	if (!response.ok || payload?.success === false) {
		throw new Error(apiError(payload, `Cloudflare API returned ${response.status}`));
	}
	return Array.isArray(payload?.result) ? payload.result : [];
}

export function createKeyring() {
	return JSON.stringify({
		activeKeyId: "v1",
		keys: { v1: randomBytes(32).toString("base64") },
	});
}

export async function prepareWorkerEncryptionSecret({
	accountId,
	apiToken,
	workerName = "cfchat",
	secretsFile = ".tmp/worker-secrets.json",
	suppliedKeyring = "",
} = {}) {
	const secrets = await listWorkerSecrets({ accountId, apiToken, workerName });
	if (secrets.some((secret) => secret?.name === SECRET_NAME)) {
		setOutput("generated", "false");
		console.log(`${SECRET_NAME} already exists on ${workerName}; preserving it.`);
		return { generated: false };
	}

	const keyring = suppliedKeyring || createKeyring();
	loadEncryptionKeyring(keyring);
	console.log(`::add-mask::${keyring}`);
	mkdirSync(dirname(secretsFile), { recursive: true });
	writeFileSync(secretsFile, JSON.stringify({ [SECRET_NAME]: keyring }), { mode: 0o600 });
	setOutput("generated", "true");
	console.log(`${SECRET_NAME} will be created with this deployment.`);
	return { generated: true, secretsFile };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	prepareWorkerEncryptionSecret({
		accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
		apiToken: requireEnv("CLOUDFLARE_API_TOKEN"),
		workerName: process.env.EDGECHAT_WORKER_NAME || "cfchat",
		secretsFile: process.env.EDGECHAT_SECRETS_FILE || ".tmp/worker-secrets.json",
		suppliedKeyring: process.env.EDGECHAT_ENCRYPTION_KEYRING || "",
	}).catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
