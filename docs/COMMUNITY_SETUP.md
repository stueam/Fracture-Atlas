# Community 接入与验收

本版完成网站页面、数据库迁移、权限事务、附件验证函数及自动测试。**尚未创建或连接真实 Supabase 项目，也未完成真实 GitHub OAuth、Storage、Edge Function 端到端验收。** 未配置后端时，网站显示“Submissions are not open yet”，允许浏览表单，禁用登录、保存和提交。

## 0. 第一次接入，按这个顺序

1. 打开 [Supabase 控制台](https://supabase.com/dashboard)，在公司组织下新建项目，建议名称 `fracture-atlas`；保存数据库密码，选择适合主要用户的区域。先用 staging 验收再接生产。
2. 在项目 Connect / Settings 中找到 Project URL、Project Ref 和 API publishable key。`https://abcd.supabase.co` 中的 `abcd` 即 Project Ref。这里只记录自己的真实值，不照抄占位符。
3. 在网站目录执行第 2 节迁移命令。成功后应看到 public 下的 submissions、publications 等表、private.reviewers，以及私有 Storage bucket `submission-evidence`。
4. 按第 3 节创建 GitHub **OAuth App**，推荐名称 `Fracture Atlas`，不勾选 Device Flow。将 Client ID 和 Client Secret 配到 Supabase 的 GitHub provider。
5. 按第 4 节配置 GitHub 仓库的三个 Actions Variables。到 Actions → Deploy Fracture Atlas to GitHub Pages → Run workflow，选择 `main`。仅修改变量不会自动重新构建。
6. 用两个不同 GitHub 账号登录网站，按第 5 节设置审核员并验证 TOTP，然后完成第 6 节的真实提交审核验收。

网站登录不使用当前电脑的 Git SSH key，也不需要访问用户仓库；GitHub 验证身份，Supabase 管理本站会话和数据访问权限。拥有这个 GitHub 仓库的写权限不会自动成为网站审核员。

| 信息                                   | 填到哪里                                               |
| -------------------------------------- | ------------------------------------------------------ |
| Supabase Project Ref                   | 本地 `supabase link --project-ref`                     |
| Supabase Project URL                   | 仓库 Variable `VITE_SUPABASE_URL`                      |
| Supabase publishable key               | 仓库 Variable `VITE_SUPABASE_PUBLISHABLE_KEY`          |
| GitHub OAuth Client ID / Client Secret | Supabase Authentication → Sign In / Providers → GitHub |
| 数据库密码                             | 仅本地 CLI 提示需要时输入；不放到前端                  |
| 服务端 service-role / secret key       | 仅后端环境；不放到任何 `VITE_` 变量                    |

两个重定向的方向如下：

```text
网站 → GitHub 授权 → Supabase /auth/v1/callback → 网站根路径 → Account / 原页面
```

GitHub 的 callback 为 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`；Supabase 的 Site URL / Redirect URL 为 `https://stueam.github.io/Fracture-Atlas/`。正式值以项目控制台显示为准，不加 `#/account`。

## 1. 已实现的范围

| 入口                           | 功能                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `#/community`                  | Results / Benchmarks / Methods 分类、标题检索、分页  |
| `#/community/publications/:id` | 公开详情、版本历史、精确协议引用、benchmark 下结果图 |
| `#/submit`                     | 四步表单、JSON 模板、JSON/CSV 导入、私有证据上传     |
| `#/account`                    | GitHub PKCE 登录、退出、审核员 TOTP 设置和验证       |
| `#/account/submissions`        | 本人草稿、提交状态、反馈入口                         |
| `#/submissions/:id`            | 反馈与修订历史、附件、撤回、创建更新版本             |
| `#/admin/reviews`              | 审核队列、领取、释放、退回、拒绝、批准发布           |

论文快照及其 Results、Costs、Diagnostics 保持原数据来源。Community 通过 API 读取已批准记录，不会回写论文数据。

结果图按精确的 benchmark publication ID 展示，保留模型版本、样本数、重复次数和聚合方式。它是描述性展示，不是总榜。增益只来自该条结果中作者明确声明匹配的 baseline；每条的完整条件可在详情页查看。没有自动授予 Reproduced 标签。

## 2. 创建后端并应用迁移

使用公司控制的 Supabase 项目。建议先在独立 staging 项目验收，再连接生产。项目 ref 来自控制台；不要把数据库密码或任何 service-role/secret key 写到仓库、Pages variables 或聊天里。

在网站根目录执行以下命令（Supabase CLI 可通过官方 npm 包运行）：

```powershell
Set-Location C:\Users\18041\Desktop\fracture-atlas
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy validate-evidence
npx supabase secrets set ALLOWED_ORIGINS=https://stueam.github.io
```

这里连接托管项目，不需要启动本地 Docker 数据库。`db push --dry-run` 用于先确认待执行迁移；任何一步失败先处理该错误，不跳过继续开放前端。

迁移顺序为 `supabase/migrations/` 下的三个 SQL 文件。它们创建表、RLS、受限 RPC、私有 bucket 和配额记录。**不要在普通 Pages 构建中自动执行生产数据库迁移。** 本仓库没有设置后端自动部署。

`validate-evidence` 保持 `verify_jwt = true`，仅接受登录用户；函数还通过 `auth.getUser()` 验证用户，检查附件所有权，再以服务端权限写入验证结果。函数使用平台注入的 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`，部署后确认这些环境变量可用。前端只用公开的 publishable key 或旧版 anon key。

本地验证托管 staging 时，可将 `ALLOWED_ORIGINS` 设置为逗号分隔的精确 origin（例如生产 origin 与 `http://127.0.0.1:5173`）。不包含路径；生产不必保留本地 origin。

参照 [Supabase Functions 部署](https://supabase.com/docs/guides/functions/deploy)、[数据库迁移](https://supabase.com/docs/guides/deployment/database-migrations) 和 [函数鉴权](https://supabase.com/docs/guides/functions/auth)。

## 3. 配置 GitHub 登录

1. 创建公司控制的 GitHub OAuth App。
2. Homepage URL：`https://stueam.github.io/Fracture-Atlas/`。
3. GitHub 的 Authorization callback URL：从 Supabase GitHub provider 页面复制，通常为 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`。
4. 将 OAuth App 的 Client ID、Client Secret 填入 Supabase Authentication → Providers → GitHub，启用 provider。Secret 只在服务端配置。
5. Supabase Authentication → URL Configuration 的 Site URL 和允许的 Redirect URL 均设置为 `https://stueam.github.io/Fracture-Atlas/`。
6. 本地测试另加实际使用的精确地址，例如 `http://127.0.0.1:5173/`。不要将 URL 的 hash 路由填成 OAuth callback。
7. 在 Auth 的 MFA 配置中允许 TOTP enrollment 与 verification。

登录回到 Pages 根路径后，由前端交换 PKCE code 并跳回站内页面，不需要 Pages 服务端 callback。参考 [GitHub provider 配置](https://supabase.com/docs/guides/auth/social-login/auth-github) 与 [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)。

## 4. 本地连接与 Pages 配置

本地复制 `.env.example` 为 `.env.local`，填写：

```dotenv
VITE_COMMUNITY_ENABLED=true
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

`.env.local` 已忽略，不提交。重启开发服务器后生效。

```powershell
npm ci
npm run test:community
npm run check:data
npm run dev
```

在 GitHub 仓库 Settings → Secrets and variables → Actions → **Variables** 新增同名三个变量。URL 与 publishable key 会进入浏览器构建，这是设计行为；service-role key、secret key、数据库密码不能放进去。完成后手动重跑 Pages workflow 或推送一个前端提交。

`VITE_COMMUNITY_ENABLED=false` 会在下次构建后隐藏社区入口并关闭社区路由，但这不是数据库的暂停开关。若需暂停后端写入，应在 Supabase 撤销对应 RPC 的 authenticated 执行权限或部署维护迁移，保留公开读取和已收集数据。

## 5. 初始化审核员

先让至少两位受信任成员使用 GitHub 登录一次，在 Supabase Authentication → Users 核对用户 ID。在 Supabase SQL Editor 中执行（替换真实 UUID）：

```sql
insert into private.reviewers(user_id)
values ('REVIEWER_1_UUID'), ('REVIEWER_2_UUID')
on conflict do nothing;
```

审核员进入 Account → Verify with authenticator，手动将显示的 TOTP secret 加入自己的认证器，输入验证码完成验证。页面和数据库都要求 AAL2。不要把认证器 secret 发给其他人。需要为账户丢失认证器制定人工身份核验与恢复流程；此版不提供自助 MFA 重置。

撤销审核权限：

```sql
delete from private.reviewers where user_id = 'REVIEWER_UUID';
```

权限在每次数据库操作时实时核对，不依赖等待 JWT 过期。被撤权审核员已经领取的任务，可由另一审核员在详情页填写原因后回到队列。作者永远不能审核自己的提交；因此需要第二位审核员处理管理员自己提交的条目。

## 6. 上线前的真实验收

以下尚需在托管 staging 执行；本地 SQL 测试不能替代这些步骤：

1. 作者 A 从 Pages 登录，保存 benchmark 草稿，刷新恢复；用户 C 无法读取 A 的草稿、附件或修订记录。
2. 上传合法 PDF/JSON/CSV/PNG/JPEG；错误扩展名、格式、大小被拒绝；证据验证成功才能提交。
3. A 提交，审核员 B 在未验证 MFA 时无法读取其他人的私有内容；验证后领取、退回并写入内部备注。A 只看到公开反馈。
4. A 修订重交，B 批准，游客看到新的 benchmark；之后同样登记 method 和 result。不能自审，不能把直接修改状态作为发布方式。
5. A 提交已发布条目的更新；审核期间旧版仍公开，批准后显示当前版本，旧链接仍可追溯。
6. B 下架 benchmark；其所有版本及依赖结果从公开 API 消失，私有审计仍保留。
7. 重复点击批准不会生成第二份 publication。模拟过期登录、网络失败、双窗口保存冲突、附件验证重试、OAuth 回调失效。
8. 确认证据签名 URL 约 60 秒后过期，退出后不能取得新的 URL。已下载的文件无法撤回。
9. 在 staging 演练数据库与 Storage 对象的联合备份恢复，再开放邀请试用。

前端异常显示失败，不会生成假的成功记录。预览状态没有浏览器持久草稿，离开前应保存或自行下载内容；已登录草稿保存在云端。

## 7. 运行限制与后续工作

- 草稿/待办上限 20，待审上限 10，每人滚动 24 小时最多提交 5 次。
- 每个修订最多 5 个附件、总声明大小 25 MB，单文件 bucket 上限 10 MB；每人滚动 24 小时最多预留 25 个上传位置，每个按最高 10 MB 计，最多 250 MB。删除附件不返还当天配额。
- 附件格式和字节长度校验、SHA-256 已实现；**没有恶意软件扫描**。附件仅由作者和已验证 MFA 的审核员下载，不自动公开、不内嵌执行。后续接扫描服务后再考虑公开附件。
- JSON/CSV 导入首版只接受一个聚合记录；逐次运行日志作为证据附件。批量多行录入、论文条目自动转社区种子数据未实现。
- benchmark/method 先审核，再引用其 publication ID 登记结果。更新协议不会自动把旧结果迁移到新协议。
- 通知为站内状态与反馈；没有邮件、自动复现、自动运行上传代码、实时推送。
- 结果列表按最新发布排序，使用分页；大规模精细筛选、严格条件匹配的排行榜和任意多条并排比较后续扩展。
- 数据采用受校验的 JSON payload 与独立版本/引用关系；未把每种科研元数据全部拆成独立表。
- 已删除附件的对象仍可能占存储。`private.upload_reservations` 保留路径清单；生产应安排服务端清理超过保留期（建议至少 7 天）且已无 attachment 引用的对象，通过 **Storage API** 删除，不直接删除 `storage.objects` 数据库行。自动清理作业本版未部署。
- 容量、出站流量、Function 错误和审核积压需要在项目控制台监控。费用按实际 Supabase 方案及用量核对；本次没有开通付费资源。
- 将来做数据库升级时使用新增迁移；回退前端不要删现有表。数据库备份与 Storage 文件备份分别安排，恢复演练不能只恢复元数据。

## 8. 本地验证的范围

`npm run test:community` 在 PGlite 的 PostgreSQL 引擎内执行全部迁移，使用 auth/storage 的测试替身验证角色与 RLS、冻结修订、幂等批准、版本替换、配额、引用与下架，以及 JSON/CSV 和字段校验。测试没有向生产插入记录。

这不是 Supabase GoTrue、Storage HTTP、真实 OAuth 或 Edge Runtime 的集成测试。Docker daemon 当前不可用，未声称本地完整 Supabase 栈通过。正式开放前必须完成第 6 节。

## 9. 常见接入问题

| 现象                                | 先检查                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 仍显示 Submissions are not open yet | 三个 Variables 的名字和值是否正确；是否重新运行了完整 Pages workflow；浏览器是否载入新版本                           |
| GitHub 提示 redirect_uri 不匹配     | OAuth App 的 callback 应是 Supabase provider 给出的地址，而非 Pages URL                                              |
| 登录后跳到 localhost / 错误页面     | Supabase Site URL、Redirect URLs 与生产完整路径是否一致，包括 `/Fracture-Atlas/`                                     |
| PKCE code 失效                      | 在发起登录的同一个浏览器完成；重新从 Account 发起，不复用旧 callback 链接                                            |
| relation / function not found       | 是否向同一个 Supabase 项目执行了全部迁移；前端 URL 是否指向该项目                                                    |
| 附件验证 401                        | 登录会话是否过期；客户端 Authorization 应携带用户 session JWT，而不是把 publishable key 当用户 token；重新登录后再试 |
| 附件验证失败或网络错误              | `validate-evidence` 是否部署，Function 环境变量是否齐全，CORS origin 是否为 `https://stueam.github.io`               |
| 看不到审核队列 / 没有权限           | private.reviewers 中是否为该 Supabase 用户 UUID；是否已完成 TOTP 二次验证                                            |
| 自己的提交不能批准                  | 这是禁止自审规则，由另一个已验证 MFA 的审核员处理                                                                    |

不要为解决权限错误把 bucket 改成 public 或关闭 RLS。应核对具体会话、角色和迁移。参考 [函数 Authorization 与 apikey 的区别](https://supabase.com/docs/guides/functions/auth-headers) 及 [公开/服务端 API keys](https://supabase.com/docs/guides/getting-started/api-keys)。
