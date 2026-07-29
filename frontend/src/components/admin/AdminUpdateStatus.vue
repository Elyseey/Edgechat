<script setup>
import { computed, onMounted, ref } from "vue";
import { checkForUpdates, getBuildInfo } from "../../update-check.js";
import UiButton from "../ui/Button.vue";
import UiSurface from "../ui/Surface.vue";

const build = getBuildInfo();
const checking = ref(false);
const result = ref(null);
const error = ref("");

const shortCommit = computed(() => build.commit.slice(0, 7) || "未知");
const statusTone = computed(() => {
	if (error.value) {
		return "error";
	}
	if (checking.value || !result.value) {
		return "neutral";
	}
	return result.value.updateAvailable ? "warning" : "success";
});
const statusTitle = computed(() => {
	if (checking.value) {
		return "正在检查更新";
	}
	if (error.value) {
		return "暂时无法检查";
	}
	if (!result.value) {
		return "等待检查";
	}
	if (result.value.state === "local-ahead") {
		return "当前部署领先于远端";
	}
	return result.value.updateAvailable ? "发现可用更新" : "已是最新版本";
});
const statusDetail = computed(() => {
	if (checking.value) {
		return `正在比对 ${build.repository || "代码仓库"} 的 ${build.branch || "当前"} 分支。`;
	}
	if (error.value) {
		return error.value;
	}
	if (!result.value) {
		return "";
	}
	if (result.value.state === "local-ahead") {
		return `当前部署领先 ${result.value.localCommitCount} 个提交。`;
	}
	if (result.value.state === "diverged") {
		return `远端有 ${result.value.remoteCommitCount} 个新提交，且双方分支已经产生差异。`;
	}
	if (result.value.updateAvailable) {
		return `远端有 ${result.value.remoteCommitCount} 个新提交。`;
	}
	return `当前部署与远端 ${build.branch} 分支一致。`;
});

function formatDate(value) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? ""
		: date.toLocaleString("zh-CN", { hour12: false });
}

async function checkUpdates() {
	checking.value = true;
	error.value = "";
	try {
		result.value = await checkForUpdates({ build });
	} catch (currentError) {
		result.value = null;
		error.value = currentError instanceof Error ? currentError.message : "版本检查失败";
	} finally {
		checking.value = false;
	}
}

onMounted(checkUpdates);
</script>

<template>
	<UiSurface class="panel admin-update-panel">
		<div class="admin-update-panel__header">
			<div>
				<h3 class="panel-title">版本更新</h3>
				<p class="admin-update-panel__repository">
					<a
						v-if="build.repository"
						:href="`https://github.com/${build.repository}`"
						target="_blank"
						rel="noreferrer"
					>
						{{ build.repository }}
					</a>
					<span v-else>未识别代码仓库</span>
				</p>
			</div>
			<UiButton variant="secondary" size="sm" :disabled="checking" @click="checkUpdates">
				{{ checking ? "检查中..." : "检查更新" }}
			</UiButton>
		</div>

		<div
			class="admin-update-panel__status"
			:class="`admin-update-panel__status--${statusTone}`"
			role="status"
			aria-live="polite"
		>
			<span class="admin-update-panel__indicator" aria-hidden="true"></span>
			<div>
				<strong>{{ statusTitle }}</strong>
				<span>{{ statusDetail }}</span>
			</div>
		</div>

		<div class="admin-update-panel__meta">
			<div>
				<span>当前提交</span>
				<code>{{ shortCommit }}</code>
			</div>
			<div>
				<span>跟踪分支</span>
				<strong>{{ build.branch || "未知" }}</strong>
			</div>
		</div>

		<div v-if="result?.latestCommit" class="admin-update-panel__latest">
			<div>
				<span>最新提交</span>
				<strong>{{ result.latestCommit.message || result.latestCommit.sha.slice(0, 7) }}</strong>
				<small v-if="result.latestCommit.committedAt">
					{{ formatDate(result.latestCommit.committedAt) }}
				</small>
			</div>
			<a :href="result.compareUrl" target="_blank" rel="noreferrer">查看更新内容</a>
		</div>
	</UiSurface>
</template>

<style scoped>
.admin-update-panel {
	min-width: 0;
}

.admin-update-panel__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.admin-update-panel__repository {
	margin: 4px 0 0;
	font-size: 11px;
	line-height: 1.4;
	color: #6b8aab;
	overflow-wrap: anywhere;
}

.admin-update-panel__repository a {
	color: #477cad;
	text-decoration: none;
}

.admin-update-panel__repository a:hover {
	text-decoration: underline;
}

.admin-update-panel__status {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 12px;
	border: 1px solid rgba(99, 116, 137, 0.14);
	border-radius: 8px;
	background: rgba(99, 116, 137, 0.06);
}

.admin-update-panel__status > div {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.admin-update-panel__status strong {
	font-size: 12px;
	color: #334960;
}

.admin-update-panel__status span:not(.admin-update-panel__indicator) {
	font-size: 11px;
	line-height: 1.45;
	color: #65788c;
	overflow-wrap: anywhere;
}

.admin-update-panel__indicator {
	width: 8px;
	height: 8px;
	margin-top: 4px;
	border-radius: 50%;
	background: #7d8996;
	box-shadow: 0 0 0 4px rgba(125, 137, 150, 0.12);
	flex: 0 0 auto;
}

.admin-update-panel__status--success {
	border-color: rgba(45, 139, 87, 0.2);
	background: rgba(45, 139, 87, 0.07);
}

.admin-update-panel__status--success .admin-update-panel__indicator {
	background: #2d8b57;
	box-shadow: 0 0 0 4px rgba(45, 139, 87, 0.13);
}

.admin-update-panel__status--warning {
	border-color: rgba(190, 124, 35, 0.22);
	background: rgba(240, 168, 70, 0.09);
}

.admin-update-panel__status--warning .admin-update-panel__indicator {
	background: #be7c23;
	box-shadow: 0 0 0 4px rgba(190, 124, 35, 0.13);
}

.admin-update-panel__status--error {
	border-color: rgba(184, 66, 66, 0.2);
	background: rgba(184, 66, 66, 0.07);
}

.admin-update-panel__status--error .admin-update-panel__indicator {
	background: #b84242;
	box-shadow: 0 0 0 4px rgba(184, 66, 66, 0.12);
}

.admin-update-panel__meta {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.admin-update-panel__meta > div {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border-radius: 8px;
	background: rgba(71, 124, 173, 0.05);
}

.admin-update-panel__meta span,
.admin-update-panel__latest span,
.admin-update-panel__latest small {
	font-size: 10px;
	color: #74889c;
}

.admin-update-panel__meta strong,
.admin-update-panel__meta code {
	font-size: 12px;
	color: #334960;
}

.admin-update-panel__meta code {
	font-family: Consolas, "SFMono-Regular", monospace;
}

.admin-update-panel__latest {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 12px;
	padding-top: 2px;
}

.admin-update-panel__latest > div {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.admin-update-panel__latest strong {
	font-size: 12px;
	line-height: 1.4;
	color: #334960;
	overflow-wrap: anywhere;
}

.admin-update-panel__latest a {
	flex: 0 0 auto;
	font-size: 11px;
	font-weight: 600;
	color: #477cad;
	text-decoration: none;
}

.admin-update-panel__latest a:hover {
	text-decoration: underline;
}

@media (max-width: 480px) {
	.admin-update-panel__header,
	.admin-update-panel__latest {
		align-items: stretch;
		flex-direction: column;
	}

	.admin-update-panel__meta {
		grid-template-columns: 1fr;
	}
}
</style>
