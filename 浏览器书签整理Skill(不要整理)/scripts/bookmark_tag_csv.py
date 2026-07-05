#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为 Karakeep/浏览器导出的 CSV 书签生成每行 3 个中文标签（域名 + 文件夹 + 内容关键词）。"""

import csv
import re
from typing import Optional, List
from urllib.parse import urlparse, unquote

# ---------- 文件夹 → 1 个稳定分类标签 ----------
FOLDER_TAG = {
    "Unsorted": "待整理",
    "1_Identity / 证件": "移民签证",
    "2_Creation / 目标管理": "OKR目标",
    "2_Creation / 编程": "编程开发",
    "3_Life / 社交": "社交网络",
    "3_Life / 邮件": "邮件",
    "4_Learning / 教程": "教程学习",
    "4_Learning / 职业发展": "职业发展",
    "4_Learning / 语言考试": "语言考试",
    "5_Work / beike": "贝壳工作",
    "5_Work / shopee": "Shopee工作",
    "5_Work / xiaomi": "小米工作",
    "6_Resources / AI生成": "AI工具",
    "6_Resources / Crypto": "加密货币",
    "6_Resources / Portfolio": "作品集",
    "6_Resources / 其他": "综合资源",
    "6_Resources / 开发代码": "开发资源",
    "6_Resources / 媒体下载": "媒体下载",
    "6_Resources / 独立开发": "独立开发",
    "6_Resources / 文档协作": "文档协作",
    "6_Resources / 样机素材": "样机素材",
    "6_Resources / 设计工具": "设计工具",
    "6_Resources / 设计灵感": "设计灵感",
    "6_Resources / 设计系统": "设计系统",
    "6_Resources / 网络代理": "网络代理",
}

# ---------- 域名 → 站点本质标签（优先匹配最长后缀）----------
DOMAIN_TAGS = {
    "localhost": ("本地服务", "开发调试"),
    "shuzijumin.com": ("数字移民", "论坛社区"),
    "uuzi.net": ("兔哥博客", "流媒体教程"),
    "immi.homeaffairs.gov.au": ("澳洲内政部", "签证移民"),
    "online.immi.gov.au": ("澳洲移民", "在线申请"),
    "irishimmigration.ie": ("爱尔兰移民", "居留盖章"),
    "lalu.app": ("啦噜", "澳洲移民资讯"),
    "js.flyabroad.com.hk": ("飞出国", "加拿大省提名"),
    "1point3acres.com": ("一亩三分地", "移民留学"),
    "adesignaward.com": ("A设计奖", "工业设计"),
    "perdoo.com": ("Perdoo", "OKR软件"),
    "atlassian.com": ("Atlassian", "敏捷OKR"),
    "atlassian.net": ("Confluence", "团队文档"),
    "jqlsearchextensions.atlassian.net": ("OKRs for Jira", "Jira插件"),
    "studio.glassnode.com": ("Glassnode", "链上数据"),
    "solscan.io": ("Solscan", "Solana浏览器"),
    "cryptojobslist.com": ("Web3招聘", "区块链求职"),
    "github.com": ("GitHub", "开源代码"),
    "etherscan.io": ("Etherscan", "以太坊浏览器"),
    "linkedin.com": ("LinkedIn", "职业社交"),
    "twitter.com": ("X推特", "社交媒体"),
    "x.com": ("X推特", "社交媒体"),
    "xiaohongshu.com": ("小红书", "生活方式"),
    "douyin.com": ("抖音", "短视频"),
    "youtube.com": ("YouTube", "视频平台"),
    "ssstwitter.com": ("推文视频下载", "下载工具"),
    "outlook.live.com": ("Outlook", "邮箱"),
    "discord.com": ("Discord", "语音社区"),
    "facebook.com": ("Facebook", "社交网络"),
    "instagram.com": ("Instagram", "图片社交"),
    "weibo.com": ("微博", "社交媒体"),
    "hackquest.io": ("HackQuest", "Web3学习"),
    "atomicdesign.bradfrost.com": ("Atomic Design", "设计方法论"),
    "sites.google.com": ("Google协作平台", "企业文档"),
    "designcode.io": ("Design+Code", "设计课程"),
    "zh.rask.ai": ("Rask AI", "视频配音"),
    "himalayas.app": ("Himalayas", "远程招聘"),
    "pafolios.com": ("Pafolios", "设计案例库"),
    "liaoxuefeng.com": ("廖雪峰", "Python教程"),
    "yuque.com": ("语雀", "知识文档"),
    "stock.hostmonit.com": ("主机监控", "VPS库存"),
    "freecodecamp.org": ("freeCodeCamp", "编程学习"),
    "notion.site": ("Notion", "知识库"),
    "screen.studio": ("Screen Studio", "Mac录屏"),
    "dive.club": ("Dive Club", "设计师学习"),
    "suvoray.com": ("Suvo Ray", "设计作品集"),
    "docs.google.com": ("Google文档", "在线文档"),
    "drive.google.com": ("Google云端硬盘", "云存储"),
    "figma.com": ("Figma", "UI设计"),
    "framer.com": ("Framer", "建站设计"),
    "dribbble.com": ("Dribbble", "设计灵感"),
    "behance.net": ("Behance", "创意作品"),
    "medium.com": ("Medium", "技术写作"),
    "zhuanlan.zhihu.com": ("知乎专栏", "长文"),
    "jianshu.com": ("简书", "写作平台"),
    "uisdc.com": ("优设", "设计文章"),
    "woshipm.com": ("人人都是产品经理", "产品文章"),
    "zcool.com.cn": ("站酷", "设计社区"),
    "ui.cn": ("UI中国", "界面设计"),
    "codepen.io": ("CodePen", "前端演示"),
    "confluence.shopee.io": ("Shopee Confluence", "内部文档"),
    "wiki.lianjia.com": ("贝壳Wiki", "内部知识库"),
    "github.io": ("GitHub Pages", "静态站点"),
    "gumroad.com": ("Gumroad", "数字商品"),
    "bento.me": ("Bento", "个人链接页"),
    "ui8.net": ("UI8", "设计素材"),
    "issuu.com": ("Issuu", "电子出版"),
    "invisionapp.com": ("InVision", "设计协作"),
    "uxdesign.cc": ("UX Collective", "UX文章"),
    "mp.weixin.qq.com": ("微信公众号", "文章"),
    "docs.qq.com": ("腾讯文档", "协作"),
    "google.com.hk": ("Google", "搜索"),
    "google.com": ("Google", "搜索"),
    "ahhhhfs.com": ("A姐分享", "资源导航"),
    "beforweb.com": ("优设前身", "设计文章"),
    "xueui.cn": ("学UI网", "UI教程"),
    "figmacn.com": ("Figma汉化", "插件社区"),
    "uplabs.com": ("UpLabs", "UI灵感"),
    "yannglt.com": ("Yann Gilquin", "设计"),
    "stoodnt.com": ("Stoodnt", "留学资讯"),
    "bilibili.com": ("哔哩哔哩", "视频社区"),
}

# 注册域（eTLD+1 近似）→ 品牌标签，用于未单独列 full host 的站点
BASE_BRAND = {
    "google.com": ("Google", "谷歌服务"),
    "framer.website": ("Framer", "托管站点"),
    "lianjia.com": ("链家", "贝壳系"),
    "ke.com": ("贝壳", "房产平台"),
    "shopee.io": ("Shopee", "内部系统"),
    "zhihu.com": ("知乎", "问答社区"),
    "baidu.com": ("百度", "中文搜索"),
    "qq.com": ("腾讯", "腾讯系"),
    "feishu.cn": ("飞书", "协作办公"),
    "microsoft.com": ("Microsoft", "微软"),
    "adobe.com": ("Adobe", "设计软件"),
    "apple.com": ("Apple", "苹果"),
    "notion.so": ("Notion", "知识库"),
    "webflow.io": ("Webflow", "无代码建站"),
    "producthunt.com": ("Product Hunt", "产品发现"),
    "freepik.com": ("Freepik", "设计素材"),
    "mixkit.co": ("Mixkit", "音视频素材"),
    "awwwards.com": ("Awwwards", "网页奖"),
    "material.io": ("Material Design", "设计规范"),
    "csdn.net": ("CSDN", "技术社区"),
    "jd.com": ("京东", "电商"),
    "tencent.com": ("腾讯", "互联网"),
    "sea.com": ("Sea集团", "互联网"),
    "garena.com": ("Garena", "游戏"),
    "miui.com": ("MIUI", "小米"),
    "gov.cn": ("中国政府网", "政务"),
    "edu.cn": ("教育网", "教育"),
}

# 关键词 → 第三个「主题」标签（从标题/摘要推断）
KW_RULES = [
    (r"figma|sketch|ui\s*kit|组件库", "UI组件"),
    (r"python|javascript|typescript|react|vue|node\.?js|前端|后端", "编程技术"),
    (r"okr|目标管理|关键结果", "OKR"),
    (r"签证|移民|pr|永居|护照", "签证移民"),
    (r"pte|ielts|托福|gre|雅思", "英语考试"),
    (r"web3|区块链|nft|defi|solidity|以太坊", "Web3"),
    # 须在通用「ai」之前，避免匹配 ECharts 等词中的子串
    (r"echarts|数据可视化|可视化实验室", "数据可视化"),
    (r"(?<![a-z])ai(?![a-z])|chatgpt|人工智能|机器学习|llm", "人工智能"),
    (r"salesforce|crm", "Salesforce"),
    (r"framer|webflow|建站", "无代码建站"),
    (r"录屏|屏幕录制|screen\s*record", "录屏工具"),
    (r"字体|typography|typeface", "字体排版"),
    (r"配色|color\s*system|色板", "色彩系统"),
    (r"动效|animation|motion", "动效设计"),
    (r"作品集|portfolio|案例", "作品集"),
    (r"招聘|求职|面试|remote\s*job", "求职招聘"),
    (r"教程|course|learn|指南", "教程"),
    (r"下载|downloader|mp4", "下载工具"),
    (r"stripe|paddle|支付|付款", "支付收款"),
    (r"打印机|printer", "办公IT"),
    (r"notion|语雀|文档", "知识文档"),
    (r"音乐|audio|daw|cubase|fl\s*studio", "音乐制作"),
    (r"antd|ant\s*design|蚂蚁设计", "Ant Design"),
]

GENERIC_SKIP = re.compile(
    r"^(bookmark|书签|收藏|null|undefined|the|and|for|with|video|watch|home|page)$",
    re.I,
)


def netloc_domain(url: str) -> str:
    try:
        p = urlparse(url)
        h = (p.netloc or "").lower()
        if ":" in h:
            h = h.split(":")[0]
        if h.startswith("www."):
            h = h[4:]
        return h
    except Exception:
        return ""


def registrable_host(host: str) -> str:
    """近似 eTLD+1，修正 .com.cn / .co.uk 等。"""
    h = (host or "").lower().strip()
    if not h:
        return ""
    if h.startswith("www."):
        h = h[4:]
    parts = [p for p in h.split(".") if p]
    n = len(parts)
    if n < 2:
        return h
    if parts[-1] == "cn" and n >= 3 and parts[-2] in (
        "com", "net", "org", "gov", "edu", "ac",
    ):
        return ".".join(parts[-3:])
    if parts[-1] == "uk" and n >= 3 and parts[-2] == "co":
        return ".".join(parts[-3:])
    if parts[-1] == "au" and n >= 3 and parts[-2] == "com":
        return ".".join(parts[-3:])
    if parts[-1] == "hk" and n >= 3 and parts[-2] == "com":
        return ".".join(parts[-3:])
    if parts[-1] == "tw" and n >= 3 and parts[-2] in ("com", "edu", "org"):
        return ".".join(parts[-3:])
    if parts[-1] == "jp" and n >= 3 and parts[-2] == "co":
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def domain_site_tags(host: str, path: str) -> List[str]:
    """返回 1–2 个站点标签。"""
    if not host:
        return ["网页链接"]
    # 精确匹配
    if host in DOMAIN_TAGS:
        t = DOMAIN_TAGS[host]
        return list(t) if isinstance(t, tuple) else [t]

    # 子域剥离后匹配主域
    parts = host.split(".")
    for n in range(len(parts)):
        sub = ".".join(parts[n:])
        if sub in DOMAIN_TAGS:
            t = DOMAIN_TAGS[sub]
            return list(t) if isinstance(t, tuple) else [t]

    # GitHub 仓库
    if host == "github.com" or host.endswith(".github.com"):
        segs = [s for s in path.strip("/").split("/") if s]
        if len(segs) >= 2:
            return ["GitHub", f"{segs[0]}/{segs[1]}"[:24]]
        return ["GitHub", "开源"]

    # Notion 公开页
    if "notion.site" in host or host == "notion.so":
        return ["Notion", "知识库"]

    reg = registrable_host(host)
    if reg in BASE_BRAND:
        t = BASE_BRAND[reg]
        return list(t) if isinstance(t, tuple) else [t]

    # 默认：用注册域主名作为品牌（避免 vis.baidu.com 误标成 vis）
    if reg and reg in DOMAIN_TAGS:
        t = DOMAIN_TAGS[reg]
        return list(t) if isinstance(t, tuple) else [t]

    label = reg.split(".")[0] if reg else (parts[0] if parts else host)
    if len(label) > 18:
        label = label[:16] + "…"
    # 首字母大写可读性
    label = label.replace("-", " ").title().replace(" ", "") if label.isascii() else label
    return [label, "网站"]


def keyword_tag(text: str) -> Optional[str]:
    if not text or len(text) < 3:
        return None
    t = text[:2000]
    for pat, label in KW_RULES:
        if re.search(pat, t, re.I):
            return label
    return None


def folder_primary(folder: str) -> str:
    return FOLDER_TAG.get(folder, re.sub(r"^\d+_[^_]+/\s*", "", folder) or "书签")


def build_three_tags(row: dict, live_meta: Optional[dict] = None) -> str:
    url = row.get("url") or ""
    title = (row.get("title") or "").strip()
    note = (row.get("note") or "").strip()
    excerpt = (row.get("excerpt") or "").strip()
    folder = row.get("folder") or ""

    host = netloc_domain(url)
    # 若传入 live_meta（真实抓取的页面标题/描述），优先参与关键词与主题判断
    lm = live_meta or {}
    if lm.get("ok") and (lm.get("title") or lm.get("description")):
        lt = (lm.get("title") or "").strip()
        ld = (lm.get("description") or "").strip()
        lsite = (lm.get("site_name") or "").strip()
        blob = f"{lt}\n{ld}\n{lsite}\n{title}\n{note}\n{excerpt}\n{url}\n{host}"
    else:
        blob = f"{title}\n{note}\n{excerpt}\n{url}\n{host}"
    path = unquote(urlparse(url).path or "")

    site_tags = domain_site_tags(host, path)
    fold_tag = folder_primary(folder)
    kw = keyword_tag(blob)

    # 组装顺序：站点 → 内容关键词（标题/URL/摘要）→ 你的文件夹分类
    out: list[str] = []
    for s in site_tags:
        s = s.strip()
        if s and s not in out:
            out.append(s)
        if len(out) >= 2:
            break

    if kw and kw not in out:
        out.append(kw)

    if fold_tag and fold_tag not in out:
        out.append(fold_tag)

    # 填满到 3 个
    if len(out) < 3:
        extra = keyword_tag(title) or keyword_tag(excerpt) or keyword_tag(url or "")
        if extra and extra not in out:
            out.append(extra)
    if len(out) < 3:
        if "youtube.com" in host or "youtu.be" in host:
            out.append("视频")
        elif "bilibili.com" in host:
            out.append("视频")
        elif fold_tag and fold_tag not in out:
            out.append(fold_tag)
        elif len(out) < 3:
            out.append("收藏")

    # 去重保序，取 3 个
    seen = set()
    final = []
    for x in out:
        if x not in seen:
            seen.add(x)
            final.append(x)
        if len(final) >= 3:
            break
    while len(final) < 3:
        final.append(fold_tag if fold_tag not in final else "资源")

    return ", ".join(final[:3])


def main():
    import argparse
    ap = argparse.ArgumentParser(description="为书签 CSV 写入 tags 列（每行 3 个中文标签）")
    ap.add_argument(
        "input",
        nargs="?",
        default="/Users/keanu/Downloads/6de11487-3fef-45ca-a0ed-6efba537f2cd.csv",
        help="输入 CSV 路径",
    )
    ap.add_argument(
        "-o",
        "--output",
        default="",
        help="输出 CSV（默认在输入文件名后加 _tagged）",
    )
    args = ap.parse_args()
    inp = args.input
    out = args.output or (inp.rsplit(".", 1)[0] + "_tagged.csv" if "." in inp else inp + "_tagged.csv")
    with open(inp, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys()) if rows else []
    if "tags" not in fieldnames:
        fieldnames.append("tags")
    for row in rows:
        row["tags"] = build_three_tags(row)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} rows to {out}")


if __name__ == "__main__":
    main()
