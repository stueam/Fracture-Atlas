# 部署到 GitHub Pages

网站仓库：https://github.com/stueam/Fracture-Atlas

默认发布地址：https://stueam.github.io/Fracture-Atlas/

## 首次开启

1. 使用仓库管理员账号打开 https://github.com/stueam/Fracture-Atlas/settings/pages 。
2. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。仓库已经包含部署工作流，无需另建模板。
3. 打开 https://github.com/stueam/Fracture-Atlas/actions ，选择 **Deploy Fracture Atlas to GitHub Pages**。
4. 点击 **Run workflow**，分支选择 **main**，再点击绿色 **Run workflow** 按钮。如果开启 Pages 前的运行已失败，选择 **Re-run all jobs** 也可以。
5. 等待 **build** 与 **deploy** 两个任务显示绿色勾。随后访问默认发布地址，或点击 **Settings → Pages → Visit site**。

发布前仅推送工作流不会替你开启仓库的 Pages 设置。若首次运行提示找不到 Pages site，请完成第 2 步后重新运行。

## 自动更新

工作流文件：`.github/workflows/deploy-pages.yml`。以后每次推送到 `main` 都会自动更新站点，也支持手动运行。

```powershell
cd C:\Users\18041\Desktop\fracture-atlas
git add .
git commit -m "Update website"
git push
```

GitHub Actions 使用 Node.js 24 和 `npm ci` 安装锁定依赖，校验仓库中已有的数据快照，然后运行：

```powershell
npm run build -- --base=/Fracture-Atlas/
```

部署的是构建生成的 `dist/`，无需把该目录提交，也无需建立 `gh-pages` 分支。工作流不连接原研究仓库；论文和数据由这个网站仓库中的固定快照提供。仅部署任务获得 Pages 写入和 OIDC 权限，无需手动填写 GitHub Token。

## 本地检查发布路径

```powershell
npm run build -- --base=/Fracture-Atlas/
npm run preview -- --base=/Fracture-Atlas/
```

访问终端给出的 `/Fracture-Atlas/` 地址。页面使用 hash 路由，例如 `/Fracture-Atlas/#/results`，适合 GitHub Pages 的静态托管。

## 常见问题

- **没有 Pages 选项或不能修改设置**：确认登录的是拥有仓库管理员或维护者权限的账号。
- **只有 README，没有网站**：Source 应选择 GitHub Actions；不要选择从 `main` 的根目录直接发布。
- **Actions 红色失败**：打开失败运行，查看红色步骤。Pages 未开启时先修改 Source，再重新运行。若提示 Actions 被禁用，需要在 Actions 页允许仓库运行工作流。
- **首页、图表或 PDF 404**：确认访问地址保留大小写正确的 `/Fracture-Atlas/` 路径，并检查工作流的构建 base 是否相同。
- **刚完成部署仍显示旧页面**：以 Pages 设置中显示的部署地址为准，稍等后刷新页面。

仓库目前为公开仓库，可以使用 GitHub Free 的 Pages。站点内容包括论文 PDF 和数据快照，发布后访客可直接下载。未来改成私有仓库时，需要另行确认账号计划对私有 Pages 的支持。

官方参考：[GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Vite 的 GitHub Pages 部署指南](https://vite.dev/guide/static-deploy.html#github-pages)。
