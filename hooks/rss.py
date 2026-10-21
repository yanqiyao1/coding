"""生成 RSS：收集带 date 的页面，构建结束后写 feed.xml。"""

import html
import pathlib
from email.utils import format_datetime
from datetime import datetime, timezone

_items = []


def _sort_key(item):
    return item["date"]


def on_page_context(context, page, config, nav):
    meta = page.meta or {}
    raw = meta.get("date")
    if not raw:
        return context
    if isinstance(raw, datetime):
        dt = raw
    else:
        try:
            dt = datetime.fromisoformat(str(raw))
        except ValueError:
            return context
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    _items.append(
        {
            "title": page.title or config["site_name"],
            "url": config["site_url"].rstrip("/") + "/" + page.url,
            "date": dt,
            "summary": meta.get("description", ""),
            "tags": meta.get("tags", []),
        }
    )
    return context


def on_post_build(config):
    if not _items:
        return

    site_url = config["site_url"].rstrip("/") + "/"
    now = datetime.now(timezone.utc)
    entries = []
    for item in sorted(_items, key=_sort_key, reverse=True):
        summary = html.escape(item["summary"])
        entries.append(
            f"""  <item>
    <title>{html.escape(item["title"])}</title>
    <link>{item["url"]}</link>
    <guid isPermaLink="true">{item["url"]}</guid>
    <pubDate>{format_datetime(item["date"])}</pubDate>
    <description>{summary}</description>
  </item>"""
        )

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>{html.escape(config["site_name"])}</title>
  <link>{site_url}</link>
  <description>{html.escape(config.get("site_description", ""))}</description>
  <language>zh-CN</language>
  <lastBuildDate>{format_datetime(now)}</lastBuildDate>
  <atom:link href="{site_url}feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(entries)}
</channel>
</rss>
"""
    out = pathlib.Path(config["site_dir"]) / "feed.xml"
    out.write_text(xml, encoding="utf-8")
