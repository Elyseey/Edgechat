import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replaceAll("\r\n", "\n");
const ci = read("../.github/workflows/android-ci.yml");
const release = read("../.github/workflows/android-release.yml");
const worker = read("../.github/workflows/deploy-worker.yml");
const demo = read("../.github/workflows/deploy-demo.yml");

test("Android CI validates the wrapper and builds a tested debug APK", () => {
	assert.match(ci, /gradle\/actions\/wrapper-validation@v4/);
	assert.match(ci, /testDebugUnitTest lintDebug assembleDebug/);
	assert.match(ci, /android\/app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
	assert.match(ci, /docs\/api\/\*\*/);
});

test("Android release requires secret signing and publishes APK, AAB and SHA-256", () => {
	for (const secret of [
		"ANDROID_KEYSTORE_BASE64",
		"ANDROID_KEYSTORE_PASSWORD",
		"ANDROID_KEY_ALIAS",
		"ANDROID_KEY_PASSWORD",
	]) {
		assert.match(release, new RegExp(`secrets\\.${secret}`));
	}
	assert.match(release, /assembleRelease bundleRelease/);
	assert.match(release, /sha256sum \*\.apk \*\.aab > SHA256SUMS\.txt/);
	assert.match(release, /gh release create/);
});

test("Worker ignores Android-only paths and maintained Actions use Node 24 compatible majors", () => {
	assert.match(worker, /paths:/);
	assert.doesNotMatch(worker, /android\/\*\*/);
	for (const workflow of [worker, demo, ci, release]) {
		assert.match(workflow, /actions\/checkout@v5/);
	}
	assert.match(worker, /actions\/setup-node@v5/);
	assert.match(demo, /actions\/setup-node@v5/);
});
