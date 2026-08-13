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
	assert.match(layout, /height:\s*var\(--chat-viewport-height,\s*100dvh\);/);
	assert.match(layout, /overflow:\s*hidden;/);
	assert.doesNotMatch(chatPage, /--chat-interface-scale/);
	assert.doesNotMatch(chatPage, /zoom\s*:/);
	assert.doesNotMatch(chatPage, /width:\s*80%;/);
	assert.doesNotMatch(chatPage, /height:\s*80vh;/);
});

test("移动端聊天页只显示会话列表或当前聊天中的一个视图", () => {
	assert.match(chatPage, /'chat-layout--mobile-list': isMobileViewport && mobileView === 'list'/);
	assert.match(chatPage, /'chat-layout--mobile-chat': isMobileViewport && mobileView === 'chat'/);
	assert.match(
		chatPage,
		/\.chat-layout--mobile-list \.chat-main,\s*\.chat-layout--mobile-chat \.left-sidebar\s*{\s*display:\s*none;/s,
	);
	assert.match(chatPage, /class="chat-header__back"/);
	assert.match(chatPage, /@click="returnToMobileConversationList"/);
});

test("移动端主要图标按钮保留四十四像素触控区域", () => {
	assert.match(chatPage, /\.mobile-menu-action\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
	assert.match(chatPage, /\.chat-header__back\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
	assert.match(chatPage, /\.chat-header__button\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
	assert.match(chatPage, /\.composer-btn,\s*\.composer-send\s*{\s*width:\s*44px;\s*height:\s*44px;/s);
	assert.match(chatPage, /font-size:\s*16px;/);
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

test("GitHub 仓库入口位于添加人员左侧并复用相同按钮尺寸", () => {
	const githubLink = chatPage.indexOf('href="https://github.com/aozorae/Edgechat"');
	const addConversation = chatPage.indexOf('title="添加人员"');
	assert.notEqual(githubLink, -1);
	assert.ok(githubLink < addConversation);
	assert.match(chatPage, /src="\/github\.svg"/);
	assert.match(chatPage, /rel="noopener noreferrer"/);

	const headerAction = getStyleRule(chatPage, ".header-action");
	assert.match(headerAction, /flex:\s*0 0 36px;/);
	assert.match(headerAction, /width:\s*36px;/);
	assert.match(headerAction, /height:\s*36px;/);
});
