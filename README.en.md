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
- Group owner member management, plus admin access to any group or direct message history
- Real-time messaging, paginated history, message search, and file messages
- File uploads and avatar management
- Admin navigation for the dashboard, user management, registration invites, message inspection, and site settings
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
