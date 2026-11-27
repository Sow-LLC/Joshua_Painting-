"""Spanish pages Google can index: /es/… copies of every public page with the Spanish baked in.

Run by tools/build_pages.py after the English pages and i18n.js are written. For each page it
  * swaps in the Spanish from i18n.js for data-i18n / data-i18n-html / data-i18n-attr,
  * sets <html lang="es">, the canonical / og:url to the /es/ address, og:locale es_US,
  * points internal links at the /es/ pages and the quote form's language at "es",
  * makes the EN / ES buttons plain links between the two addresses (on the English pages too).
"""
import html as H
import json
import re
from html.parser import HTMLParser
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
NOT_PAGES = ("/css/", "/js/", "/img/", "/admin", "/api/", "/es/", "/favicon", "/sitemap", "/robots")

# Inline head script. English pages: send people who chose Spanish (or whose browser is Spanish
# and who never chose) to the /es/ address before anything is drawn. Spanish pages: nothing to do.
HEAD_EN = ('<script>(function(){var r=document.documentElement;r.className+=" js";try{var q=new URLSearchParams(location.search).get("lang"),'
           's=localStorage.getItem("ab-lang"),n=(navigator.languages||[navigator.language||""]).some(function(l){return /^es\\b/i.test(l)});'
           'if(q==="es"||(q!=="en"&&(s==="es"||(!s&&n)))){r.className+=" i18n-pending";var u=new URL(location.href);u.searchParams.delete("lang");'
           'location.replace("/es"+u.pathname+u.search+u.hash)}}catch(e){}})();</script>')
HEAD_ES = '<script>document.documentElement.className+=" js";</script>'
HEAD_RE = re.compile(r'<script>\(function\(\)\{var r=document\.documentElement;r\.className\+=" js";.*?</script>|'
                     r'<script>document\.documentElement\.className\+=" js";</script>')


def spanish(i18n_js):
    """The ES dictionary from i18n.js (only the ES object, not the MSG messages)."""
    block = i18n_js[i18n_js.index("const ES = {"): i18n_js.index("\n  };", i18n_js.index("const ES = {"))]
    return {k: json.loads(v) for k, v in re.findall(r'^\s*"([^"]+)":\s*("(?:[^"\\]|\\.)*"),?\s*$', block, flags=re.M)}


def es_href(href):
    """/services/ → /es/services/ for our own pages; files, admin and other sites stay as they are."""
    if not href.startswith("/") or href.startswith("//") or href.startswith(NOT_PAGES):
        return href
    path = re.split(r"[?#]", href, 1)[0]
    if re.search(r"\.[a-z0-9]+$", path):          # a file, e.g. /img/x.jpg
        return href
    return "/es" + href


class Translate(HTMLParser):
    def __init__(self, es, missing):
        super().__init__(convert_charrefs=False)
        self.es, self.missing, self.out, self.skip = es, missing, [], 0

    def tag(self, tag, attrs, close=""):
        return "<" + tag + "".join(f" {k}" if v is None else f' {k}="{H.escape(v, quote=True)}"' for k, v in attrs) + close + ">"

    def start(self, tag, attrs, selfclose):
        if self.skip:
            if tag not in VOID and not selfclose:
                self.skip += 1
            return
        a = dict(attrs)
        changed = False
        new = []
        for k, v in attrs:
            nv = v
            if tag == "html" and k == "lang":
                nv = "es"
            elif k == "href" and v is not None and "data-lang" not in a:
                nv = es_href(v)
            elif tag == "input" and a.get("name") == "lang" and k == "value":
                nv = "es"
            new.append((k, nv))
            changed |= nv != v
        if "data-i18n-attr" in a:
            for pair in a["data-i18n-attr"].split(";"):
                if ":" not in pair:
                    continue
                attr, key = (s.strip() for s in pair.split(":", 1))
                if key in self.es:
                    new = [(k, self.es[key] if k == attr else v) for k, v in new]
                    changed = True
                else:
                    self.missing.add(key)
        text = self.tag(tag, new, " /" if selfclose else "") if changed else self.get_starttag_text()
        self.out.append(text)
        if tag in VOID or selfclose:
            return
        for attr, raw in (("data-i18n", False), ("data-i18n-html", True)):
            key = a.get(attr)
            if key is None:
                continue
            if key in self.es:
                self.out.append(self.es[key] if raw else H.escape(self.es[key], quote=False))
                self.skip = 1
            else:
                self.missing.add(key)
            return

    def handle_starttag(self, tag, attrs): self.start(tag, attrs, False)
    def handle_startendtag(self, tag, attrs): self.start(tag, attrs, True)

    def handle_endtag(self, tag):
        if self.skip:
            self.skip -= 1
            if self.skip:
                return
        self.out.append(f"</{tag}>")

    def raw(self, s):
        if not self.skip:
            self.out.append(s)

    def handle_data(self, d): self.raw(d)
    def handle_entityref(self, n): self.raw(f"&{n};")
    def handle_charref(self, n): self.raw(f"&#{n};")
    def handle_comment(self, d): self.raw(f"<!--{d}-->")
    def handle_decl(self, d): self.raw(f"<!{d}>")
    def handle_pi(self, d): self.raw(f"<?{d}>")
    def unknown_decl(self, d): self.raw(f"<![{d}]>")


def lang_links(html, path, current):
    """EN / ES buttons: real links to the two addresses, the current one marked."""
    html = html.replace('href="?lang=en"', f'href="{path}"').replace('href="?lang=es"', f'href="/es{path}"')
    html = html.replace('data-i18n-attr="aria-label:aria.lang" hidden>', 'data-i18n-attr="aria-label:aria.lang">')   # plain links work without JS too
    html = re.sub(r'(<a href="[^"]*" data-lang="(en|es)" lang="\2")( aria-current="true")?',
                  lambda m: m.group(1) + (' aria-current="true"' if m.group(2) == current else ""), html)
    return html


def build_es(site, urls, extra=("404.html",)):
    """urls: the English page paths ("/", "/services/", …). Writes public/es/… and updates the English pages."""
    es = spanish((PUB / "js" / "i18n.js").read_text(encoding="utf-8"))
    missing = set()
    files = [(u, PUB / u.strip("/") / "index.html" if u != "/" else PUB / "index.html") for u in urls]
    files += [(None, PUB / f) for f in extra]
    out_root = PUB / "es"
    for old in sorted(out_root.rglob("*.html"), reverse=True) if out_root.exists() else []:
        old.unlink()
    for path, f in files:
        en = f.read_text(encoding="utf-8")
        page_path = path or "/"
        en = HEAD_RE.sub(lambda m: HEAD_EN, en, count=1)
        en = lang_links(en, page_path, "en")
        f.write_text(en, encoding="utf-8")

        t = Translate(es, missing)
        t.feed(en)
        t.close()
        doc = "".join(t.out)
        doc = HEAD_RE.sub(lambda m: HEAD_ES, doc, count=1)
        doc = lang_links(doc, page_path, "es")
        if path:
            doc = doc.replace(f'<link rel="canonical" href="{site}{path}">', f'<link rel="canonical" href="{site}/es{path}">')
            doc = doc.replace(f'<meta property="og:url" content="{site}{path}">', f'<meta property="og:url" content="{site}/es{path}">')
        doc = doc.replace('<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="es_US">',
                          '<meta property="og:locale" content="es_US">\n<meta property="og:locale:alternate" content="en_US">')
        dest = out_root / (f.relative_to(PUB))
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(doc, encoding="utf-8")
    if missing:
        print("es: no Spanish yet for", ", ".join(sorted(missing)))
    return ["/es" + u for u in urls]
