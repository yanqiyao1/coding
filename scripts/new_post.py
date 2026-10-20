#!/usr/bin/env python3
"""生成一篇新博客文章的骨架。

用法：
    python3 scripts/new_post.py "gdb 的第一小时" --slug gdb-first-hour --category 系统与调试
    make new TITLE="gdb 的第一小时" SLUG=gdb-first-hour CATEGORY=系统与调试
"""

from __future__ import annotations

import argparse
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
POSTS = ROOT / "docs" / "blog" / "posts"

TEMPLATE = """---
date: {date}
title: {title}
slug: {slug}
authors: [qiyao]
categories: [{category}]
description: {description}
---

{lead}

<!-- more -->

## 第一节

正文从这里开始。删掉这一行和下面两行占位。
"""


def slugify(text: str) -> str:
    """把 ASCII 标题转成 URL 片段；中文标题请显式传 --slug。"""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug


def main() -> int:
    parser = argparse.ArgumentParser(description="新建一篇博客文章")
    parser.add_argument("title", help="文章标题")
    parser.add_argument("--slug", help="URL 片段（英文，短横线分隔）")
    parser.add_argument("--category", default="随笔", help="分类，默认「随笔」")
    parser.add_argument("--description", default="TODO: 一句话说清楚这篇文章讲什么")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    parser.add_argument("--lead", default="开头两三句话：为什么写这篇、读完能带走什么。")
    args = parser.parse_args()

    slug = args.slug or slugify(args.title)
    if not slug:
        print(
            "标题里没有可用的 ASCII 字符，请用 --slug 指定 URL 片段，例如 --slug hello-world",
            file=sys.stderr,
        )
        return 1

    POSTS.mkdir(parents=True, exist_ok=True)
    path = POSTS / f"{args.date}-{slug}.md"
    if path.exists():
        print(f"文件已存在：{path}", file=sys.stderr)
        return 1

    path.write_text(
        TEMPLATE.format(
            date=args.date,
            title=args.title,
            slug=slug,
            category=args.category,
            description=args.description,
            lead=args.lead,
        ),
        encoding="utf-8",
    )

    print(f"已创建 {path.relative_to(ROOT)}")
    print("预览：make serve   →   http://127.0.0.1:8000/coding/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
