# Coding 笔记

一个按模块整理的编程笔记站，用 [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) 排版，GitHub Actions 自动构建，发布在 GitHub Pages 的项目路径下：

**<https://yanqiyao1.github.io/coding/>**

[![Deploy to GitHub Pages](https://github.com/yanqiyao1/coding/actions/workflows/deploy.yml/badge.svg)](https://github.com/yanqiyao1/coding/actions/workflows/deploy.yml)

它和学术主页（`yanqiyao1.github.io`）是两个完全独立的仓库，互不影响。

---

## 四个模块

| 模块 | 内容 |
| --- | --- |
| **Python** | 基础（对象模型、迭代器、装饰器）→ PyTorch（tensor、autograd、训练循环）→ LLM 项目 |
| **C++** | 基础（对象模型、STL）→ 进阶（RAII、移动语义、并发） |
| **算法** | 按题型整理的 LeetCode 题解，统一 C++ |
| **LLM 手撕** | 面试要手写的组件：Attention、RoPE、KV Cache、Sampling |

## 目录结构

```text
.
├── mkdocs.yml                  # 站点配置：主题、导航、Markdown 扩展
├── requirements.txt            # 构建依赖（CI 和本地共用）
├── Makefile                    # 常用命令
├── scripts/new_page.py         # 新建文章的小脚本
├── .github/workflows/deploy.yml# GitHub Actions：构建并发布到 Pages
├── overrides/                  # 主题模板覆盖
│   ├── 404.html                #   404 页（静态模板，内容写死）
│   └── partials/
│       ├── content.html        #   正文容器
│       └── languages/zh.html   #   中文文案微调
└── docs/
    ├── index.md                # 首页
    ├── about/index.md          # 关于
    ├── python/
    │   ├── index.md            # 模块总览
    │   ├── basics/             #   基础
    │   ├── pytorch/            #   PyTorch
    │   └── llm-projects/       #   LLM 项目
    ├── cpp/
    │   ├── index.md
    │   ├── basics/
    │   └── advanced/
    ├── algo/
    │   ├── index.md            # 题型清单
    │   └── two-pointers.md     # 按题型一篇文章
    ├── llm-coding/
    │   ├── index.md            # 题目清单
    │   └── attention.md
    ├── stylesheets/extra.css   # 设计令牌与全部自定义样式
    ├── javascripts/            # Mermaid 按需加载
    └── assets/images/          # 图片放这里
```

## 本地开发

```bash
make install     # 创建 .venv 并安装依赖（第一次）
make serve       # 预览：http://127.0.0.1:8000/coding/
make build       # 构建到 site/，strict 模式
```

`make build` 是严格的：链接写错、页面没进导航、图片路径不对都会报错。CI 用的也是它，所以本地过了，线上一定能过。

## 写文章

```bash
make new TITLE="装饰器与闭包" PATH=python/basics SLUG=decorators
```

会生成 `docs/python/basics/decorators.md`，地址是 `/coding/python/basics/decorators/`。

front matter 只有两个字段：

| 字段 | 说明 |
| --- | --- |
| `title` | 标题，用于页面 `<h1>` 和导航 |
| `description` | 一句话摘要，用于 SEO 和分享卡片 |

正文结构：

```markdown
---
title: 装饰器与闭包
description: 一个装饰器到底包住了什么
---

开头两三句话：为什么写这篇、读完能带走什么。

## 第一节

正文。
```

写完后记得在**模块的 `index.md`** 里加一条链接，否则读者只能从 URL 进来。

新增一个模块目录时，还要在 `mkdocs.yml` 的 `nav:` 里加一项，否则 `--strict` 构建会报「页面不在导航中」。

## 部署

`.github/workflows/deploy.yml` 干三件事：装依赖 → `mkdocs build --strict` → 把 `site/` 作为 Pages 产物发布。

仓库设置里 **Settings → Pages → Source** 选 **GitHub Actions** 即可（已配置好）。往 `main` 推一次，一分钟左右上线。

## 想改点东西

| 想改什么 | 改哪里 |
| --- | --- |
| 站点名、描述、导航 | `mkdocs.yml` 顶部 / `nav:` |
| 主色、明暗方案 | `mkdocs.yml` 的 `theme.palette` |
| 颜色、字体、间距、卡片样式 | `docs/stylesheets/extra.css` 顶部的设计变量 |
| 首页 Hero 与四个模块入口 | `docs/index.md` |
| 404 页文案 | `overrides/404.html` |
| 中文文案（如「阅读全文」） | `overrides/partials/languages/zh.html` |

### 加图片

放到 `docs/assets/images/`，然后：

```markdown
![说明](../../assets/images/screenshot.png)
```

路径按当前文件位置算相对路径。

### 想用数学公式

现在没开（避免每个页面加载 KaTeX）。需要时在 `mkdocs.yml` 里加：

```yaml
markdown_extensions:
  - pymdownx.arithmatex:
      generic: true
```

再在 `extra_css` / `extra_javascript` 里引入 KaTeX 并调用 `renderMathInElement`。目前文章里的公式用 `text` 代码块写，够读。

## 设计约定

风格是「暖白纸感 + 珊瑚色 + 圆角卡片」。所有视觉决策都收在 `docs/stylesheets/extra.css` 顶部的变量里：

- `--cream` / `--surface` / `--surface-2`：页面底色、卡片、卡片内嵌块
- `--ink` / `--ink-2` / `--ink-3`：正文 / 次要 / 注释，都是暖灰棕，不用纯灰
- `--brand`：正文链接；`--brand-2`：按钮和装饰
- `--peach` / `--butter` / `--mint` / `--lilac`：标签和点缀色
- `--radius*` / `--shadow*`：圆角和阴影，卡片一律 22px 圆角

版式：

- 正文 17px / 行高 1.8；内容卡片 720px
- 版心用 `px` 而不是 `rem`：Material 在宽屏把根字号设成 20px，`40rem` 其实是 800px，会偏宽
- 深色模式：同名变量在 `[data-md-color-scheme="slate"]` 下重新赋值，Hero 和按钮各有一套单独规则

## 一点约定

- 文章里的代码要真的能编译、能跑
- 性能数字要写清楚机器、编译选项、数据规模
- 引用外部结论时给链接，别只写「据说」

## License

文章内容版权归作者所有；站点配置和脚本可以随意取用。
