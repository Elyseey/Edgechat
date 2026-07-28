import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
	new URL("../.github/workflows/deploy-worker.yml", import.meta.url),
	"utf8",
).replaceAll("\r\n", "\n");

function getStep(name) {
	const marker = `      - name: ${name}\n`;
	const start = workflow.indexOf(marker);
	assert.notEqual(start, -1, `部署工作流缺少步骤：${name}`);
	const next = workflow.indexOf("      - name: ", start + marker.length);
	return workflow.slice(start, next === -1 ? undefined : next);
}

test("Cloudflare 生产凭据只注入实际调用 Cloudflare 的步骤", () => {
	const deployJobStart = workflow.indexOf("  deploy:\n");
	const stepsStart = workflow.indexOf("    steps:\n", deployJobStart);
	assert.notEqual(deployJobStart, -1);
	assert.notEqual(stepsStart, -1);
	assert.doesNotMatch(
		workflow.slice(deployJobStart, stepsStart),
		/CLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)/,
	);

	for (const name of [
		"Checkout",
		"Setup Node.js",
		"Install dependencies",
		"Build frontend assets",
		"Generate wrangler config for CI",
		"Generate admin bootstrap SQL (optional)",
	]) {
		assert.doesNotMatch(getStep(name), /CLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)/);
	}

	for (const name of [
		"Ensure Cloudflare resources",
		"Initialize D1 schema (first creation only)",
		"Ensure admin user (optional)",
		"Deploy worker",
	]) {
		const step = getStep(name);
		assert.match(step, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
		assert.match(step, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
	}
});
