# Fracture Atlas · 能力适配图谱

Fracture 论文的交互式研究网站。围绕 **Can adaptation substitute for model scale?** 展示任务、方法、模型版本、成本和诊断证据。

- 网站名：**Fracture Atlas**
- 仓库名：**fracture-atlas**
- 建议远端：`AetherHeart-AI/fracture-atlas`（尚未创建或推送）
- 默认语言：英文；文案与任务描述集中在页面和 `src/data.ts`。
- 技术栈：React、TypeScript、Vite，原生 SVG 图表，静态 JSON 数据。

## 本地运行

需要 Node.js 22.12+ 或兼容的更新版本；数据导入与校验使用 Python 3。

```powershell
cd C:\Users\18041\Desktop\fracture-atlas
npm install
npm run dev
```

按终端输出的地址打开网页。`npm run build` 生成 `dist/`；`npm run preview` 可检查生产构建。无需数据库或后端服务。

## 页面

| 页面        | 路由                 | 已有功能                                                                |
| ----------- | -------------------- | ----------------------------------------------------------------------- |
| Overview    | `#/`                 | 核心问题、真实结果图、研究范围与入口                                    |
| Results     | `#/results`          | 精确模型版本、任务搜索、能力筛选、排序、报告分数/匹配增益切换、记录侧栏 |
| Benchmarks  | `#/benchmarks`       | 16 个任务索引、通用/发现任务筛选                                        |
| Task detail | `#/benchmarks/:slug` | 方法覆盖、模型基线与前沿参考、实验来源                                  |
| Costs       | `#/costs`            | 原生指标/成本散点图、阶段明细、适配成本分配区间                         |
| Diagnostics | `#/diagnostics`      | FinQA 诊断回放、规则/样本组切换、12 个 SFT 配对比较                     |
| Paper       | `#/paper`            | PDF、数据下载、Git 源文件与哈希溯源                                     |

## 数据来源与更新

首版固定到 Fracture 的 Git 提交 `034b9776d56a4d6ccde317028393f8cb4d7a08d1`。默认导入 `../Fracture` 中该提交的 Git 对象，**不修改原研究仓库的工作区、分支或未提交内容**。

```powershell
npm run sync:data
npm run check:data
```

也可以指定仓库和提交：

```powershell
python scripts/sync_data.py --repo C:\path\to\Fracture --ref COMMIT_SHA
```

数据更新涉及论文指标版本时，要同时复核数据校验中的审计端点与计数。`public/data/study.json` 包含来源路径和 SHA-256；诊断部分保留原始统计量及少量轨迹示例。全部诊断轨迹可通过来源链接查看。`public/paper.pdf` 是同一提交的论文文件。

## 展示约定

1. 报告分数是描述性端点，不能自动解释为适配增益。匹配增益只使用任务、精确模型版本、方法、端点分数和轨迹一致的控制记录。
2. Qwen3.6-27B 与 Qwen3.8-27B 独立展示，缺失结果不借用其他版本补齐。
3. 缺失和排除状态保留；不当作零分。发现任务使用原生 Quality 指标，不与百分比平均成总榜。
4. FinQA 规则回放标注为事后诊断，不混入正式适配分数。
5. 成本仅展示来源所记录的费用，保留估计、合并阶段、分配区间和缺失项；不推测人工/基础设施成本。

## 目录与部署

`src/pages/` 放页面，`src/components/` 放公共 UI，`src/data.ts` 放类型、任务元数据与匹配逻辑，`scripts/` 放数据导入和校验。

采用 hash 路由和相对资源路径，可部署到 GitHub Pages 子目录或其他静态托管服务。首次部署前设置正式域名、社交预览元信息和研究资源访问策略。当前只初始化本地项目，未创建远端仓库或公开发布。字体通过 Google Fonts 加载；网络不可用时使用系统字体。

后续细化事项见 `docs/ROADMAP.md`。
