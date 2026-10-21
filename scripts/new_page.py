#!/usr/bin/env python3
"""在某个模块下新建一篇文章的骨架。

用法：
    python3 scripts/new_page.py "装饰器与闭包" --path python/basics --slug decorators
    make new TITLE="装饰器与闭包" PATH=python/basics SLUG=decorators
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

TEMPLATE = """---
title: {title}
description: {description}
---

{lead}

## 第一节

正文从这里开始。
"""


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main() -> int:
    parser = argparse.ArgumentParser(description="新建一篇模块文章")
    parser.add_argument("title", help="文章标题")
    parser.add_argument("--path", required=True, help="模块目录，如 python/basics")
    parser.add_argument("--slug", help="文件名（英文，短横线分隔）")
    parser.add_argument("--description", default="TODO: 一句话说清楚这篇文章讲什么")
    parser.add_argument("--lead", default="开头两三句话：为什么写这篇、读完能带走什么。")
    args = parser.parse_args()

    slug = args.slug or slugify(args.title)
    if not slug:
        print("请用 --slug 指定英文文件名", file=sys.stderr)
        return 1

    target_dir = DOCS / args.path
    if not target_dir.is_dir():
        print(f"目录不存在：{target_dir}", file=sys.stderr)
        return 1

    path = target_dir / f"{slug}.md"
    if path.exists():
        print(f"文件已存在：{path}", file=sys.stderr)
        return 1

    path.write_text(
        TEMPLATE.format(
            title=args.title,
            description=args.description,
            lead=args.lead,
        ),
        encoding="utf-8",
    )
    print(f"已创建 {path.relative_to(ROOT)}")
    print("记得在模块的 index.md 里加一条链接，预览：make serve")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
