import assert from "node:assert/strict";
import test from "node:test";

import { useChatSidebar } from "../frontend/src/composables/useChatSidebar.js";

test("general 在私信和其他群组之前永久置顶", () => {
	const sidebar = useChatSidebar({
		applyActiveChannel() {},
		selectDm() {},
	});
	const newer = "2026-07-28T12:00:00.000Z";
	const older = "2026-07-01T12:00:00.000Z";

	sidebar.channels.value = [
		{
			id: 1,
			name: "general",
			kind: "public",
			isGeneral: true,
			isMember: true,
			lastMessageAt: older,
		},
		{
			id: 2,
			name: "Team",
			kind: "private",
			isGeneral: false,
			isMember: true,
			lastMessageAt: newer,
		},
	];
	sidebar.dms.value = [
		{
			id: 3,
			kind: "dm",
			otherUser: { username: "alice", displayName: "Alice", avatarUrl: "" },
			lastMessageAt: newer,
		},
	];

	assert.deepEqual(
		sidebar.conversationItems.value.map((item) => item.key),
		["public:1", "dm:3", "private:2"],
	);
	assert.equal(sidebar.conversationItems.value[0].subtitle, "全员群组");
});
