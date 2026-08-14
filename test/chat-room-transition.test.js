import assert from "node:assert/strict";
import test from "node:test";
import { ref } from "vue";

import { useChatRoom } from "../frontend/src/composables/useChatRoom.js";

function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function createSocket(params, handlers) {
	return {
		params,
		handlers,
		readyState: 1,
		close() {
			this.readyState = 3;
		},
		send() {},
		emitMessage(message) {
			handlers.onMessage(JSON.stringify(message), this);
		},
	};
}

test("快速切换房间时丢弃旧历史响应和旧连接消息", async () => {
	const activeRoom = ref({ id: 1, kind: "public" });
	const requests = new Map();
	const sockets = [];
	const room = useChatRoom({
		activeRoom,
		session: ref({ userId: 7 }),
		error: ref(""),
		roomApi: {
			getMessages(_kind, roomId) {
				const request = deferred();
				requests.set(roomId, request);
				return request.promise;
			},
			async markRoomRead() {},
		},
		openRoomConnection(params) {
			const handlers = {
				onStatus: params.onStatus,
				onMessage: params.onMessage,
			};
			const socket = createSocket(params, handlers);
			sockets.push(socket);
			handlers.onStatus({ status: "open", socket });
			return socket;
		},
	});

	const firstActivation = room.activateRoom();
	activeRoom.value = { id: 2, kind: "private" };
	sockets[0].emitMessage({ type: "message", message: { id: 98, content: "stale before watcher" } });
	const secondActivation = room.activateRoom();
	sockets[0].emitMessage({ type: "message", message: { id: 99, content: "stale socket" } });
	requests.get(1).resolve({ messages: [{ id: 1, content: "stale history" }] });
	requests.get(2).resolve({ messages: [{ id: 2, content: "current history" }] });

	assert.equal(await firstActivation, false);
	assert.equal(await secondActivation, true);
	assert.deepEqual(room.messages.value, [{ id: 2, content: "current history" }]);
});
