# Coding 笔记

一个独立的编程博客，用 [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) 排版，GitHub Actions 自动构建，发布在 GitHub Pages 的项目路径下：

**<https://yanqiyao1.github.io/coding/>**

[![Deploy to GitHub Pages](https://github.com/yanqiyao1/coding/actions/workflows/deploy.yml/badge.svg)](https://github.com/yanqiyao1/coding/actions/workflows/deploy.yml)

它和学术主页（`yanqiyao1.github.io`）是两个完全独立的仓库，互不影响。

---

## 目录结构

```text
.
├── mkdocs.yml                  # 站点配置：主题、导航、插件、Markdown 扩展
├── requirements.txt            # 构建依赖（CI 和本地共用）
├── Makefile                    # 常用命令
├── scripts/new_post.py         # 新建文章的小脚本
├── .github/workflows/deploy.yml# GitHub Actions：构建并发布到 Pages
├── overrides/                  # 主题模板覆盖（不写死在主题里）
│   ├── partials/post.html      #   列表页的文章卡片
│   ├── blog.html               #   列表页按年份分组
│   ├── partials/content.html   #   文章页标题上方的元信息
│   └── partials/languages/zh.html #  更短的中文文案
└── docs/
    ├── index.md                # 首页
    ├── about/index.md          # 关于
    ├── 404.md                  # 404 页面
    ├── blog/
    │   ├── index.md            # 文章列表（插件会把文章追加在下面）
    │   ├── .authors.yml        # 作者信息
    │   └── posts/              # 所有文章
    ├── series/                 # 按主题组织的系列页
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
make new TITLE="gdb 的第一小时" SLUG=gdb-first-hour CATEGORY="系统与调试"
```

会生成 `docs/blog/posts/2026-10-20-gdb-first-hour.md`，文章地址是 `/coding/blog/2026/10/20/gdb-first-hour/`。

front matter 的字段：

| 字段 | 说明 |
| --- | --- |
| `date` | 发布日期，决定 URL 和排序 |
| `title` | 标题，同时用于页面 `<h1>` 和列表 |
| `slug` | URL 片段，**必须写**（中文标题无法自动转成 URL） |
| `authors` | 对应 `docs/blog/.authors.yml` 里的键 |
| `categories` | 分类，会自动生成分类页 |
| `description` | 摘要，用于 SEO 和分享卡片 |

正文里的 `<!-- more -->` 是摘要分隔符：它上面的内容会作为列表页的摘要，下面的是正文。

```markdown
---
date: 2026-10-20
title: 文章标题
slug: my-post
authors: [qiyao]
categories: [随笔]
description: 一句话说清楚这篇文章讲什么
---

开头两三句话。这段话会出现在文章列表里。

<!-- more -->

## 正文
```

写完后直接 `git push`，一分钟左右自动上线。

## 部署

`.github/workflows/deploy.yml` 干三件事：装依赖 → `mkdocs build --strict` → 把 `site/` 作为 Pages 产物发布。

首次配置只需要做一次（仓库已经配好的话可以跳过）：

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
2. 往 `main` 推一次，Actions 跑完即可

!!! note "为什么不用 gh-deploy 分支"

    `mkdocs gh-deploy` 会把构建产物推到 `gh-pages` 分支，历史里塞满编译结果。用官方的 Pages + Actions 流程，仓库里只有源码，产物不落盘。

## 想改点东西

| 想改什么 | 改哪里 |
| --- | --- |
| 站点名、描述、导航 | `mkdocs.yml` 顶部 / `nav:` |
| 主色、明暗方案 | `mkdocs.yml` 的 `theme.palette` |
| 颜色、字体、间距、首页样式 | `docs/stylesheets/extra.css` 顶部的设计变量 |
| 列表页的元信息（日期/分类/时长） | `overrides/partials/post.html` |
| 中文文案（如「阅读全文」） | `overrides/partials/languages/zh.html` |
| 文章列表每页条数 | `mkdocs.yml` 里 `blog.pagination_per_page` |
| 分类、年份归档 | `mkdocs.yml` 里 `blog.categories` / `blog.archive` |
| 首页 Hero 文案 | `docs/index.md` |
| 作者头像与简介 | `docs/blog/.authors.yml` |

### 加图片

放到 `docs/assets/images/`，然后：

```markdown
![说明](../assets/images/screenshot.png)
```

Material 支持图片缩放和标注，详见[官方文档](https://squidfunk.github.io/mkdocs-material/reference/images/)。

### 想用数学公式

现在没开（避免每个页面加载 MathJax）。需要时在 `mkdocs.yml` 的 `markdown_extensions` 里加：

```yaml
  - pymdownx.arithmatex:
      generic: true
```

再在 `extra_javascript` 里加载 MathJax 或 KaTeX 的脚本即可。

### 想要 RSS

Material 自带的 blog 插件不生成 RSS。需要的话加 [mkdocs-rss-plugin](https://github.com/Guts/mkdocs-rss-plugin)，在 `plugins:` 里注册并指向 `blog/posts`。

## 设计约定

样式只有一套逻辑，改之前先看一眼 `docs/stylesheets/extra.css` 顶部的变量：

- `--ink` / `--ink-2` / `--ink-3`：正文 / 次要文字 / 注释
- `--line`：所有分隔线，只有 1px
- `--brand`：唯一的强调色（链接、悬停）
- 页面结构：白底、无卡片、无阴影，层级只靠**细线 + 留白**
- 正文 16.4px / 行高 1.85；文章正文版心 640px（约 39 个汉字一行），列表和首页 720px
- 版心用 `px` 而不是 `rem`：Material 在宽屏把根字号设成 20px，`40rem` 其实是 800px，会偏宽

深色模式是同名的变量在 `[data-md-color-scheme="slate"]` 下重新赋值，改颜色时两边都要改。

## 一点约定

- 文章里的代码要真的能编译、能跑
- 性能数字要写清楚机器、编译选项、数据规模
- 引用外部结论时给链接，别只写「据说」

## License

文章内容版权归作者所有；站点配置和脚本可以随意取用。
