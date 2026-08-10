export const D1_MIGRATIONS = [
  {
    id: "2026-04-05-private-groups",
    file: "worker/migrations/2026-04-05-private-groups.sql",
    artifacts: ["column:channel_members.role", "column:channel_members.invited_by"],
  },
  {
    id: "2026-04-09-registration-invites",
    file: "worker/migrations/2026-04-09-registration-invites.sql",
    artifacts: ["column:users.registration_invite_id", "table:registration_invites"],
  },
  {
    id: "2026-04-09-site-settings",
    file: "worker/migrations/2026-04-09-site-settings.sql",
    artifacts: ["table:site_settings"],
  },
  {
    id: "2026-04-12-channel-avatar",
    file: "worker/migrations/2026-04-12-channel-avatar.sql",
    artifacts: ["column:channels.avatar_key"],
  },
  {
    id: "2026-04-18-admin-session-version",
    file: "worker/migrations/2026-04-18-admin-session-version.sql",
    artifacts: ["column:users.is_admin", "column:users.session_version"],
  },
  {
    id: "2026-04-19-gc-maintenance",
    file: "worker/migrations/2026-04-19-gc-maintenance.sql",
    artifacts: ["table:pending_r2_delete"],
  },
  {
    id: "2026-07-02-message-read-badges",
    file: "worker/migrations/2026-07-02-message-read-badges.sql",
    artifacts: ["table:message_reads"],
  },
  {
    id: "2026-07-09-uploaded-files",
    file: "worker/migrations/2026-07-09-uploaded-files.sql",
    artifacts: ["table:uploaded_files", "index:idx_uploaded_files_owner"],
  },
  {
    id: "2026-07-28-general-channel",
    file: "worker/migrations/2026-07-28-general-channel.sql",
    artifacts: [
      "trigger:add_new_user_to_general",
      "trigger:prevent_general_member_removal",
      "trigger:protect_general_channel",
    ],
    rerunnable: true,
  },
  {
    id: "2026-07-29-registration-invite-usage",
    file: "worker/migrations/2026-07-29-registration-invite-usage.sql",
    artifacts: [
      "column:registration_invites.max_uses",
      "column:registration_invites.used_count",
      "table:registration_invite_uses",
      "trigger:validate_registration_invite_use",
      "trigger:consume_registration_invite_use",
      "index:idx_registration_invite_uses_invite",
      "index:idx_registration_invites_usage",
    ],
  },
];
