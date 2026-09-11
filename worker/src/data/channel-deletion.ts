interface Statement {
	bind(...values: number[]): Statement;
}

interface Database {
	prepare(sql: string): Statement;
	batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]>;
}

// API 和历史群组 GC 共用这一事务，避免不同入口遗漏关联记录或继续占用群名。
export async function hardDeleteChannel(db: Database, channelId: number) {
	const target = `SELECT id FROM channels
		WHERE id = ? AND kind IN ('public', 'private') AND name != 'general'`;
	const [, messages, members, , channel] = await db.batch([
		// 文件键先持久化再删消息；R2 由已有队列分批清理，失败或进程中断也不会丢失任务。
		db.prepare(
			`INSERT OR IGNORE INTO pending_r2_delete (object_key)
			 SELECT attachment_key FROM messages
			 WHERE channel_id IN (${target}) AND attachment_key IS NOT NULL AND attachment_key != ''
			 UNION
			 SELECT avatar_key FROM channels
			 WHERE id IN (${target}) AND avatar_key IS NOT NULL AND avatar_key != ''`,
		).bind(channelId, channelId),
		db.prepare(`DELETE FROM messages WHERE channel_id IN (${target})`).bind(channelId),
		db.prepare(`DELETE FROM channel_members WHERE channel_id IN (${target})`).bind(channelId),
		// 已读游标没有级联外键，必须先显式删除；置顶、同步事件和 Telegram 映射由外键级联。
		db.prepare(`DELETE FROM message_reads WHERE channel_id IN (${target})`).bind(channelId),
		db.prepare(`DELETE FROM channels WHERE id IN (${target})`).bind(channelId),
	]);

	return {
		channelsDeleted: channel.meta.changes,
		channelMessagesDeleted: messages.meta.changes,
		channelMembersDeleted: members.meta.changes,
	};
}
