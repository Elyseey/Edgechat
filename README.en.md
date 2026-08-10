<div align="center">
  <img src="Edgechat.png" alt="Edgechat logo" />
</div>

[Chinese README](README.md) | [GitHub Repository](https://github.com/gdz66601/Edgechat) | [Project Documentation](https://echat.azora.top/) | [License (GPL v3 or later)](https://www.gnu.org/licenses/gpl-3.0)

EdgeChat is a chat system deployed on Cloudflare. It provides accounts, public groups, private groups, direct messages, real-time messaging, file uploads, and an admin dashboard. The goal is to deliver a practical site messaging system in the Cloudflare ecosystem with low operational overhead.

This project is licensed under `GPL-3.0-or-later`. See [LICENSE](LICENSE) for details.

## Interface Preview

<table>
  <tr>
    <td width="50%" align="center"><strong>Chat Interface</strong></td>
    <td width="50%" align="center"><strong>Admin Dashboard</strong></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/previews/chat-home.png" alt="EdgeChat chat interface preview" width="100%" /></td>
    <td width="50%"><img src="assets/previews/admin-dashboard.png" alt="EdgeChat admin dashboard preview" width="100%" /></td>
  </tr>
</table>

## Features

- Admin-created users, with self-registration disabled
- Public groups, private groups, and direct message conversations
- Group owner member management, without an admin entry point for reading group or direct message content
- Real-time messaging, paginated history, and file messages
- File uploads and avatar management
- AES-256-GCM server-side encryption for newly written messages and newly uploaded attachments, without bulk backfilling legacy data
- Admin navigation for the dashboard, user management, registration invites, and site settings
- Browser-side update checks in site settings, comparing the current deployment with the source repository
- Modern Liquid Glass-style interface, adapted for mobile and basic accessibility
- Scheduled hard deletion for expired messages

## Tech Stack

- Frontend: Vue 3, Vue Router, Vite
- Backend: Cloudflare Workers, Hono
- Real-time layer: Durable Objects WebSocket Hibernation
- Database: Cloudflare D1
- Sessions: Cloudflare KV
- Files: Cloudflare R2
- Deployment: Wrangler, GitHub Actions

## Deployment

### GitHub Actions Deployment

GitHub Actions is recommended for long-term maintenance and production updates.

- Quick start: <https://echat.azora.top/guide/getting-started.html>
- Detailed guide: <https://echat.azora.top/guide/actions-deploy.html>

The repository includes `.github/workflows/deploy-worker.yml`. The workflow runs after pushing to `master` or `main`, or after a manual `workflow_dispatch` trigger.

### Privacy and Server-side Encryption

GitHub Actions manages the server-side encryption Worker Secrets. On the first deployment, if the target Worker has no encryption Secret, the workflow generates a random 32-byte AES key, injects it as an independent versioned Secret, and records the active key ID. Normal later deployments only check that the Secrets exist; they never regenerate, overwrite, or rotate them. Existing `EDGECHAT_ENCRYPTION_KEYRING` JSON keyrings remain supported and are preserved as-is.

Messages written and attachments uploaded after deployment are encrypted automatically. Existing D1 messages and R2 objects are left untouched, while reads remain compatible with both legacy plaintext and new ciphertext. No Cron job, scheduled task, or deployment script loops through all historical data to encrypt it.

To provide a key manually, create a GitHub Repository Secret named `EDGECHAT_ENCRYPTION_KEYRING`:

```json
{"activeKeyId":"v1","keys":{"v1":"BASE64_ENCODED_32_BYTE_KEY"}}
```

The first deployment uses this value directly. To rotate an existing Worker automatically and incrementally, manually run `Deploy Worker` with `rotate_encryption_key` enabled. The workflow adds one new versioned key Secret and switches the active key ID, while every old Secret and legacy JSON keyring stays unchanged. New messages use the new active key and old ciphertext continues to resolve its own key ID.

`apply_encryption_keyring` is the backup manual override. When using it, the Repository Secret must contain the complete JSON keyring: retain every old key ID still referenced by ciphertext, add the new key, and update `activeKeyId`. Removing an old key makes the corresponding historical ciphertext permanently unreadable. Do not enable `apply_encryption_keyring` and `rotate_encryption_key` in the same run.

This is server-side encryption at rest, not end-to-end encryption. The Worker decrypts content after session authorization, so the Cloudflare Worker runtime and the operator controlling the key remain inside the trust boundary. As a related privacy change, the admin message search and full-conversation pages and APIs have been removed; aggregate counts remain available.

### Manual Deployment

If you prefer local manual deployment, see the documentation site for the full steps, resource preparation, and notes:

- Manual deployment guide: <https://echat.azora.top/guide/getting-started.html>
- Documentation home: <https://echat.azora.top/>
- Docker local deployment: [DOCKER.md](DOCKER.md)

## Quick Start

### Install Dependencies

```bash
npm install
```

### Frontend Development

```bash
npm run dev:frontend
```

### Local Build

```bash
npm run build
```

### Local Manual Release

```bash
npm run deploy
```

In non-interactive environments, set `CLOUDFLARE_API_TOKEN` before deployment.

The admin update check records the current GitHub repository, branch, and commit at build time. For accurate results, manual deployments should be built from a clean Git commit that has already been pushed. The source repository must be public so the browser can call the GitHub Compare API directly. This process does not create scheduled tasks.

PowerShell example:

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token"
npm run deploy
```

## Project Structure

```text
edgechat/
|- assets/
|  `- previews/
|     |- chat-home.png
|     `- admin-dashboard.png
|- frontend/
|  |- src/
|  |  |- api.js
|  |  |- router.js
|  |  |- store.js
|  |  |- ws.js
|  |  |- styles.css
|  |  |- components/ui/
|  |  `- pages/
|  `- vite.config.js
|- worker/
|  |- schema.sql
|  |- migrations/
|  `- src/
|     |- index.js
|     |- auth.js
|     |- db.js
|     |- middleware.js
|     |- utils.js
|     |- api/
|     `- do/
|- wrangler.toml
|- package.json
|- README.md
|- README.en.md
`- LICENSE
```

For more implementation details, see [TECHNICAL.md](TECHNICAL.md) and the documentation site: <https://echat.azora.top/>

## Contributing

Issues and pull requests are welcome. Help improve EdgeChat together.

## Contributors

Thanks to everyone who has contributed to the project:

[![Contributors](https://contrib.rocks/image?repo=gdz66601/Edgechat)](https://github.com/gdz66601/Edgechat/graphs/contributors)

## Acknowledgements

Thanks to <a href="https://linux.do" target="_blank">linux do</a> for helping promote this project.

## License

This project uses `GNU GPL v3.0 or later`.

You may use, modify, and distribute this project. If you distribute a modified version, you must continue to provide the corresponding source code and keep it GPL-compatible.
