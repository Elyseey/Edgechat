import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatPage = readFileSync(
	new URL("../frontend/src/pages/ChatPage.vue", import.meta.url),
	"utf8",
).replaceAll("\r\n", "\n");

function getStyleRule(source, selector) {
	const marker = `${selector} {`;
	const start = source.indexOf(marker);
	assert.notEqual(start, -1, `聊天页缺少样式规则：${selector}`);
	const end = source.indexOf("}", start + marker.length);
	assert.notEqual(end, -1, `聊天页样式规则未闭合：${selector}`);
	return source.slice(start, end + 1);
}

test("聊天界面使用原始控件尺寸铺满整个视口", () => {
	const layout = getStyleRule(chatPage, ".chat-layout");
	assert.match(layout, /width:\s*100%;/);
	assert.match(layout, /height:\s*100dvh;/);
	assert.doesNotMatch(chatPage, /--chat-interface-scale/);
	assert.doesNotMatch(chatPage, /zoom\s*:/);
	assert.doesNotMatch(chatPage, /width:\s*80%;/);
	assert.doesNotMatch(chatPage, /height:\s*80vh;/);
});

test("聊天侧栏跟随全屏根节点且不污染后台根节点", () => {
	for (const selector of [
		".left-sidebar",
		".right-sidebar",
		".room-management-sidebar",
	]) {
		assert.match(getStyleRule(chatPage, selector), /height:\s*100%;/);
	}

	assert.doesNotMatch(chatPage, /(?:html|body|#app|\.admin-page)\s*{[^}]*zoom:/s);
});
