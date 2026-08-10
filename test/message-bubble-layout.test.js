import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatPage = readFileSync(
	new URL("../frontend/src/pages/ChatPage.vue", import.meta.url),
	"utf8",
).replaceAll("\r\n", "\n");

function getStyleRule(selector) {
	const marker = `${selector} {`;
	const start = chatPage.indexOf(marker);
	assert.notEqual(start, -1, `聊天页缺少样式规则：${selector}`);
	const end = chatPage.indexOf("}", start + marker.length);
	assert.notEqual(end, -1, `聊天页样式规则未闭合：${selector}`);
	return chatPage.slice(start, end + 1);
}

test("短文本消息为右下角时间戳预留末行空间", () => {
	assert.match(
		chatPage,
		/:class="\{ 'message-bubble--with-attachment': msg\.attachment \}"/,
	);

	const bubble = getStyleRule(".message-bubble");
	assert.match(bubble, /padding:\s*6px 10px 7px;/);

	const attachmentBubble = getStyleRule(".message-bubble--with-attachment");
	assert.match(attachmentBubble, /padding-bottom:\s*20px;/);

	const time = getStyleRule(".message-time");
	assert.match(time, /position:\s*absolute;/);
	assert.match(time, /white-space:\s*nowrap;/);

	const reserve = getStyleRule(
		".message-bubble:not(.message-bubble--with-attachment) p::after",
	);
	assert.match(reserve, /display:\s*inline-block;/);
	assert.match(reserve, /width:\s*3\.5em;/);
});
