#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量打开书签 URL（HTTP GET），解析真实页面 <title> / Open Graph / meta description，
再调用 bookmark_tag_csv.build_three_tags 写入基于「线上元数据」的 3 个标签。

遵循 web-access：静态 HTML 元信息用 curl/urllib 即可；需登录或强反爬的站点会失败并回退到导出里的标题摘要。

用法:
  python3 bookmark_tag_live.py /path/to/bookmarks.csv -o /path/out.csv
  python3 bookmark_tag_live.py bookmarks.csv --delay 0.4 --limit 20   # 试跑前 20 条
"""

from __future__ import annotations

import argparse
import csv
import gzip
import re
import ssl
import threading
import time
import zlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from bookmark_tag_csv import build_three_tags


class _RateLimiter:
    """全局限流：任意时刻两次请求至少间隔 min_interval 秒（多线程安全）。"""

    def __init__(self, min_interval: float) -> None:
        self.min_interval = max(0.0, min_interval)
        self._lock = threading.Lock()
        self._next_allowed = 0.0

    def wait(self) -> None:
        if self.min_interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            if now < self._next_allowed:
                time.sleep(self._next_allowed - now)
            self._next_allowed = time.monotonic() + self.min_interval


UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
MAX_BODY = 600_000  # 只解析前若干字节，足够覆盖 <head> 与首屏
DEFAULT_TIMEOUT = 22


class _HeadMetaParser(HTMLParser):
    """只关心 head 内 meta 与 title；遇到 body 可提前结束标记。"""

    def __init__(self) -> None:
        super().__init__()
        self._in_title = False
        self.title_text: str = ""
        self._title_buf: list = []
        self.meta: Dict[str, str] = {}
        self._done = False

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        if self._done:
            return
        t = tag.lower()
        if t == "body":
            self._done = True
            return
        ad = {k.lower(): v for k, v in attrs}
        if t == "meta":
            prop = (ad.get("property") or ad.get("name") or "").lower()
            content = ad.get("content")
            if prop and content:
                self.meta[prop] = content.strip()
        elif t == "title":
            self._in_title = True
            self._title_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
            if self._title_buf:
                self.title_text = "".join(self._title_buf).strip()

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_buf.append(data)


def _decode_body(raw: bytes, content_type: str) -> str:
    charset = "utf-8"
    m = re.search(r"charset=([\w\-]+)", content_type, re.I)
    if m:
        charset = m.group(1).strip().strip('"').strip("'")
    for enc in (charset, "utf-8", "gb18030", "gbk", "latin-1"):
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode("utf-8", errors="replace")


def _maybe_decompress(raw: bytes, headers: str) -> bytes:
    h = headers.lower()
    if "gzip" in h:
        try:
            return gzip.decompress(raw)
        except OSError:
            pass
    if "deflate" in h:
        try:
            return zlib.decompress(raw)
        except zlib.error:
            try:
                return zlib.decompress(raw, -zlib.MAX_WBITS)
            except zlib.error:
                pass
    return raw


def fetch_page_meta(url: str, timeout: float = DEFAULT_TIMEOUT, retries: int = 1) -> Tuple[Dict[str, Any], str]:
    """
    返回 (meta_dict, status)。
    meta_dict 含 ok, title, description, site_name；失败时 ok=False，status 为原因简码。
    """
    if not url or not url.startswith(("http://", "https://")):
        return {"ok": False}, "bad_scheme"
    low = url.lower()
    if "localhost" in low or "127.0.0.1" in low or "0.0.0.0" in low:
        return {"ok": False}, "skip_local"
    last_err = "unknown"
    for attempt in range(retries + 1):
        try:
            req = Request(
                url,
                headers={"User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"},
            )
            ctx = ssl.create_default_context()
            with urlopen(req, timeout=timeout, context=ctx) as resp:  # noqa: S310
                status = getattr(resp, "status", 200)
                if status >= 400:
                    return {"ok": False}, f"http_{status}"
                ct = resp.headers.get("Content-Type", "")
                if "text/html" not in ct and "application/xhtml" not in ct and "text/plain" not in ct:
                    if "html" not in ct.lower():
                        return {"ok": False}, "not_html"
                raw = resp.read(MAX_BODY)
                enc_hdr = resp.headers.get("Content-Encoding", "")
                raw = _maybe_decompress(raw, enc_hdr)
                html = _decode_body(raw, ct)
            break
        except HTTPError as e:
            return {"ok": False}, f"http_{e.code}"
        except URLError as e:
            last_err = f"url_{e.reason!s}"[:40]
            if attempt < retries:
                time.sleep(0.8)
                continue
            return {"ok": False}, last_err
        except TimeoutError:
            last_err = "timeout"
            if attempt < retries:
                time.sleep(0.8)
                continue
            return {"ok": False}, "timeout"
        except OSError as e:
            # 含部分环境下 socket 超时
            if "timed out" in str(e).lower():
                last_err = "timeout"
                if attempt < retries:
                    time.sleep(0.8)
                    continue
                return {"ok": False}, "timeout"
            return {"ok": False}, f"err_{type(e).__name__}"
        except Exception as e:  # noqa: BLE001
            return {"ok": False}, f"err_{type(e).__name__}"

    p = _HeadMetaParser()
    try:
        p.feed(html)
        p.close()
    except Exception:  # noqa: BLE001
        pass

    og_title = p.meta.get("og:title", "")
    og_desc = p.meta.get("og:description", "")
    tw_title = p.meta.get("twitter:title", "")
    tw_desc = p.meta.get("twitter:description", "")
    desc = (
        og_desc
        or p.meta.get("description", "")
        or tw_desc
        or p.meta.get("twitter:description", "")
    )
    title = og_title or tw_title or p.title_text or ""
    site_name = p.meta.get("og:site_name", "") or p.meta.get("application-name", "")

    if not title and not desc:
        return {"ok": False}, "empty_meta"

    out: Dict[str, Any] = {
        "ok": True,
        "title": title[:500],
        "description": desc[:800],
        "site_name": site_name[:200],
    }
    return out, "ok"


def main() -> None:
    ap = argparse.ArgumentParser(description="根据真实网页 meta 为书签 CSV 写入 tags")
    ap.add_argument("input", help="输入 CSV（Karakeep 导出）")
    ap.add_argument("-o", "--output", default="", help="输出路径，默认同名 _live_tagged.csv")
    ap.add_argument("--delay", type=float, default=0.35, help="请求间隔秒，降低风控")
    ap.add_argument("--limit", type=int, default=0, help="仅处理前 N 条（0=全部）")
    ap.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="单次请求超时（秒）",
    )
    ap.add_argument(
        "--retries",
        type=int,
        default=1,
        help="失败/超时后重试次数",
    )
    ap.add_argument(
        "--status-col",
        action="store_true",
        help="增加列 fetch_status 记录抓取状态",
    )
    ap.add_argument(
        "--workers",
        type=int,
        default=6,
        help="并发抓取线程数（全局限流仍由 --delay 控制）",
    )
    ap.add_argument(
        "--out-dir",
        default="",
        help="输出目录：自动写入 tagged_full.csv、failed_unreachable.csv、summary.txt，并附带 fetch_status",
    )
    ap.add_argument(
        "--split-failed",
        action="store_true",
        help="额外写出仅含抓取失败/不可达行的 CSV（默认路径为主输出同目录 failed_unreachable.csv）",
    )
    args = ap.parse_args()
    inp = args.input

    out_dir = (args.out_dir or "").strip()
    split_failed = bool(args.split_failed) or bool(out_dir)
    if out_dir:
        od = Path(out_dir).expanduser().resolve()
        od.mkdir(parents=True, exist_ok=True)
        out = str(od / "tagged_full.csv")
        failed_out = str(od / "failed_unreachable.csv")
        summary_path = str(od / "summary.txt")
        want_status = True
    else:
        out = args.output or (inp.rsplit(".", 1)[0] + "_live_tagged.csv")
        failed_out = ""
        summary_path = ""
        want_status = bool(args.status_col) or split_failed
        if split_failed and not failed_out:
            base = Path(out)
            failed_out = str(base.parent / (base.stem + "_failed_unreachable" + base.suffix))

    with open(inp, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if args.limit:
        rows = rows[: args.limit]
    if not rows:
        print("输入 CSV 无数据行，退出。")
        return

    fieldnames = list(rows[0].keys()) if rows else []
    if "tags" not in fieldnames:
        fieldnames.append("tags")
    if want_status and "fetch_status" not in fieldnames:
        fieldnames.append("fetch_status")

    limiter = _RateLimiter(args.delay)
    workers = max(1, args.workers)

    def process_one(idx: int, row: Dict[str, str]) -> Tuple[int, str, str, bool]:
        limiter.wait()
        url = (row.get("url") or "").strip()
        live, st = fetch_page_meta(
            url,
            timeout=args.timeout,
            retries=max(0, args.retries),
        )
        ok = bool(live.get("ok"))
        tags = build_three_tags(row, live_meta=live if ok else None)
        return idx, tags, st, ok

    n_ok = 0
    n_skip = 0
    if workers == 1:
        results: List[Optional[Tuple[str, str, bool]]] = []
        for i, row in enumerate(rows):
            _, tags, st, ok = process_one(i, row)
            if ok:
                n_ok += 1
            else:
                n_skip += 1
            row["tags"] = tags
            if want_status:
                row["fetch_status"] = st
            if (i + 1) % 50 == 0:
                print(f"... {i+1}/{len(rows)} live_ok={n_ok} fallback={n_skip}", flush=True)
    else:
        print(
            f"并发 {workers}，全量 {len(rows)} 条，限流间隔 {args.delay}s …",
            flush=True,
        )
        out_tags: List[str] = [""] * len(rows)
        out_status: List[str] = [""] * len(rows)
        out_ok: List[bool] = [False] * len(rows)
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(process_one, i, rows[i]): i for i in range(len(rows))}
            done = 0
            for fut in as_completed(futs):
                idx, tags, st, ok = fut.result()
                out_tags[idx] = tags
                out_status[idx] = st
                out_ok[idx] = ok
                done += 1
                if ok:
                    n_ok += 1
                else:
                    n_skip += 1
                if done % 50 == 0 or done == len(rows):
                    print(
                        f"... {done}/{len(rows)} live_ok={n_ok} fallback={n_skip}",
                        flush=True,
                    )
        for i, row in enumerate(rows):
            row["tags"] = out_tags[i]
            if want_status:
                row["fetch_status"] = out_status[i]

    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"完成: {len(rows)} 条 → {out}")
    print(f"抓取成功: {n_ok}，回退仅用导出字段: {n_skip}")

    if split_failed and failed_out:
        bad = [r for r in rows if (r.get("fetch_status") or "") != "ok"]
        with open(failed_out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(bad)
        print(f"失败/不可达单独文件: {len(bad)} 条 → {failed_out}")
    if summary_path:
        lines = [
            f"输入: {inp}",
            f"主输出: {out}",
            f"总行数: {len(rows)}",
            f"live 抓取成功: {n_ok}",
            f"回退(仅用导出字段): {n_skip}",
        ]
        if split_failed and failed_out:
            bad_n = sum(1 for r in rows if (r.get("fetch_status") or "") != "ok")
            lines.append(f"失败/不可达: {bad_n} 条 → {failed_out}")
        lines.append("")
        Path(summary_path).write_text("\n".join(lines), encoding="utf-8")
        print(f"摘要: {summary_path}")


if __name__ == "__main__":
    main()
