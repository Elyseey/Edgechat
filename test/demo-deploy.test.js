import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../.github/workflows/deploy-demo.yml', import.meta.url),
  'utf8'
);
const wrangler = readFileSync(new URL('../wrangler.demo.toml', import.meta.url), 'utf8');
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

test('demo workflow is manual-only and uses dedicated Cloudflare secrets', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /secrets\.DEMO_CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /secrets\.DEMO_CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /ensure-cloudflare-resources|prepare-d1-migrations|prepare-worker-encryption-secret/);
});

test('demo Wrangler config serves only its isolated static build', () => {
  assert.match(wrangler, /name = "edgechat-demo"/);
  assert.match(wrangler, /directory = "\.\/frontend\/demo-dist"/);
  assert.doesNotMatch(wrangler, /d1_databases|kv_namespaces|r2_buckets|durable_objects|triggers|main =/);
  assert.equal(
    packageJson.scripts['deploy:demo'],
    'npm run build:demo && wrangler deploy --config wrangler.demo.toml'
  );
});
