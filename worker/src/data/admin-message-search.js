function escapeSqlLike(value) {
  // LIKE 的通配符会扩大匹配范围，必须转义后再按管理员输入的字面内容搜索。
  return value.replace(/[\\%_]/g, '\\$&');
}

function mapAdminMessage(row) {
  return {
    id: Number(row.id),
    content: row.content,
    attachmentName: row.attachment_name,
    createdAt: row.created_at,
    room: {
      id: Number(row.channel_id),
      name: row.channel_name,
      kind: row.channel_kind
    },
    sender: {
      id: Number(row.sender_id),
      username: row.sender_username,
      displayName: row.sender_display_name
    }
  };
}

export async function searchAdminMessages(
  db,
  { keyword = '', channelId = null, userId = null, kind = '', dmUserIds = null, limit = 50 } = {}
) {
  const filters = ['m.deleted_at IS NULL', 'c.deleted_at IS NULL'];
  const binds = [];

  if (keyword) {
    const escapedKeyword = escapeSqlLike(keyword);
    filters.push("(m.content LIKE ? ESCAPE '\\' OR m.attachment_name LIKE ? ESCAPE '\\')");
    binds.push(`%${escapedKeyword}%`, `%${escapedKeyword}%`);
  }

  if (dmUserIds) {
    // 私信频道使用排序后的用户 ID 作为唯一键，因此查询与用户选择顺序无关。
    const dmKey = dmUserIds.slice().sort((left, right) => left - right).join(':');
    filters.push("c.kind = 'dm'", 'c.dm_key = ?');
    binds.push(dmKey);
  } else {
    if (channelId !== null) {
      filters.push('c.id = ?');
      binds.push(channelId);
    }

    if (userId !== null) {
      filters.push('u.id = ?');
      binds.push(userId);
    }

    if (kind === 'public' || kind === 'private' || kind === 'dm') {
      filters.push('c.kind = ?');
      binds.push(kind);
    }
  }

  const { results } = await db
    .prepare(
      `SELECT
         m.id,
         m.content,
         m.attachment_name,
         m.created_at,
         c.id AS channel_id,
         c.name AS channel_name,
         c.kind AS channel_kind,
         u.id AS sender_id,
         u.display_name AS sender_display_name,
         u.username AS sender_username
       FROM messages m
       JOIN channels c ON c.id = m.channel_id
       JOIN users u ON u.id = m.sender_id
       WHERE ${filters.join(' AND ')}
       ORDER BY m.id DESC
       LIMIT ?`
    )
    .bind(...binds, limit)
    .all();

  return results.map(mapAdminMessage);
}
