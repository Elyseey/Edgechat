<script setup lang="ts">
import { computed } from "vue";
import { tokenizeMentionText, type MessageMention } from "../../mentions.ts";

const props = defineProps<{
	content: string;
	mentions?: MessageMention[];
	currentUserId?: number;
}>();

const tokens = computed(() => tokenizeMentionText(props.content, props.mentions || []));
</script>

<template>
	<template v-for="(token, index) in tokens" :key="`${index}:${token.text}`">
		<span v-if="token.type === 'text'">{{ token.text }}</span>
		<span
			v-else
			class="message-mention"
			:class="{ 'message-mention--self': Number(token.userId) === Number(currentUserId) }"
		>{{ token.text }}</span>
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
</style>
