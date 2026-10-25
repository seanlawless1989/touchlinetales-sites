#!/usr/bin/env python3
"""Build the touchlinetales.club blog from the HeyCatch API.

Writes blog/index.html and blog/<slug>/index.html as plain static pages,
adds the posts to sitemap.xml and shows or hides the "Blog" links on the
marketing pages (hidden while there are no articles).

The key is read from the HEYCATCH_API_KEY environment variable and is
never written to any file. In GitHub it comes from the repository secret
of the same name (see .github/workflows/blog.yml).

    HEYCATCH_API_KEY=... python3 tools/build_blog.py

Only the marketing site gets a blog. Never point this at a team or club folder.
"""

import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
SITE = "https://touchlinetales.club"
API = os.environ.get("HEYCATCH_API_BASE", "https://api.heycatch.ai/v1").rstrip("/")
CSS_VERSION = "10"

# Marketing pages that carry the "Blog" nav and footer links.
MARKETING_PAGES = [
    "index.html", "about/index.html", "changelog/index.html",
    "privacy/index.html", "dpa/index.html",
    "guides/share-results-with-parents/index.html",
    "guides/welfare-officer-checklist/index.html",
]

SLUG_OK = re.compile(r"^[a-z0-9][a-z0-9-]{0,120}$")
RTL = {"ar", "arc", "dv", "fa", "he", "ku", "ps", "sd", "ug", "ur", "yi"}


class ApiError(Exception):
    pass


# ---------------------------------------------------------------- API

def api_get(path, key, **params):
    params["key"] = key
    url = f"{API}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json",
                                               "User-Agent": "touchlinetales-blog-build"})
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt == 1:
                wait = min(int(e.headers.get("Retry-After", "5") or 5), 60)
                print(f"Rate limited, retrying in {wait}s")
                time.sleep(wait)
                continue
            if e.code == 404:
                return None
            if e.code == 401:
                raise ApiError("HeyCatch says the key is wrong (401). Check the HEYCATCH_API_KEY secret.")
            if e.code == 403:
                raise ApiError("HeyCatch refused the key (403): it was revoked or the project was deleted.")
            raise ApiError(f"HeyCatch returned HTTP {e.code} for {path}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            raise ApiError(f"Could not reach HeyCatch: {e}")
    raise ApiError("HeyCatch kept rate limiting us")


def fetch_articles(key):
    listed, offset = [], 0
    while True:
        page = api_get("/articles", key, limit=50, offset=offset) or {}
        batch = page.get("articles") or []
        listed += batch
        offset += 50
        if not batch or offset >= int(page.get("total") or 0):
            break
    articles = []
    for item in listed:
        slug = str(item.get("slug") or "")
        if not SLUG_OK.match(slug):
            print(f"Skipping article with unusable slug: {slug!r}")
            continue
        full = api_get(f"/articles/{urllib.parse.quote(slug)}", key)
        if not full or not full.get("article"):
            print(f"Skipping {slug}: no longer published")
            continue
        articles.append(full["article"])
    articles.sort(key=lambda a: a.get("published_at") or "", reverse=True)
    return articles


# ---------------------------------------------------------------- sanitising

ALLOWED = {
    "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "a", "blockquote", "strong", "em", "b", "i", "u", "s", "sub", "sup",
    "code", "pre", "figure", "figcaption", "img", "span", "small", "mark",
}
VOID = {"br", "hr", "img"}
DROP_WITH_CONTENT = {"script", "style", "iframe", "object", "embed", "noscript",
                     "template", "svg", "math", "form", "head", "title", "frame", "frameset"}
ATTRS = {"a": {"href", "title"}, "img": {"src", "alt", "width", "height"},
         "th": {"colspan", "rowspan", "scope"}, "td": {"colspan", "rowspan"},
         "ol": {"start"}}
HEADINGS = {"h2", "h3", "h4", "h5", "h6"}


def safe_url(url, images=False):
    url = (url or "").strip()
    low = re.sub(r"[\s\x00-\x1f]", "", url).lower()
    if images:
        return url if low.startswith("https://") else None
    if low.startswith(("https://", "http://", "mailto:", "#", "/")) or not re.match(r"^[a-z0-9+.-]+:", low):
        return url
    return None  # javascript:, data:, vbscript: and friends


def make_id(text, used):
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "section"
    out, n = base, 2
    while out in used:
        out, n = f"{base}-{n}", n + 1
    used.add(out)
    return out


class Sanitiser(HTMLParser):
    """Keeps an allow-list of tags and attributes and collects the h2s for the contents list."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack, self.skip = [], [], 0
        self.toc, self.used_ids = [], {"toc-title", "blog-cta"}  # ids the page itself uses
        self._h2 = None  # [index of opening tag in out, id, text parts]

    def handle_starttag(self, tag, attrs):
        if self.skip:
            if tag in DROP_WITH_CONTENT:
                self.skip += 1
            return
        if tag in DROP_WITH_CONTENT:
            self.skip = 1
            return
        if tag == "h1":
            tag = "h2"  # the post title is the page's only h1
        if tag not in ALLOWED:
            return
        attrs = dict(attrs)
        keep = []
        for name in ATTRS.get(tag, ()):
            val = attrs.get(name)
            if val is None:
                continue
            if name in ("href", "src"):
                val = safe_url(val, images=(name == "src"))
                if val is None:
                    continue
            if name in ("colspan", "rowspan", "width", "height", "start") and not str(val).isdigit():
                continue
            keep.append((name, val))
        if tag in HEADINGS and attrs.get("id"):
            hid = re.sub(r"[^A-Za-z0-9_-]", "", attrs["id"])[:80]
            if hid and hid not in self.used_ids:
                self.used_ids.add(hid)
                keep.insert(0, ("id", hid))
        if tag == "a" and any(n == "href" and v.lower().startswith("http") and not v.startswith(SITE)
                              for n, v in keep):
            keep.append(("rel", "noopener"))
        if tag == "img":
            if not any(n == "src" for n, _ in keep):
                return
            keep.append(("loading", "lazy"))
        self.out.append("<" + tag + "".join(f' {n}="{html.escape(str(v), quote=True)}"' for n, v in keep)
                        + ">")
        if tag == "h2":
            hid = next((v for n, v in keep if n == "id"), None)
            self._h2 = [len(self.out) - 1, hid, []]
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1] == ("h2" if tag == "h1" else tag):
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.skip:
            if tag in DROP_WITH_CONTENT:
                self.skip -= 1
            return
        if tag == "h1":
            tag = "h2"
        if tag not in ALLOWED or tag in VOID or tag not in self.stack:
            return
        while self.stack:
            open_tag = self.stack.pop()
            self.out.append(f"</{open_tag}>")
            if open_tag == "h2" and self._h2:
                self._finish_h2()
            if open_tag == tag:
                break

    def _finish_h2(self):
        idx, hid, parts = self._h2
        self._h2 = None
        text = " ".join("".join(parts).split())
        if not text:
            return
        if not hid:
            hid = make_id(text, self.used_ids)
            self.out[idx] = self.out[idx].replace("<h2", f'<h2 id="{hid}"', 1)
        self.toc.append((hid, text))

    def handle_data(self, data):
        if self.skip:
            return
        if self._h2:
            self._h2[2].append(data)
        self.out.append(html.escape(data, quote=False))

    def result(self):
        while self.stack:
            self.handle_endtag(self.stack[-1])
        return "".join(self.out), self.toc


def sanitise(raw):
    s = Sanitiser()
    s.feed(raw or "")
    s.close()
    return s.result()


# ---------------------------------------------------------------- pages

def esc(v):
    return html.escape(str(v or ""), quote=True)


def nice_date(iso):
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return "", ""
    return d.date().isoformat(), f"{d.day} {d:%B %Y}"


def read_time(a):
    try:
        n = int(round(float(a.get("read_time") or 0)))
    except (TypeError, ValueError):
        n = 0
    return f"{max(n, 1)} min read"


def image_of(a):
    for k in ("hero_image_url", "featured_image"):
        u = safe_url(a.get(k), images=True)
        if u:
            return u
    return None


def json_ld(data):
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return ""
    if not data:
        return ""
    text = json.dumps(data, ensure_ascii=False, indent=2)
    text = text.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<script type="application/ld+json">\n{text}\n</script>\n'


def lang_attrs(a):
    lang = re.sub(r"[^A-Za-z-]", "", str(a.get("language") or ""))[:20]
    if not lang or lang.lower().startswith("en"):
        return ""
    out = f' lang="{lang}"'
    if lang.split("-")[0].lower() in RTL:
        out += ' dir="rtl"'
    return out


def head(title, description, canonical, og_type, image, extra=""):
    image = image or f"{SITE}/assets/og-image.jpg"
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0E2A1D">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Touchline Tales">
<meta property="og:locale" content="en_GB">
<meta property="og:image" content="{esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/mark.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="Touchline Tales blog" href="/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/home.css?v={CSS_VERSION}">
{extra}<script src="/assets/stats.js" async></script>
<script type="module" src="/assets/heycatch.js"></script>
</head>
<body>

<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/" aria-label="Touchline Tales home">
      <img src="/assets/mark.svg" alt="" width="40" height="40">
      <span class="word">Touchline <b>Tales</b></span>
    </a>
    <nav class="nav" aria-label="Main">
      <a href="/#all-features">Features</a>
      <a href="/#safety">Safety</a>
      <a href="/#price">Price</a>
      <a href="/blog/" aria-current="page">Blog</a>
      <a class="btn btn-sm" href="/?ref=blog#signup">Sign up</a>
    </nav>
  </div>
</header>

<main>
"""


FOOT = """
    <section class="guide-cta card" aria-labelledby="blog-cta">
      <p class="eyebrow">Founding teams</p>
      <h2 id="blog-cta">Free for the 2026-27 season</h2>
      <p>Our first five founding teams pay nothing until June 2027, in return for honest feedback.</p>
      <p><a class="btn" href="/?ref=blog#signup">Join as a founding team</a></p>
    </section>

  </div>
</article>

</main>

<footer class="foot dark">
  <div class="wrap foot-in">
    <a class="brand" href="/" aria-label="Touchline Tales home">
      <img src="/assets/mark.svg" alt="" width="36" height="36">
      <span class="word">Touchline <b>Tales</b></span>
    </a>
    <p>Every match. Every milestone.</p>
    <nav class="foot-links small" aria-label="More from Touchline Tales">
      <a href="/about/">About</a>
      <a href="/blog/">Blog</a>
      <a href="/guides/share-results-with-parents/">Guide: sharing results with parents</a>
      <a href="/guides/welfare-officer-checklist/">Guide: a welfare officer's checklist</a>
      <a href="/changelog/">What we've shipped</a>
      <a href="/privacy/">Privacy</a>
      <a href="/dpa/">Data processing agreement</a>
    </nav>
    <p class="small">&copy; 2026 Touchline Tales. Team websites for grassroots football and rugby.</p>
  </div>
</footer>

</body>
</html>
"""


def index_page(articles):
    desc = "Ideas and how-tos for grassroots coaches, parents and club volunteers, from Touchline Tales."
    ld = json_ld({"@context": "https://schema.org", "@type": "Blog", "name": "Touchline Tales blog",
                  "url": f"{SITE}/blog/", "inLanguage": "en-GB",
                  "blogPost": [{"@type": "BlogPosting", "headline": a.get("title"),
                                "url": f"{SITE}/blog/{a['slug']}/",
                                "datePublished": nice_date(a.get("published_at"))[0]} for a in articles]})
    parts = [head("Blog | Touchline Tales", desc, f"{SITE}/blog/", "website", None, ld), """
<section class="guide-hero dark stripes">
  <div class="wrap narrow">
    <p class="eyebrow">Blog</p>
    <h1>From the touchline</h1>
    <p class="lede">Ideas and how-tos for the coaches, parents and volunteers who keep junior sport going.</p>
  </div>
</section>

<article class="band guide">
  <div class="wrap narrow">
"""]
    if articles:
        parts.append('    <ul class="post-list">\n')
        for a in articles:
            iso, shown = nice_date(a.get("published_at"))
            parts.append(f"""      <li class="card">
        <p class="post-meta"><time datetime="{iso}">{esc(shown)}</time> · {read_time(a)}</p>
        <h2><a href="/blog/{a['slug']}/">{esc(a.get('title'))}</a></h2>
      </li>
""")
        parts.append("    </ul>\n")
    else:
        parts.append('    <p class="post-empty">No articles yet. The first one is on its way, so check back soon.</p>\n')
    parts.append(FOOT)
    return "".join(parts)


def post_page(a):
    slug = a["slug"]
    body, toc = sanitise(a.get("content_html"))
    iso, shown = nice_date(a.get("published_at"))
    desc = a.get("meta_description") or a.get("title")
    title = f"{a.get('title')} | Touchline Tales"
    extra = ""
    if iso:
        extra += f'<meta property="article:published_time" content="{esc(a.get("published_at"))}">\n'
    if a.get("updated_at"):
        extra += f'<meta property="article:modified_time" content="{esc(a.get("updated_at"))}">\n'
    extra += json_ld(a.get("jsonLd"))
    parts = [head(title, desc, f"{SITE}/blog/{slug}/", "article", image_of(a), extra), f"""
<section class="guide-hero dark stripes">
  <div class="wrap narrow"{lang_attrs(a)}>
    <p class="eyebrow"><a href="/blog/">Blog</a></p>
    <h1>{esc(a.get('title'))}</h1>
    <p class="byline"><time datetime="{iso}">{esc(shown)}</time> · {read_time(a)}</p>
  </div>
</section>

<article class="band guide post">
  <div class="wrap narrow">
"""]
    if len(toc) >= 2:
        parts.append('    <nav class="toc" aria-labelledby="toc-title">\n'
                     '      <p class="eyebrow" id="toc-title">In this article</p>\n      <ol>\n')
        parts += [f'        <li><a href="#{esc(hid)}">{esc(text)}</a></li>\n' for hid, text in toc]
        parts.append("      </ol>\n    </nav>\n")
    parts.append(f'    <div class="post-body"{lang_attrs(a)}>\n{body}\n    </div>\n')
    parts.append('    <p class="post-back"><a href="/blog/">More from the blog</a></p>\n')
    parts.append(FOOT)
    return "".join(parts)


def feed(articles):
    items = []
    for a in articles[:20]:
        try:
            d = datetime.fromisoformat(str(a.get("published_at")).replace("Z", "+00:00"))
            pub = f"<pubDate>{d:%a, %d %b %Y %H:%M:%S %z}</pubDate>"
        except ValueError:
            pub = ""
        url = f"{SITE}/blog/{a['slug']}/"
        items.append(f"""  <item>
    <title>{esc(a.get('title'))}</title>
    <link>{url}</link>
    <guid>{url}</guid>
    {pub}
    <description>{esc(a.get('meta_description'))}</description>
  </item>""")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Touchline Tales blog</title>
  <link>{SITE}/blog/</link>
  <description>Ideas and how-tos for grassroots coaches, parents and club volunteers.</description>
  <language>en-gb</language>
{chr(10).join(items)}
</channel>
</rss>
"""


# ---------------------------------------------------------------- site updates

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)}")


def update_sitemap(articles):
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\s*<!-- blog:start -->.*?<!-- blog:end -->", "", text, flags=re.S)
    if articles:
        newest = max((a.get("updated_at") or a.get("published_at") or "") for a in articles)
        urls = [(f"{SITE}/blog/", newest)] + [
            (f"{SITE}/blog/{a['slug']}/", a.get("updated_at") or a.get("published_at")) for a in articles]
        block = "\n  <!-- blog:start -->"
        for loc, mod in urls:
            day = nice_date(mod)[0]
            block += f"\n  <url>\n    <loc>{loc}</loc>" + (f"\n    <lastmod>{day}</lastmod>" if day else "") + "\n  </url>"
        block += "\n  <!-- blog:end -->"
        text = text.replace("\n</urlset>", block + "\n</urlset>")
    write(path, text)


def toggle_links(show):
    pattern = re.compile(r"<a ([^>]*?)data-blog-link(?: hidden)?>")
    for rel in MARKETING_PAGES:
        path = ROOT / rel
        if path.exists():
            text = pattern.sub(lambda m: f"<a {m.group(1)}data-blog-link{'' if show else ' hidden'}>",
                               path.read_text(encoding="utf-8"))
            write(path, text)


def main():
    key = os.environ.get("HEYCATCH_API_KEY", "").strip()
    if not key:
        print("HEYCATCH_API_KEY is not set, so the blog was left as it is. "
              "Add it under Settings > Secrets and variables > Actions.")
        return 1
    try:
        articles = fetch_articles(key)
    except ApiError as e:
        print(f"Blog not updated: {e}")  # never touch the live pages on an error
        return 1

    keep = {a["slug"] for a in articles}
    if BLOG.exists():
        for d in BLOG.iterdir():
            if d.is_dir() and d.name not in keep:
                shutil.rmtree(d)
                print(f"removed blog/{d.name}")
    write(BLOG / "index.html", index_page(articles))
    write(BLOG / "feed.xml", feed(articles))
    for a in articles:
        write(BLOG / a["slug"] / "index.html", post_page(a))
    update_sitemap(articles)
    toggle_links(bool(articles))
    print(f"Blog has {len(articles)} article(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
