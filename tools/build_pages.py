#!/usr/bin/env python3
"""Build the site's page tree from public/index.html.

    python3 tools/build_pages.py

index.html is the source of truth for the shared pieces (head, quote form, about,
method, service area, reviews). This script:

  * writes the shared header (with the Services ▾ dropdown), footer and phone bar
    into index.html and every generated page, so they never drift apart
  * generates  /services/  /services/<slug>/ (x6)  /work/  /about/
  * adds the Spanish text for those pages to public/js/i18n.js (between markers)
  * writes public/sitemap.xml and public/robots.txt

Run it again after editing the content below or the shared sections in index.html.
"""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SITE = "https://atelier-blanc.raymondsantopietro.workers.dev"
YELP = "https://www.yelp.com/biz/joshua-painting-jm-waterproofing-hercules"
FACEBOOK = "https://www.facebook.com/p/Joshua-Painting-JM-Waterproofing-100094531236267/"
PHONE_TEL, PHONE = "+15103699079", "(510) 369-9079"

def e(s):
    return escape(s, quote=True)

ES = {}  # key -> Spanish, collected while building; written into i18n.js

# ───────────────────────── search engines and link previews ─────────────────────────
BUSINESS_ID = SITE + "/#business"
AREAS = ["Hercules, CA", "Berkeley, CA", "Oakland, CA", "Alameda, CA", "Concord, CA", "East Bay, CA"]

def business_ld():
    """schema.org data Google reads for the business panel. Only facts from the Yelp page.
    (No star rating here: Google ignores ratings a business publishes about itself.)"""
    week = ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"]
    return {
        "@context": "https://schema.org", "@type": "HousePainter", "@id": BUSINESS_ID,
        "name": "Joshua's Painting Service", "alternateName": "Joshua Painting JM Waterproofing",
        "url": SITE + "/", "telephone": "+1-510-369-9079", "image": SITE + "/img/work/cape-cod-exterior.jpg",
        "knowsLanguage": ["en", "es"],
        "address": {"@type": "PostalAddress", "addressLocality": "Hercules", "addressRegion": "CA",
                    "postalCode": "94547", "addressCountry": "US"},
        "areaServed": AREAS,
        "openingHoursSpecification": [
            {"@type": "OpeningHoursSpecification", "dayOfWeek": week, "opens": "08:00", "closes": "19:00"},
            {"@type": "OpeningHoursSpecification", "dayOfWeek": "Wednesday", "opens": "08:00", "closes": "20:00"}],
        "sameAs": [YELP, FACEBOOK],
    }

def seo(path, title, desc, image, ld=None, noindex=False):
    """Canonical URL, share preview (Open Graph / Twitter) and structured data, between markers."""
    img = f"{SITE}/img/work/{image}.jpg"
    tags = [
        f'<link rel="canonical" href="{SITE}{path}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Joshua\'s Painting Service">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{SITE}{path}">',
        f'<meta property="og:image" content="{img}">',
        '<meta property="og:locale" content="en_US">',
        '<meta property="og:locale:alternate" content="es_US">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if noindex:
        tags.append('<meta name="robots" content="noindex">')
    for block in (ld or []):
        tags.append('<script type="application/ld+json">' + json.dumps(block, ensure_ascii=False) + "</script>")
    return "<!-- seo -->\n" + "\n".join(tags) + "\n<!-- /seo -->\n"

def crumbs_ld(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": name, "item": SITE + url} for i, (name, url) in enumerate(items, 1)]}

def t(key, en, es=None, tag="span", attrs=""):
    """An element whose text switches language (data-i18n)."""
    if es is not None:
        ES[key] = es
    return f'<{tag}{(" " + attrs) if attrs else ""} data-i18n="{key}">{e(en)}</{tag}>'

# ───────────────────────── photos (all real jobs, from the business's Yelp page) ─────────────────────────
PHOTOS = {  # name: (w, h, caption_en, caption_es, category)
    "interior-room": (750, 1000, "Bright room, walls and trim", "Habitación luminosa, paredes y molduras", "interior"),
    "interior-bedroom": (750, 1000, "Bedroom, ready to move in", "Recámara lista para habitar", "interior"),
    "interior-door": (750, 1000, "Doors and casings", "Puertas y marcos", "interior"),
    "kitchen": (1000, 750, "Kitchen cabinets and walls", "Gabinetes y paredes de cocina", "interior"),
    "cape-cod-exterior": (1000, 750, "House exterior", "Exterior de casa", "exterior"),
    "petaluma-house": (750, 1000, "Full exterior · Petaluma, CA", "Exterior completo · Petaluma, CA", "exterior"),
    "green-house": (1000, 750, "Two-storey exterior", "Exterior de dos pisos", "exterior"),
    "white-house-stairs": (992, 744, "Exterior and entry stairs", "Exterior y escaleras de entrada", "exterior"),
    "board-and-batten": (1000, 563, "Board-and-batten siding", "Revestimiento de tablas y listones", "exterior"),
    "san-jose-house": (1000, 750, "1980 house · San Jose, CA", "Casa de 1980 · San José, CA", "exterior"),
    "exterior-ladder": (1000, 563, "Exterior in progress", "Exterior en proceso", "exterior"),
    "orinda-deck": (1000, 750, "Deck job · Orinda, CA", "Terraza · Orinda, CA", "decks"),
    "deck-stairs": (956, 1000, "Deck washed, prepped and painted", "Terraza lavada, preparada y pintada", "decks"),
    "deck-work": (750, 1000, "Deck prep among the trees", "Preparación de terraza entre los árboles", "decks"),
    "commercial-accent-wall": (992, 744, "Commercial accent wall", "Pared de acento comercial", "commercial"),
    "commercial-project": (992, 744, "Commercial interior project", "Proyecto comercial interior", "commercial"),
    "commercial-prep": (992, 744, "Commercial space, floors protected", "Local comercial con pisos protegidos", "commercial"),
    "drywall-prep": (750, 1000, "Patching before paint", "Resane antes de pintar", "prep"),
    "surface-prep": (992, 744, "Surface preparation", "Preparación de superficies", "prep"),
    "crew-prep": (744, 992, "Scraping and sanding siding", "Raspado y lijado del revestimiento", "prep"),
    "primer-siding": (992, 744, "Siding primed for paint", "Revestimiento con primer", "prep"),
}

def photo(name, cls="work-item", lazy=True, caption=True):
    w, h, en, es, cat = PHOTOS[name]
    key = f"ph.{name}"
    ES[key] = es
    lazy_attr = ' loading="lazy"' if lazy else ""
    img = (f'<img src="/img/work/{name}.jpg" width="{w}" height="{h}" alt="{e(en)}" '
           f'data-i18n-attr="alt:{key}"{lazy_attr} decoding="async">')
    cap = f'<figcaption data-i18n="{key}">{e(en)}</figcaption>' if caption else ""
    return f'<figure class="{cls}" data-cat="{cat}">{img}{cap}</figure>'

# ───────────────────────── services ─────────────────────────
# gid = key prefix already used in i18n.js (svc.<gid>.title / body / i1…)
SERVICES = [
    dict(slug="interior", gid="interior", scope="interior", n=1,
         h1=("Interior painting", "Pintura de interiores"),
         note=("s1.note", "from $2.40 / sq ft", None),
         title=("Interior", None), body=("Walls, ceilings and woodwork, with furniture moved and floors covered. Every surface is patched and sanded before the colour goes on.", None),
         items=["Walls and ceilings", "Trim and molding", "Doors", "Interior staining"],
         hero="interior-room", photos=["interior-room", "interior-bedroom", "interior-door", "drywall-prep", "surface-prep"],
         lede=("Interior painting for houses, condos and rentals in Hercules and around the East Bay. We protect your floors and furniture, repair the walls first, and paint two full coats so the colour is even in every light.",
               "Pintura de interiores para casas, condominios y rentas en Hercules y el East Bay. Protegemos sus pisos y muebles, reparamos primero las paredes y aplicamos dos manos completas para que el color sea parejo con cualquier luz."),
         faq=[("How long does an interior job take?", "One or two rooms usually take one to two days. A whole-house interior takes three to six days, depending on ceilings, trim and repairs.",
               "¿Cuánto tarda un trabajo de interiores?", "Una o dos habitaciones suelen tardar de uno a dos días. Un interior completo tarda de tres a seis días, según techos, molduras y reparaciones."),
              ("Do you paint ceilings and trim too?", "Yes. Walls, ceilings, baseboards, door and window casings and doors can all go in the same quote, or be priced separately.",
               "¿También pintan techos y molduras?", "Sí. Paredes, techos, zócalos, marcos de puertas y ventanas y puertas pueden ir en la misma cotización o cotizarse por separado."),
              ("Can we stay in the house while you paint?", "Yes. We work room by room, keep a path clear, use low-odour paint and clean up every evening.",
               "¿Podemos quedarnos en casa mientras pintan?", "Sí. Trabajamos habitación por habitación, dejamos el paso libre, usamos pintura de bajo olor y limpiamos cada tarde.")]),
    dict(slug="exterior", gid="exterior", scope="exterior", n=2,
         h1=("Exterior painting", "Pintura de exteriores"),
         note=("s2.note", "from $3.10 / sq ft", None),
         title=("Exterior", None), body=("The whole outside of the house or just the parts that need it. Power-washed, scraped, caulked and primed so the finish outlasts the weather.", None),
         items=["Entire exterior: siding and stucco", "Trim and fascia", "Decks and porches", "Fences and gates", "Exterior staining"],
         hero="cape-cod-exterior", photos=["cape-cod-exterior", "petaluma-house", "green-house", "white-house-stairs", "board-and-batten", "san-jose-house", "primer-siding", "exterior-ladder"],
         lede=("Exterior painting that lasts through Bay Area sun, fog and rain. Every job starts with washing, scraping, caulking and priming the bare spots, then two coats on siding, stucco, trim, doors, decks and fences.",
               "Pintura de exteriores que aguanta el sol, la neblina y la lluvia del Área de la Bahía. Cada trabajo empieza con lavado, raspado, sellado y primer en las partes expuestas, y luego dos manos en revestimiento, estuco, molduras, puertas, terrazas y cercas."),
         faq=[("When is the best time of year to paint outside?", "Late spring to early fall is ideal, but we paint year-round whenever the surface is dry and the forecast is clear. Rain days are rescheduled at no cost.",
               "¿Cuál es la mejor época para pintar el exterior?", "De finales de primavera a principios de otoño es lo ideal, pero pintamos todo el año cuando la superficie está seca y el pronóstico es despejado. Los días de lluvia se reprograman sin costo."),
              ("Do you power-wash first?", "Always. Washing removes dirt, chalk and mildew so the new paint bonds. Loose paint is scraped and sanded, and bare wood is primed.",
               "¿Lavan a presión primero?", "Siempre. El lavado quita suciedad, polvo y moho para que la pintura nueva se adhiera. La pintura suelta se raspa y se lija, y la madera expuesta lleva primer."),
              ("Can you paint just the trim or one side of the house?", "Yes. We do full exteriors and smaller jobs like trim, doors, a fence or the side that gets the most sun.",
               "¿Pueden pintar solo las molduras o un lado de la casa?", "Sí. Hacemos exteriores completos y trabajos pequeños como molduras, puertas, una cerca o el lado que recibe más sol.")]),
    dict(slug="cabinets", gid="cabinets", scope="cabinets", n=3,
         h1=("Cabinet painting", "Pintura de gabinetes"),
         note=("s3.note", "from $95 / door", None),
         title=("Cabinets", None), body=("Doors taken off, numbered, degreased and sprayed, then rehung and adjusted. A new-looking kitchen without the demolition.", None),
         items=["Kitchen cabinets", "Bathroom vanities", "Doors and drawer fronts"],
         hero="kitchen", photos=["kitchen"],
         lede=("Painted cabinets give a kitchen or bathroom a new look for a fraction of the cost of replacing them. Doors and drawer fronts are removed, cleaned, sanded, primed and painted, then rehung and adjusted.",
               "Los gabinetes pintados le dan una nueva cara a la cocina o el baño por una fracción de lo que cuesta cambiarlos. Desmontamos puertas y frentes de cajón, los limpiamos, lijamos, aplicamos primer y pintamos, y luego los volvemos a colgar y ajustar."),
         faq=[("How long does a cabinet job take?", "Most kitchens take four to six days, including drying time between coats. You can still use the kitchen in the evenings.",
               "¿Cuánto tarda pintar gabinetes?", "La mayoría de las cocinas tardan de cuatro a seis días, incluido el secado entre manos. Puede seguir usando la cocina por las tardes."),
              ("Will the paint hold up?", "We degrease, sand, use a bonding primer and finish with a hard-wearing cabinet enamel, so it resists chips and daily wiping.",
               "¿La pintura va a durar?", "Desengrasamos, lijamos, usamos un primer de adherencia y terminamos con un esmalte resistente para gabinetes, que aguanta golpes y limpieza diaria."),
              ("Can you change the hardware?", "Yes. We fill the old holes and drill for new handles if you choose them before we start.",
               "¿Pueden cambiar las jaladeras?", "Sí. Rellenamos los agujeros viejos y perforamos para las nuevas si las elige antes de empezar.")]),
    dict(slug="wall-repair", gid="walls", scope="other", n=4,
         h1=("Wall repair & texture", "Reparación y textura de paredes"),
         note=("s5.note", "hourly or flat", None),
         title=("Walls & repairs", None), body=("The work under the paint: holes, cracks, old finishes and texture, fixed so the new coat looks right.", None),
         items=["Wall patching", "Wall finish repair", "Wall finish installation or replacement", "Wall texturing", "Wallpaper removal", "Paint removal"],
         hero="drywall-prep", photos=["drywall-prep", "surface-prep", "crew-prep", "primer-siding"],
         lede=("Holes, cracks, water stains, old wallpaper and patchy texture all show through new paint. We patch, tape, texture and sand until the wall is smooth, then prime it so the finish looks right.",
               "Los agujeros, grietas, manchas de agua, el papel tapiz viejo y la textura dispareja se notan a través de la pintura nueva. Resanamos, encintamos, texturizamos y lijamos hasta dejar la pared lisa, y luego aplicamos primer para que el acabado luzca bien."),
         faq=[("Can you match my wall texture?", "Yes. We match orange peel, knockdown and smooth finishes so the repair disappears once it's painted.",
               "¿Pueden igualar la textura de mi pared?", "Sí. Igualamos texturas de cáscara de naranja, knockdown y lisas para que la reparación no se note al pintar."),
              ("Do you remove wallpaper?", "Yes. We strip it, wash off the glue, repair the wall underneath and prime it for paint.",
               "¿Quitan papel tapiz?", "Sí. Lo retiramos, lavamos el pegamento, reparamos la pared de abajo y le aplicamos primer para pintar."),
              ("Is repair work charged separately?", "Small repairs are included in a painting quote. Bigger repairs are priced by the hour or as a flat price, agreed before we start.",
               "¿Las reparaciones se cobran aparte?", "Las reparaciones pequeñas van incluidas en la cotización de pintura. Las grandes se cobran por hora o con precio fijo, acordado antes de empezar.")]),
    dict(slug="waterproofing", gid="water", scope="other", n=5,
         h1=("Waterproofing", "Impermeabilización"),
         note=("svcp.water.note", "priced per job", "precio por trabajo"),
         title=("Waterproofing", None), body=("Keeping water out of walls, decks and masonry, on its own or as part of an exterior job.", None),
         items=["Waterproofing", "Sealing decks and masonry"],
         hero="orinda-deck", photos=["orinda-deck", "deck-stairs", "deck-work"],
         lede=("Water is what ruins paint and wood. We seal decks, stairs, masonry and exterior walls so rain runs off instead of soaking in, as a job on its own or together with an exterior repaint.",
               "El agua es lo que arruina la pintura y la madera. Sellamos terrazas, escaleras, mampostería y muros exteriores para que la lluvia escurra en lugar de filtrarse, como trabajo aparte o junto con la pintura del exterior."),
         faq=[("How often should a deck be sealed?", "Most decks need a fresh coat of sealer or stain every two to three years, sooner if they sit in full sun.",
               "¿Cada cuánto hay que sellar una terraza?", "La mayoría necesita una nueva mano de sellador o tinte cada dos o tres años, antes si recibe sol directo todo el día."),
              ("Do you fix leaks?", "We seal and coat surfaces to keep water out. If we find rot or a structural leak, we'll show you and tell you who to call.",
               "¿Arreglan goteras?", "Sellamos y recubrimos superficies para mantener el agua fuera. Si encontramos madera podrida o una filtración estructural, se la mostramos y le decimos a quién llamar."),
              ("Can waterproofing be done with an exterior paint job?", "Yes, and it usually saves time and money because the washing and prep are shared.",
               "¿Se puede impermeabilizar junto con la pintura del exterior?", "Sí, y normalmente ahorra tiempo y dinero porque el lavado y la preparación se comparten.")]),
    dict(slug="commercial", gid="commercial", scope="commercial", n=6,
         h1=("Commercial painting", "Pintura comercial"),
         note=("s4.note", "priced per site", None),
         title=("Commercial", None), body=("Offices, shops and restaurants, painted at night or over a weekend so you can stay open.", None),
         items=["Offices", "Shops and restaurants", "Rentals and multi-unit buildings"],
         hero="commercial-accent-wall", photos=["commercial-accent-wall", "commercial-project", "commercial-prep"],
         lede=("Offices, shops, restaurants and rental units painted on your schedule. We can work nights and weekends so you stay open, and keep the space clean and safe for staff and customers.",
               "Oficinas, tiendas, restaurantes y unidades de renta pintadas según su horario. Podemos trabajar de noche y en fin de semana para que siga abierto, y mantenemos el espacio limpio y seguro para empleados y clientes."),
         faq=[("Can you work after hours?", "Yes. Evening, overnight and weekend work can be scheduled so your business doesn't close.",
               "¿Pueden trabajar fuera de horario?", "Sí. Podemos programar trabajo por la tarde, de noche o en fin de semana para que su negocio no cierre."),
              ("Do you paint between tenants?", "Yes. We turn rentals and multi-unit buildings around quickly so units are ready to show.",
               "¿Pintan entre inquilinos?", "Sí. Preparamos rentas y edificios de varias unidades rápido para que estén listos para mostrar."),
              ("Can you quote several locations at once?", "Yes. Send the addresses and we'll visit and price each site in one written quote.",
               "¿Pueden cotizar varios locales a la vez?", "Sí. Envíenos las direcciones y visitamos y cotizamos cada sitio en una sola cotización por escrito.")]),
]

# ───────────────────────── shared pieces ─────────────────────────
def header():
    drop = "\n".join(f'        <a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a>' for s in SERVICES)
    sub = "\n".join(f'      <a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a>' for s in SERVICES)
    ES.update({"nav.allServices": "Todos los servicios", "nav.showServices": "Mostrar servicios"})
    return f'''<header class="top">
  <a class="mark" href="/" aria-label="Joshua's Painting Service home" data-i18n-attr="aria-label:aria.home">
    <span class="mark-chip" aria-hidden="true"></span>
    <span>Joshua's<span class="mark-rest"> Painting Service</span></span>
  </a>
  <nav class="nav" aria-label="Main" data-i18n-attr="aria-label:aria.nav">
    <div class="drop">
      <a href="/services/" data-i18n="nav.services">Services</a>
      <button class="drop-btn" type="button" aria-expanded="false" aria-controls="drop-svc" aria-label="Show services" data-i18n-attr="aria-label:nav.showServices"><span aria-hidden="true">▾</span></button>
      <div class="drop-menu" id="drop-svc">
{drop}
        <a class="drop-all" href="/services/" data-i18n="nav.allServices">All services</a>
      </div>
    </div>
    <a href="/work/" data-i18n="nav.work">Our work</a>
    <a href="/about/" data-i18n="nav.about">About</a>
    <a class="nav-opt" href="/reviews/" data-i18n="nav.reviews">Reviews</a>
    <a class="nav-opt" href="/faq/" data-i18n="nav.faq">FAQ</a>
    <a class="nav-cta" href="/contact/" data-cta data-i18n="nav.quote" data-short="Quote" data-i18n-attr="data-short:nav.quote.short">Free quote</a>
    <span class="lang" role="group" aria-label="Language" data-i18n-attr="aria-label:aria.lang" hidden><a href="?lang=en" data-lang="en" lang="en" aria-current="true">EN</a><a href="?lang=es" data-lang="es" lang="es">ES</a></span>
  </nav>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-i18n-attr="aria-label:nav.menu" aria-label="Menu"><span></span><span></span><span></span></button>
  <nav class="menu" id="menu" aria-label="Menu" data-i18n-attr="aria-label:nav.menu" hidden>
    <a href="/services/" data-i18n="nav.services">Services</a>
    <div class="menu-sub">
{sub}
    </div>
    <a href="/work/" data-i18n="nav.work">Our work</a>
    <a href="/about/" data-i18n="nav.about">About</a>
    <a href="/reviews/" data-i18n="nav.reviews">Reviews</a>
    <a href="/faq/" data-i18n="nav.faq">FAQ</a>
    <a href="/contact/" data-i18n="nav.contact">Contact</a>
    <a class="menu-call" href="tel:{PHONE_TEL}"><span data-i18n="util.call">Call</span> {PHONE}</a>
    <a class="btn" href="/contact/" data-cta data-i18n="nav.quote">Free quote</a>
  </nav>
</header>'''

def footer():
    svc = "\n".join(f'    <a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a>' for s in SERVICES)
    ES["foot.services"] = "Servicios"
    ES["foot.company"] = "Empresa"
    ES["nav.privacy"] = "Privacidad"
    ES["nav.contact"] = "Contacto"
    ES["foot.follow"] = "Síganos en"
    return f'''<footer class="foot">
  <div>
    <span class="mark"><span class="mark-chip" aria-hidden="true"></span>Joshua's Painting Service</span>
    <p class="muted" data-i18n="foot.licensed">Painting &amp; waterproofing · Insured · Hercules, CA</p>
    <p class="foot-contact"><a href="tel:{PHONE_TEL}"><span data-i18n="util.call">Call</span> {PHONE}</a><span data-i18n="util.hours">Mon–Sat · 8 am – 7 pm</span><span data-i18n="util.trust">Hercules, CA · Free estimates</span></p>
    <p class="foot-social"><span data-i18n="foot.follow">Follow us</span> <a href="{FACEBOOK}" target="_blank" rel="noopener">Facebook</a> · <a href="{YELP}" target="_blank" rel="noopener">Yelp</a></p>
  </div>
  <nav class="foot-nav foot-cols" aria-label="Footer" data-i18n-attr="aria-label:aria.foot">
    <div>
    <p class="label" data-i18n="foot.services">Services</p>
{svc}
    </div>
    <div>
    <p class="label" data-i18n="foot.company">Company</p>
    <a href="/work/" data-i18n="nav.work">Our work</a>
    <a href="/about/" data-i18n="nav.about">About</a>
    <a href="/reviews/" data-i18n="nav.reviews">Reviews</a>
    <a href="/faq/" data-i18n="nav.faq">FAQ</a>
    <a href="/contact/" data-i18n="nav.contact">Contact</a>
    <a href="/privacy/" data-i18n="nav.privacy">Privacy</a>
    </div>
  </nav>
  <p class="foot-code" data-i18n-html="foot.code">JP — painted by hand · <a href="/admin/">Studio login</a></p>
</footer>

<!-- phones: call / quote always one tap away -->
<div class="dock">
  <a href="tel:{PHONE_TEL}" data-i18n="dock.call">Call</a>
  <a href="/contact/" data-cta class="dock-cta" data-i18n="nav.quote">Free quote</a>
</div>'''

def localize(html, path, has_form):
    """Per-page touches on the shared header/footer."""
    if has_form:  # the quote form is on this page: quote buttons jump to it
        html = html.replace('href="/contact/" data-cta', 'href="#quote" data-cta')
    # shared sections may link to #something that lives on its own page now
    moved = {"quote": "/contact/", "faq": "/faq/", "reviews": "/reviews/", "about": "/about/", "work": "/work/", "services": "/services/"}
    html = re.sub(r'href="#([\w-]+)"', lambda m: m.group(0) if f'id="{m.group(1)}"' in html
                  else f'href="{moved.get(m.group(1), "/#" + m.group(1))}"', html)
    # mark the current page in the menus
    html = re.sub(rf'(<a(?: class="[^"]*")? href="{re.escape(path)}")(?= )', r'\1 aria-current="page"', html) if path != "/" else html
    return webp(hreflang(html))

def hreflang(html):
    """Search engines need full addresses in hreflang links, plus an x-default."""
    html = re.sub(r'(<link rel="alternate" hreflang="(?:en|es|x-default)" href=")(/[^"]*")', rf'\1{SITE}\2', html)
    if 'hreflang="x-default"' not in html:
        html = re.sub(r'(<link rel="alternate" hreflang="en" href="([^"]*)">\n)',
                      r'\1<link rel="alternate" hreflang="x-default" href="\2">\n', html, count=1)
    return html

# how wide each kind of photo is drawn, so phones download a small file
SIZES = {"wall-photo": "100vw", "story-photo": "(max-width: 960px) 100vw, 40vw", "about-photo": "(max-width: 960px) 100vw, 40vw",
         "area-photo": "(max-width: 960px) 100vw, 35vw", "svc-hero-photo": "(max-width: 960px) 100vw, 50vw",
         "frame-fig": "(max-width: 960px) 100vw, 45vw"}

def webp(html):
    """Swap job-photo JPEGs for WebP (made by tools/make_webp.py) with a 600 / 800 / full srcset."""
    def sub(m):
        attrs, name, w = m.group(1), m.group(2), int(m.group(3))
        before = html[max(0, m.start() - 160): m.start()] + attrs
        sizes = next((v for k, v in SIZES.items() if k in before.rsplit("<figure", 1)[-1] or f'class="{k}"' in attrs), "(max-width: 960px) 50vw, 25vw")
        srcs = [f"/img/work/{name}-600.webp 600w"] + ([f"/img/work/{name}-800.webp 800w"] if w > 800 else []) + [f"/img/work/{name}.webp {w}w"]
        return f'<img {attrs}src="/img/work/{name}.webp" srcset="{", ".join(srcs)}" sizes="{sizes}" width="{w}"'
    return re.sub(r'<img ([^>]*?)src="/img/work/([\w-]+)\.jpg" width="(\d+)"', sub, html)

def head(path, key, title, dkey, desc, es_title, es_desc, image="cape-cod-exterior", ld=None, noindex=False):
    ES[key], ES[dkey] = es_title, es_desc
    src = (PUB / "index.html").read_text(encoding="utf-8")
    pre = src[: src.index("<title")]
    post = src[src.index('<link rel="icon"'): src.index("</head>")]
    post = re.sub(r'<link rel="alternate" hreflang="en" href="[^"]*">', f'<link rel="alternate" hreflang="en" href="{path}">', post)
    post = re.sub(r'<link rel="alternate" hreflang="es" href="[^"]*">', f'<link rel="alternate" hreflang="es" href="{path}?lang=es">', post)
    post = re.sub(r'<link rel="alternate" hreflang="x-default" href="[^"]*">', f'<link rel="alternate" hreflang="x-default" href="{path}">', post)
    return (pre + f'<title data-i18n="{key}">{e(title)}</title>\n'
            f'<meta name="description" data-i18n-attr="content:{dkey}" content="{e(desc)}">\n'
            + seo(path, title, desc, image, ld, noindex) + post + "</head>\n<body>\n\n")

SECTIONS = Path(__file__).resolve().parent / "sections.html"

def section(src, start_marker):
    """Cut one <section> … </section> out of index.html or tools/sections.html."""
    if start_marker not in src:
        src = SECTIONS.read_text(encoding="utf-8")
    i = src.index(start_marker)
    return src[i: src.index("</section>", i) + len("</section>")]

def page(path, head_html, main, scripts, has_form=False, out_file=None):
    html = head_html + header() + "\n\n<main>\n\n" + main + "\n\n</main>\n\n" + footer() + "\n\n"
    html += "".join(f'<script src="/js/{s}.js" defer></script>\n' for s in ["i18n", "menu", "reveal"] + scripts)
    html += "</body>\n</html>\n"
    html = localize(html, path, has_form)
    out = PUB / out_file if out_file else PUB / path.strip("/") / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return path

def quote_section(src, scope):
    q = section(src, '<section id="quote"')
    q = q.replace('value="interior" checked>', 'value="interior">')
    q = q.replace(f'name="scope" value="{scope}">', f'name="scope" value="{scope}" checked>', 1)
    return q

def rating():
    return f'<a class="rating" href="{YELP}" target="_blank" rel="noopener"><span class="stars" aria-hidden="true">★★★★★</span> <span data-i18n="rev.short">5.0 on Yelp</span></a>'

def steps():
    ES.update({"step.label": "Cómo funciona", "step.title": "Tres pasos, sin sorpresas"})
    items = [("Free visit", "Visita gratis", "We come out, look at the job, measure and answer your questions. No charge, no pressure.",
              "Vamos, vemos el trabajo, medimos y respondemos sus preguntas. Sin costo ni presión."),
             ("Written quote", "Cotización por escrito", "An itemised price and a start date, sent as soon as possible.",
              "Un precio detallado y una fecha de inicio, enviados lo antes posible."),
             ("The work", "El trabajo", "The same crew from start to finish, a clean site every day and a walk-through with you at the end.",
              "El mismo equipo de principio a fin, limpieza cada día y una revisión final con usted.")]
    lis = "\n".join(f'    <li><span class="step-n">0{i}</span>{t(f"step.{i}.t", a, b, "h3")}{t(f"step.{i}.b", c, d, "p")}</li>'
                    for i, (a, b, c, d) in enumerate(items, 1))
    return f'''<section class="block steps" aria-labelledby="steps-title">
  <div class="block-head">
    <p class="label" data-i18n="step.label">How it works</p>
    <h2 id="steps-title" data-i18n="step.title">Three steps, no surprises</h2>
  </div>
  <ol class="steps-list">
{lis}
  </ol>
</section>'''

def service_card(s, heading="h3"):
    ES["svcp.more"] = "Ver detalles"
    ES["svcp.free"] = "Presupuesto gratis"
    return f'''        <li class="frame">
          <a class="frame-media" href="/services/{s["slug"]}/" tabindex="-1" aria-hidden="true">{photo(s["hero"], "frame-fig", caption=False)}</a>
          <div class="frame-copy">
            <span class="tag-code">JP / 0{s["n"]}</span>
            <{heading}><a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a></{heading}>
            <p data-i18n="svc.{s["gid"]}.body">{e(s["body"][0])}</p>
            <span class="tag-note" data-i18n="svcp.free">Free estimate</span>
            <a class="more-link" href="/services/{s["slug"]}/"><span data-i18n="svcp.more">See details</span> →</a>
          </div>
        </li>'''

PRIVACY = [  # (heading_en, heading_es, text_en, text_es)
    ("What we collect", "Qué datos recopilamos",
     "Only what you type into the quote form: your name, email or phone, the address of the job, and anything you tell us about it.",
     "Solo lo que escribe en el formulario de cotización: su nombre, correo o teléfono, la dirección del trabajo y lo que nos cuente sobre él."),
    ("How we use it", "Cómo los usamos",
     "To reply to you, visit, write your estimate and do the job. We never sell or share your details, and we don't send marketing emails.",
     "Para responderle, visitarlo, preparar su presupuesto y hacer el trabajo. Nunca vendemos ni compartimos sus datos, y no enviamos correos publicitarios."),
    ("Where it is kept", "Dónde se guardan",
     "In our job manager, hosted by Cloudflare in the United States. When a request arrives, it is also sent to Joshua's phone through ntfy, a notification service, which keeps the message for about 12 hours and then deletes it.",
     "En nuestro sistema de trabajos, alojado por Cloudflare en Estados Unidos. Cuando llega una solicitud, también se envía al teléfono de Joshua a través de ntfy, un servicio de notificaciones que guarda el mensaje unas 12 horas y luego lo borra."),
    ("Visitor counts", "Conteo de visitas",
     "We count page views to see which pages are useful: the page, the website you came from and the language. No cookies, no IP addresses and nothing that identifies you.",
     "Contamos las visitas para saber qué páginas son útiles: la página, el sitio del que viene y el idioma. Sin cookies, sin direcciones IP y nada que lo identifique."),
    ("Your browser", "Su navegador",
     "If you switch to Spanish, your browser remembers that choice on your own device. That is the only thing the site stores.",
     "Si cambia a español, su navegador recuerda esa elección en su propio dispositivo. Es lo único que guarda el sitio."),
    ("Seeing or deleting your details", "Ver o borrar sus datos",
     "Call or text (510) 369-9079 and we will tell you what we have, correct it or delete it. Records of finished jobs may be kept as long as the law requires for invoices and warranties.",
     "Llame o envíe un mensaje al (510) 369-9079 y le diremos qué datos tenemos, los corregiremos o los borraremos. Los registros de trabajos terminados pueden guardarse el tiempo que exija la ley para facturas y garantías."),
]

def page_h1(sec, h2_id, crumb_key, crumb_en):
    """Turn a shared section's <h2> into the page's <h1> and put breadcrumbs above it."""
    sec = re.sub(rf'<h2 id="{h2_id}"([^>]*)>(.*?)</h2>', rf'<h1 id="{h2_id}"\1>\2</h1>', sec, count=1, flags=re.S)
    crumbs = (f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / '
              f'<span data-i18n="{crumb_key}">{crumb_en}</span></nav>\n    ')
    return re.sub(r'(<div class="block-head">\s*)', lambda m: m.group(1) + crumbs, sec, count=1)

def contact_page(src):
    ES.update({"contactp.meta.title": "Presupuesto gratis y contacto — Joshua's Painting Service",
               "contactp.meta.description": "Pida un presupuesto gratis de pintura o impermeabilización en Hercules, CA. Llame al (510) 369-9079 o envíe el formulario."})
    main = page_h1(section(src, '<section id="quote"'), "quote-title", "nav.contact", "Contact") + "\n\n" + section(src, '<section class="block area"')
    hd = head("/contact/", "contactp.meta.title", "Free estimate & contact — Joshua's Painting Service", "contactp.meta.description",
              "Ask for a free painting or waterproofing estimate in Hercules, CA. Call (510) 369-9079 or send the form.",
              ES["contactp.meta.title"], ES["contactp.meta.description"], ld=[business_ld()])
    return page("/contact/", hd, main, ["site"], has_form=True)

def faq_page(src):
    ES.update({"faqp.meta.title": "Preguntas frecuentes — Joshua's Painting Service", "faqp.by": "Por servicio",
               "faqp.meta.description": "Respuestas sobre presupuestos, tiempos, pagos, garantía y cada servicio de Joshua's Painting Service."})
    groups = []
    for sv in SERVICES:
        g = sv["gid"]
        qs = "\n".join(f'    <details><summary data-i18n="svcp.{g}.q{i}">{e(q)}</summary><p data-i18n="svcp.{g}.a{i}">{e(a)}</p></details>'
                       for i, (q, a, _, _) in enumerate(sv["faq"], 1))
        groups.append(f'''  <h3 class="faq-group"><a href="/services/{sv["slug"]}/" data-i18n="svcp.{g}.h1">{e(sv["h1"][0])}</a></h3>
  <div class="faq-list">
{qs}
  </div>''')
    more = f'''<section class="block faq" aria-labelledby="faq-by">
  <div class="block-head">
    <h2 id="faq-by" data-i18n="faqp.by">By service</h2>
  </div>
{chr(10).join(groups)}
</section>'''
    main = "\n\n".join([page_h1(section(src, '<section id="faq"'), "faq-title", "nav.faq", "FAQ"), more,
                         section(src, '<section class="block cta-end"')])
    hd = head("/faq/", "faqp.meta.title", "Questions — Joshua's Painting Service", "faqp.meta.description",
              "Answers about estimates, timing, payment, warranty and each of Joshua's Painting Service's services.",
              ES["faqp.meta.title"], ES["faqp.meta.description"])
    return page("/faq/", hd, main, [])

def reviews_page(src):
    ES.update({"reviewsp.meta.title": "Reseñas — Joshua's Painting Service", "reviewsp.expect": "Lo que puede esperar",
               "reviewsp.meta.description": "Joshua's Painting Service tiene 5.0 estrellas en Yelp. Lea las reseñas y vea los trabajos."})
    # the reviews page keeps the full promises (the front page shows titles only)
    promises = """<ul class="promises" aria-label="Our promises" data-i18n-attr="aria-label:aria.promises">
  <li><b data-i18n="pr1.title">Insured</b><span data-i18n="pr1.body">General liability insurance on every job.</span></li>
  <li><b data-i18n="pr2.title">Free written estimates</b><span data-i18n="pr2.body">Itemised, and sent as soon as possible after the visit.</span></li>
  <li><b data-i18n="pr3.title">Interior warranty</b><span data-i18n="pr3.body">3 to 6 months on interior work. Peeling or flaking? We come back and fix it.</span></li>
  <li><b data-i18n="pr4.title">Spotless clean-up</b><span data-i18n="pr4.body">Floors covered, rooms swept, every day.</span></li>
</ul>"""
    figs = "\n".join("    " + photo(p) for p in ["petaluma-house", "orinda-deck", "kitchen", "interior-room"])
    main = "\n\n".join([
        page_h1(section(src, '<section id="reviews"'), "reviews-title", "nav.reviews", "Reviews"),
        f'''<section class="block" aria-labelledby="expect-title">
  <div class="block-head"><h2 id="expect-title" data-i18n="reviewsp.expect">What you can expect</h2></div>
</section>
{promises}''',
        f'''<section class="block work" aria-labelledby="jobs-title">
  <div class="block-head">
    <p class="label" data-i18n="work.label">Our work</p>
    <h2 id="jobs-title" data-i18n="work.title">Recent jobs</h2>
  </div>
  <div class="work-grid">
{figs}
  </div>
  <p class="work-more"><a class="btn btn-ghost" href="/work/" data-i18n="workp.all">See all our work</a></p>
</section>''',
        section(src, '<section class="block cta-end"')])
    hd = head("/reviews/", "reviewsp.meta.title", "Reviews — Joshua's Painting Service", "reviewsp.meta.description",
              "Joshua's Painting Service is rated 5.0 stars on Yelp. Read the reviews and see the work.",
              ES["reviewsp.meta.title"], ES["reviewsp.meta.description"], image="petaluma-house")
    return page("/reviews/", hd, main, [])

def privacy_page():
    ES.update({"privacy.title": "Privacidad", "privacy.intro": "En pocas palabras: usamos sus datos solo para su trabajo, y nada más.",
               "privacy.updated": "Actualizado el 19 de noviembre de 2026"})
    parts = []
    for i, (h_en, h_es, p_en, p_es) in enumerate(PRIVACY, 1):
        parts.append(f'    {t(f"privacy.h{i}", h_en, h_es, "h2")}\n    {t(f"privacy.p{i}", p_en, p_es, "p")}')
    main = f'''<section class="block prose" aria-labelledby="privacy-title">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.privacy">Privacy</span></nav>
  <h1 id="privacy-title" data-i18n="privacy.title">Privacy</h1>
  <p class="lede" data-i18n="privacy.intro">In short: we use your details for your job, and nothing else.</p>
{chr(10).join(parts)}
  <p class="muted" data-i18n="privacy.updated">Last updated November 19, 2026</p>
</section>'''
    hd = head("/privacy/", "privacy.meta.title", "Privacy — Joshua's Painting Service", "privacy.meta.description",
              "How Joshua's Painting Service uses the details you send with a quote request.",
              "Privacidad — Joshua's Painting Service", "Cómo usa Joshua's Painting Service los datos que envía al pedir una cotización.")
    return page("/privacy/", hd, main, [])

def not_found_page():
    ES.update({"nf.title": "Esta página no existe", "nf.body": "Puede que la dirección esté mal escrita o que la página se haya movido. Estos enlaces le pueden servir:",
               "nf.home": "Página de inicio"})
    links = "\n".join(f'    <li><a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a></li>' for s in SERVICES)
    main = f'''<section class="block prose nf" aria-labelledby="nf-title">
  <p class="label">404</p>
  <h1 id="nf-title" data-i18n="nf.title">Sorry, that page isn't here</h1>
  <p class="lede" data-i18n="nf.body">The address may be mistyped, or the page has moved. These might help:</p>
  <ul class="nf-links">
    <li><a href="/" data-i18n="nf.home">Home page</a></li>
{links}
    <li><a href="/work/" data-i18n="nav.work">Our work</a></li>
    <li><a href="/#quote" data-i18n="nav.quote">Free quote</a></li>
  </ul>
  <p><a class="btn" href="tel:{PHONE_TEL}"><span data-i18n="util.call">Call</span> {PHONE}</a></p>
</section>'''
    hd = head("/404.html", "nf.meta.title", "Page not found — Joshua's Painting Service", "nf.meta.description",
              "This page doesn't exist.", "Página no encontrada — Joshua's Painting Service", "Esta página no existe.", noindex=True)
    page("/404.html", hd, main, [], out_file="404.html")

SHORT = {  # one line per service for the front page (EN, ES)
    "interior": ("Walls, ceilings, trim and doors.", "Paredes, techos, molduras y puertas."),
    "exterior": ("Siding, stucco, trim, decks and fences.", "Revestimiento, estuco, molduras, terrazas y cercas."),
    "cabinets": ("Kitchen cabinets and bathroom vanities.", "Gabinetes de cocina y muebles de baño."),
    "walls": ("Patching, texture and wallpaper removal.", "Resanes, textura y retiro de papel tapiz."),
    "water": ("Sealing decks, masonry and walls.", "Sellado de terrazas, mampostería y muros."),
    "commercial": ("Offices, shops and rentals, after hours.", "Oficinas, tiendas y rentas, fuera de horario."),
}

def landing():
    """Front page body, in the order visitors decide: what we do → proof → how it works.
    Each part is a short preview that links to its own page."""
    ES.update({"home.svc.label": "Lo que hacemos", "home.svc.title": "Seis tipos de trabajo",
               "home.work.title": "Trabajos recientes", "home.rev.body": "Todos los clientes que nos han reseñado en Yelp nos dieron cinco estrellas.",
               "home.rev.read": "Leer las reseñas", "home.story.more": "Leer nuestra historia",
               "home.story": "Joshua empezó a pintar con su familia de adolescente y lleva más de diez años con su propio equipo en el Área de la Bahía. Visita cada trabajo en persona, escribe cada presupuesto y revisa con usted el trabajo terminado."})
    ES["hero.short"] = "Casas y negocios, pintados con cuidado."
    rows = []
    for i, sv in enumerate(SERVICES, 1):
        g = sv["gid"]
        rows.append(f'''    <a href="/services/{sv["slug"]}/"><span class="svc-n">0{i}</span><span data-i18n="svcp.{g}.h1">{e(sv["h1"][0])}</span><span class="svc-arrow" aria-hidden="true">→</span></a>''')
    return f'''<!-- explore -->
<section class="block home-services" aria-labelledby="home-svc-title">
  <div class="block-head">
    <h2 id="home-svc-title" data-i18n="home.svc.label">What we do</h2>
  </div>
  <nav class="svc-list" aria-labelledby="home-svc-title">
{chr(10).join(rows)}
  </nav>
</section>

<section class="block home-story" aria-labelledby="home-story-title">
  <div class="story-grid">
    {photo("crew-prep", "story-photo", caption=False).replace('<figure class="story-photo"', '<figure class="story-photo" data-slides="5200"').replace("<img ", '<img class="on" ', 1).replace("</figure>", '<img data-srcset="/img/work/petaluma-house-600.webp 600w, /img/work/petaluma-house.webp 750w" sizes="(max-width: 960px) 100vw, 40vw" width="750" height="1000" alt=""><img data-srcset="/img/work/drywall-prep-600.webp 600w, /img/work/drywall-prep.webp 750w" sizes="(max-width: 960px) 100vw, 40vw" width="750" height="1000" alt=""></figure>')}
    <div>
      <p class="label" data-i18n="about.label">About us</p>
      <h2 id="home-story-title" data-i18n="about.title">A family crew from Hercules</h2>
      <p class="story-text" data-i18n="home.story">Joshua started painting with his family as a teenager and has run his own crew in the Bay Area for more than ten years. He visits every job himself, writes every estimate and walks through the finished work with you.</p>
      <ul class="stats">
        <li><b>10+</b><span data-i18n="about.s1">years painting in the Bay Area</span></li>
        <li><b>350+</b><span data-i18n="about.s2">homes and businesses painted</span></li>
        <li><b>5.0</b><span data-i18n="about.s3">stars on Yelp</span></li>
      </ul>
      <p class="story-more"><a class="btn btn-ghost" href="/about/"><span data-i18n="home.story.more">Read our story</span> →</a></p>
    </div>
  </div>
</section>
<!-- /explore -->'''

# ───────────────────────── pages ─────────────────────────
def build():
    src = (PUB / "index.html").read_text(encoding="utf-8")
    ES["social.fb"] = "Joshua Painting JM Waterproofing"
    ES["cta.area"] = "Trabajamos en Hercules, Berkeley, Oakland, Alameda, Concord y el East Bay."
    ES.update({"about.s4n": "3–6 meses", "q8": "¿Tienen seguro?",
               "a8": "Sí. Tenemos seguro de responsabilidad civil general, así que su casa o negocio está cubierto mientras trabajamos."})
    ES["f.privacy"] = 'Solo usamos sus datos para responderle sobre su trabajo. <a href="/privacy/">Privacidad</a>'
    if 'data-i18n-html="f.privacy"' not in src:
        src = src.replace('      <div class="form-foot wide">',
                          '      <p class="form-note wide" data-i18n-html="f.privacy">We only use your details to reply about your job. '
                          '<a href="/privacy/">Privacy</a></p>\n\n      <div class="form-foot wide">', 1)
    for s in SERVICES:
        ES[f"svcp.{s['gid']}.h1"] = s["h1"][1]
    built = []

    # /services/<slug>/
    ES.update({"crumb.home": "Inicio", "svcp.included": "Qué incluye", "svcp.others": "Otros servicios",
               "svcp.faq": "Preguntas sobre este servicio"})
    for s in SERVICES:
        g = s["gid"]
        ES[f"svcp.{g}.lede"] = s["lede"][1]
        items = "\n".join(f'      <li data-i18n="svc.{g}.i{j}">{e(it)}</li>' for j, it in enumerate(s["items"], 1))
        gallery = ""
        if len(s["photos"]) > 1:
            figs = "\n".join("    " + photo(p) for p in s["photos"][1:])
            gallery = f'''<section class="block work" aria-labelledby="jobs-title">
  <div class="block-head">
    <p class="label" data-i18n="work.label">Our work</p>
    <h2 id="jobs-title" data-i18n="work.title">Recent jobs</h2>
  </div>
  <div class="work-grid">
{figs}
  </div>
  <p class="work-more"><a class="btn btn-ghost" href="/work/" data-i18n="workp.all">See all our work</a></p>
</section>
'''
        faqs = []
        for i, (q, a, qes, aes) in enumerate(s["faq"], 1):
            faqs.append(f'    <details><summary data-i18n="svcp.{g}.q{i}">{e(q)}</summary><p data-i18n="svcp.{g}.a{i}">{e(a)}</p></details>')
            ES[f"svcp.{g}.q{i}"], ES[f"svcp.{g}.a{i}"] = qes, aes
        others = "\n".join(service_card(o) for o in SERVICES if o is not s)
        main = f'''<section class="svc-hero" aria-labelledby="svc-h1">
  <div class="svc-hero-copy">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <a href="/services/" data-i18n="nav.services">Services</a> / <span data-i18n="svcp.{g}.h1">{e(s["h1"][0])}</span></nav>
    <p class="label"><span>JP / 0{s["n"]}</span> · <span data-i18n="svcp.free">Free estimate</span></p>
    <h1 id="svc-h1" data-i18n="svcp.{g}.h1">{e(s["h1"][0])}</h1>
    <p class="lede" data-i18n="svcp.{g}.lede">{e(s["lede"][0])}</p>
    <p class="label" data-i18n="svcp.included">What's included</p>
    <ul class="svc-list">
{items}
    </ul>
    <div class="hero-actions">
      <a class="btn" href="#quote" data-cta data-i18n="hero.cta">Get a free quote</a>
      <a class="btn btn-ghost" href="tel:{PHONE_TEL}"><span data-i18n="util.call">Call</span> {PHONE}</a>
    </div>
    {rating()}
  </div>
  {photo(s["hero"], "svc-hero-photo", lazy=False)}
</section>

{gallery}
{steps()}

<section class="block faq" aria-labelledby="svc-faq-title">
  <div class="block-head">
    <p class="label" data-i18n="faq.label">Questions</p>
    <h2 id="svc-faq-title" data-i18n="svcp.faq">Questions about this service</h2>
  </div>
  <div class="faq-list">
{chr(10).join(faqs)}
  </div>
</section>

<section class="reel" aria-labelledby="others-title">
  <div class="block-head reel-head">
    <p class="label" data-i18n="svcp.others">Other services</p>
    <h2 id="others-title" data-i18n="svc.title">Everything we paint, patch and protect</h2>
  </div>
  <ol class="frames">
{others}
  </ol>
</section>

{quote_section(src, s["scope"])}'''
        path = f"/services/{s['slug']}/"
        hd = head(path, f"svcp.{g}.meta", f"{s['h1'][0]} in Hercules, CA — Joshua's Painting Service", f"svcp.{g}.lede", s["lede"][0],
                  f"{s['h1'][1]} en Hercules, CA — Joshua's Painting Service", s["lede"][1], image=s["hero"],
                  ld=[{"@context": "https://schema.org", "@type": "Service", "serviceType": s["h1"][0], "name": s["h1"][0],
                       "description": s["lede"][0], "url": SITE + path, "provider": {"@id": BUSINESS_ID},
                       "areaServed": AREAS},
                      crumbs_ld([("Home", "/"), ("Services", "/services/"), (s["h1"][0], path)])])
        built.append(page(path, hd, main, ["site"], has_form=True))

    # /services/ overview
    cards = "\n".join(service_card(s, "h2") for s in SERVICES)
    main = f'''<section class="block svc-intro" aria-labelledby="svc-title">
  <div class="block-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.services">Services</span></nav>
    <p class="label" data-i18n="svc.label">Services</p>
    <h1 id="svc-title" data-i18n="svc.title">Everything we paint, patch and protect</h1>
    <p class="muted" data-i18n="svc.intro">Homes and businesses in and around Hercules, CA. No job too big or too small. Pick what you need and ask for a free estimate: we come out, measure and send you a written price.</p>
    {rating()}
  </div>
</section>

<section class="reel" aria-label="Services">
  <ol class="frames frames-pages">
{cards}
  </ol>
</section>

{steps()}

<section class="block svc-end">
  <div class="block-head">
    <h2 data-i18n="svc.end.title">Don't see your job here?</h2>
    <p class="muted" data-i18n="svc.end.body">Ask anyway. If it involves paint, stain or keeping water out, we can probably help, and if we can't we'll tell you who can.</p>
  </div>
  <div class="hero-actions">
    <a class="btn" href="/contact/" data-cta data-i18n="hero.cta">Get a free quote</a>
    <a class="btn btn-ghost" href="tel:{PHONE_TEL}"><span data-i18n="util.call">Call</span> {PHONE}</a>
  </div>
</section>'''
    hd = head("/services/", "svc.meta.title", "Services — Joshua's Painting Service", "svc.meta.description",
              "Everything Joshua's Painting Service does in Hercules, CA: interior and exterior painting, decks, fences, staining, cabinets, wall repair and texturing, wallpaper removal, waterproofing and commercial work.",
              "Servicios — Joshua's Painting Service",
              "Todo lo que hace Joshua's Painting Service en Hercules, CA: pintura de interiores y exteriores, terrazas, cercas, teñido, gabinetes, reparación y textura de paredes, retiro de papel tapiz, impermeabilización y trabajos comerciales.",
              ld=[crumbs_ld([("Home", "/"), ("Services", "/services/")])])
    built.append(page("/services/", hd, main, []))

    # /work/
    cats = [("all", "All", "Todos"), ("interior", "Interior", "Interiores"), ("exterior", "Exterior", "Exteriores"),
            ("decks", "Decks", "Terrazas"), ("commercial", "Commercial", "Comercial"), ("prep", "Prep & repair", "Preparación y reparación")]
    chips = "\n".join(f'    <button type="button" data-filter="{c}" aria-pressed="{str(c == "all").lower()}" data-i18n="workp.f.{c}">{e(en)}</button>' for c, en, es in cats)
    for c, en, es in cats:
        ES[f"workp.f.{c}"] = es
    figs = "\n".join("    " + photo(p) for p in PHOTOS)
    ES.update({"workp.title": "Trabajos terminados", "workp.filter": "Filtrar fotos", "workp.all": "Ver todo nuestro trabajo",
               "workp.intro": "Fotos reales del equipo de Joshua: interiores, exteriores, terrazas y negocios en el Área de la Bahía."})
    main = f'''<section class="block work work-page" aria-labelledby="work-h1">
  <div class="block-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.work">Our work</span></nav>
    <p class="label" data-i18n="work.label">Our work</p>
    <h1 id="work-h1" data-i18n="workp.title">Jobs we've finished</h1>
    <p class="muted" data-i18n="workp.intro">Real photos from Joshua's crew: interiors, exteriors, decks and businesses around the Bay Area.</p>
  </div>
  <div class="filters" role="group" aria-label="Filter photos" data-i18n-attr="aria-label:workp.filter">
{chips}
  </div>
  <div class="work-grid">
{figs}
  </div>
  <p class="work-more"><a href="{YELP}" target="_blank" rel="noopener" data-i18n="work.more">See more photos on Yelp</a></p>
</section>

{section(src, '<section class="block cta-end"')}'''
    hd = head("/work/", "workp.meta.title", "Our work — Joshua's Painting Service", "workp.meta.description",
              "Photos of interior, exterior, deck and commercial painting jobs by Joshua's Painting Service in Hercules and around the Bay Area.",
              "Nuestro trabajo — Joshua's Painting Service",
              "Fotos de trabajos de pintura de interiores, exteriores, terrazas y locales comerciales de Joshua's Painting Service en Hercules y el Área de la Bahía.",
              image="orinda-deck")
    built.append(page("/work/", hd, main, ["work"]))

    # /about/
    about = section(src, '<section id="about"')
    about = about.replace('<h2 id="about-title" data-i18n="about.title">', '<h1 id="about-title" data-i18n="about.title">', 1)
    about = re.sub(r'(<h1 id="about-title"[^>]*>[^<]*)</h2>', r'\1</h1>', about, 1)
    about = about.replace('<div class="about-grid">',
                          '<nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.about">About</span></nav>\n  <div class="about-grid">', 1)
    about = about.replace(' loading="lazy"', "", 1)
    main = "\n\n".join([about, section(src, '<section id="method"'), section(src, '<section class="block cta-end"')])
    hd = head("/about/", "aboutp.meta.title", "About — Joshua's Painting Service", "aboutp.meta.description",
              "Joshua's Painting Service is a family painting and waterproofing crew from Hercules, CA, rated 5.0 on Yelp.",
              "Nosotros — Joshua's Painting Service",
              "Joshua's Painting Service es un equipo familiar de pintura e impermeabilización de Hercules, CA, con 5.0 en Yelp.",
              image="crew-prep", ld=[business_ld()])
    built.append(page("/about/", hd, main, []))

    # /contact/, /faq/, /reviews/
    built += [contact_page(src), faq_page(src), reviews_page(src)]

    # /privacy/
    built.append(privacy_page())

    # 404 (served by Cloudflare for any address that doesn't exist; not in the sitemap)
    not_found_page()

    # home page: shared header/footer, service cards link to their pages
    home = src
    home = re.sub(r'<header class="top">.*?</header>', lambda m: header(), home, count=1, flags=re.S)
    home = re.sub(r'<footer class="foot">.*?</footer>\n\n<!-- phones:[^\n]*\n<div class="dock">.*?</div>', lambda m: footer(), home, count=1, flags=re.S)
    ES.update({"home.svc.title": "Seis tipos de trabajo", "hero.work": "Ver nuestro trabajo", "cta.title": "¿Listo para su presupuesto gratis?",
               "cta.body": "Cuéntenos sobre el trabajo y vamos, medimos y le enviamos un precio por escrito. Sin costo ni presión."})
    home_tiles = landing()
    if "<!-- explore -->" in home:
        home = re.sub(r"<!-- explore -->.*?<!-- /explore -->", lambda m: home_tiles, home, flags=re.S)
    else:
        k = home.index("</ul>", home.index('<ul class="promises"')) + len("</ul>")
        home = home[:k] + "\n\n" + home_tiles + home[k:]
    home_seo = seo("/", "Joshua's Painting Service — Painting & waterproofing in Hercules, CA",
                   "Interior and exterior painting, cabinets, decks, wall repair and waterproofing for homes and businesses in Hercules and the Bay Area. Free estimates. 5.0 on Yelp.",
                   "cape-cod-exterior", [business_ld()])
    if "<!-- seo -->" in home:
        home = re.sub(r"<!-- seo -->.*?<!-- /seo -->\n", lambda m: home_seo, home, flags=re.S)
    else:
        home = home.replace('<link rel="icon"', home_seo + '<link rel="icon"', 1)
    home = localize(home, "/", has_form=True)
    (PUB / "index.html").write_text(home, encoding="utf-8")

    # Spanish → i18n.js, between markers (replaced on every run)
    i18n = PUB / "js" / "i18n.js"
    js = i18n.read_text(encoding="utf-8")
    block = "    // <generated-pages> (tools/build_pages.py — edit there, not here)\n" + \
            "".join(f"    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},\n" for k, v in sorted(ES.items())) + \
            "    // </generated-pages>\n"
    if "// <generated-pages>" in js:
        js = re.sub(r"    // <generated-pages>.*?// </generated-pages>\n", lambda m: block, js, flags=re.S)
    else:
        anchor = '    "nav.quote.short"'
        assert js.count(anchor) == 1
        js = js.replace(anchor, block + anchor)
    i18n.write_text(js, encoding="utf-8")

    # sitemap + robots
    urls = ["/"] + built
    (PUB / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "".join(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")
    (PUB / "robots.txt").write_text(f"User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    print("built:", ", ".join(urls))

if __name__ == "__main__":
    build()
