<div align="center">
  <img src="Edgechat.png" alt="Edgechat 标志" />
</div>

[English README](README.en.md) · [GitHub 仓库](https://github.com/gdz66601/Edgechat) · [项目文档](https://echat.azora.top/) · [开源协议（GPL v3 或更高版本）](https://www.gnu.org/licenses/gpl-3.0)

> ***这可能是 1000 万以下最好用的 Cloudflare 聊天室***

EdgeChat 是一个部署在 Cloudflare 上的聊天系统，提供账号体系、公开群组、私有群组、私信、实时消息、文件上传和管理员后台，目标是在 Cloudflare 生态中以较低运维成本实现一套可直接落地的站内 IM。

本项目采用 `GPL-3.0-or-later` 协议，详见 [LICENSE](LICENSE)。

## 界面预览

<table>
  <tr>
    <td width="50%" align="center"><strong>聊天界面</strong></td>
    <td width="50%" align="center"><strong>管理后台</strong></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/previews/chat-home.png" alt="EdgeChat 聊天界面预览" width="100%" /></td>
    <td width="50%"><img src="assets/previews/admin-dashboard.png" alt="EdgeChat 管理后台预览" width="100%" /></td>
  </tr>
</table>

## 功能特性

- 管理员创建用户，不开放自助注册
- 支持公开群组、私有群组与私信会话
- 群主管理成员，管理员后台不提供群组或私信消息正文查看入口
- 支持实时消息、历史消息分页和文件发送
- 支持文件上传与头像管理
- 新写入的消息和新上传的附件使用 AES-256-GCM 服务端加密，历史数据不做批量回填
- 后台一级导航包含仪表盘、用户管理、注册邀请和网站设置
- 管理员可在网站设置中由浏览器直接比对源码仓库，检查当前部署是否有更新
- 现代化 Liquid Glass 风格界面，已适配移动端并支持基础无障碍能力
- 支持定时硬删除过期消息

## 技术栈

- 前端：Vue 3、Vue Router、Vite
- 后端：Cloudflare Workers、Hono
- 实时层：Durable Objects WebSocket Hibernation
- 数据库：Cloudflare D1
- 会话：Cloudflare KV
- 文件：Cloudflare R2
- 部署：Wrangler、GitHub Actions

## 部署

### GitHub Actions 自动部署

推荐优先使用 GitHub Actions 部署，适合长期维护和生产环境更新。

- 快速开始：<https://echat.azora.top/guide/getting-started.html>
- 详细教程：<https://echat.azora.top/guide/actions-deploy.html>

仓库内已提供 `.github/workflows/deploy-worker.yml`，推送到 `master` 或 `main`，或手动触发 `workflow_dispatch` 后即可执行自动部署。

### 隐私与服务端加密

GitHub Actions 会管理服务端加密 Worker Secrets。首次部署时，如果目标 Worker 尚无加密 Secret，工作流会自动生成随机 32 字节 AES 密钥，以独立的版本化 Secret 注入，并记录当前 active key ID；后续普通部署只检查这些 Secret 是否存在，不会重新生成、覆盖或轮换。生产环境已经存在的 `EDGECHAT_ENCRYPTION_KEYRING` JSON 密钥环也会被原样保留并继续兼容。

部署后新写入的消息正文和新上传的附件会自动加密。历史 D1 消息和 R2 附件保持原状，读取时同时兼容历史明文与新密文；项目不会通过 Cron、定时任务或部署脚本循环加密全部历史数据。

需要手动指定密钥时，可创建名为 `EDGECHAT_ENCRYPTION_KEYRING` 的 GitHub Repository Secret，格式如下：

```json
{"activeKeyId":"v1","keys":{"v1":"BASE64_ENCODED_32_BYTE_KEY"}}
```

首次部署会直接采用该值。已有 Worker 需要自动增量轮换时，手动运行 `Deploy Worker` 并勾选 `rotate_encryption_key`：工作流只新增一个版本化密钥 Secret，并把 active key ID 切换到新版本，所有旧 Secret 和旧 JSON 密钥环都保持不变。新消息会使用新 active key，旧密文继续使用各自信封中的 key ID 解密。

`apply_encryption_keyring` 是备用的手动覆盖入口。使用它时，Repository Secret 中必须是完整 JSON 密钥环，`keys` 需要保留所有仍被历史密文引用的旧 key ID，再增加新 key 并更新 `activeKeyId`。删除旧 key 会导致对应历史密文永久无法读取。`apply_encryption_keyring` 与 `rotate_encryption_key` 不能在同一次运行中同时启用。

这属于服务端静态加密，不是端到端加密。Worker 会在通过会话权限校验后解密内容，因此 Cloudflare Worker 运行环境和掌握密钥的部署方仍位于信任边界内。作为配套隐私调整，管理员后台的消息搜索与完整会话查看页面及其 API 已移除；管理员仍可看到消息数量等聚合统计。

### 手动部署

如果你希望本地手动部署，完整步骤、资源准备和注意事项请查看文档站教程：

- 手动部署教程：<https://echat.azora.top/guide/getting-started.html>
- 文档首页：<https://echat.azora.top/>
- Docker 本地部署：[DOCKER.md](DOCKER.md)

## 快速开始

### 安装依赖

```bash
npm install
```

### 前端开发

```bash
npm run dev:frontend
```

### 本地构建

```bash
npm run build
```

### 本地手动发布

```bash
npm run deploy
```

在非交互环境下部署时，需要提前设置 `CLOUDFLARE_API_TOKEN`。

后台更新检查会在构建时自动记录当前 GitHub 仓库、分支和提交。为了获得准确结果，手动部署应在 Git 仓库内基于已经推送的干净提交构建；源码仓库需要保持公开，浏览器才能直接调用 GitHub Compare API，整个过程不会创建定时任务。

PowerShell 示例：

```powershell
$env:CLOUDFLARE_API_TOKEN = "your-token"
npm run deploy
```

## 项目结构

```text
edgechat/
├─ assets/
│  └─ previews/
│     ├─ chat-home.png
│     └─ admin-dashboard.png
├─ frontend/
│  ├─ src/
│  │  ├─ api.js
│  │  ├─ router.js
│  │  ├─ store.js
│  │  ├─ ws.js
│  │  ├─ styles.css
│  │  ├─ components/ui/
│  │  └─ pages/
│  └─ vite.config.js
├─ worker/
│  ├─ schema.sql
│  ├─ migrations/
│  └─ src/
│     ├─ index.js
│     ├─ auth.js
│     ├─ db.js
│     ├─ middleware.js
│     ├─ utils.js
│     ├─ api/
│     └─ do/
├─ wrangler.toml
├─ package.json
├─ README.md
├─ README.en.md
└─ LICENSE
```

更多实现说明可查看 [TECHNICAL.md](TECHNICAL.md) 和文档站：<https://echat.azora.top/>

## 贡献

欢迎提交 Issue 和 Pull Request，一起完善 EdgeChat。

## 贡献者

感谢所有为项目提供帮助的贡献者：

[![贡献者](https://contrib.rocks/image?repo=gdz66601/Edgechat)](https://github.com/gdz66601/Edgechat/graphs/contributors)

## 鸣谢

感谢 <a href="https://linux.do" target="_blank">linux do</a> 在推广方面为本项目做出的贡献。

## 协议说明

本项目采用 `GNU GPL v3.0 or later`。

你可以使用、修改和分发本项目；如果你分发修改版本，需要继续提供对应源代码，并保持 GPL 兼容。
