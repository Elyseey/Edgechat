<script setup lang="ts">
import { computed } from "vue";
import type { MessageMention } from "../../mentions.ts";
import { tokenizeMessageText } from "../../message-text.ts";

const props = defineProps<{
	content: string;
	mentions?: MessageMention[];
	currentUserId?: number;
}>();

const tokens = computed(() => tokenizeMessageText(props.content, props.mentions || []));
</script>

<template>
	<template v-for="(token, index) in tokens" :key="`${index}:${token.text}`">
		<span v-if="token.type === 'text'">{{ token.text }}</span>
		<span
			v-else-if="token.type === 'mention'"
			class="message-mention"
			:class="{ 'message-mention--self': Number(token.userId) === Number(currentUserId) }"
		>{{ token.text }}</span>
		<a
			v-else
			class="message-link"
			:href="token.href"
			target="_blank"
			rel="noopener noreferrer"
			@pointerdown.stop
			@contextmenu.stop
		>{{ token.text }}</a>
	</template>
</template>

<style scoped>
.message-mention {
	color: #168758;
	font-weight: 650;
}

.message-mention--self {
	padding: 1px 3px;
	border-radius: 4px;
	background: rgba(22, 135, 88, 0.14);
}

.message-link {
	color: #006aa6;
	text-decoration: none;
	overflow-wrap: anywhere;
}

.message-link:hover {
	text-decoration: underline;
}
</style>
