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
SITE = "https://joshuapaintingjm.com"
YELP = "https://www.yelp.com/biz/joshua-painting-jm-waterproofing-hercules"
FACEBOOK = "https://www.facebook.com/p/Joshua-Painting-JM-Waterproofing-100094531236267/"
# Licence and BBB: fill these in with Josué's real details and rebuild; the footer line
# appears on every page only when they are set. Check them first at
# https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx and https://www.bbb.org
LICENSE = ""   # CSLB licence number, e.g. "1234567"
BBB = ""       # full BBB profile address, e.g. "https://www.bbb.org/us/ca/hercules/profile/..."
CITY_LICENSE = "233556"   # city business licence (NOT a CSLB contractor licence; shown as such)

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
        "name": "Joshua Painting JM & Waterproofing", "alternateName": ["Joshua Painting JM Waterproofing", "Joshua's Painting Service"],  # old site name, so searches for it still match
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
    # with a caption underneath, the caption describes the photo; alt text would only repeat it
    alt = 'alt=""' if caption else f'alt="{e(en)}" data-i18n-attr="alt:{key}"'
    img = f'<img src="/img/work/{name}.jpg" width="{w}" height="{h}" {alt}{lazy_attr} decoding="async">'
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
         hero="interior-bedroom", photos=["interior-bedroom", "interior-room", "interior-door", "surface-prep"],
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
    dict(slug="wall-repair", gid="walls", scope="walls", n=4,
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
    dict(slug="waterproofing", gid="water", scope="waterproofing", n=5,
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
         hero="commercial-accent-wall", photos=["commercial-accent-wall", "commercial-project"],
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
  <a class="mark" href="/" aria-label="Joshua Painting JM & Waterproofing home" data-i18n-attr="aria-label:aria.home">
Joshua Painting JM & Waterproofing</a>
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
    <div class="menu-row"><a href="/services/" data-i18n="nav.services">Services</a><button class="menu-expand" type="button" aria-expanded="false" aria-controls="menu-sub" aria-label="Show services" data-i18n-attr="aria-label:nav.showServices"><span aria-hidden="true"></span></button></div>
    <div class="menu-sub" id="menu-sub" hidden>
{sub}
    </div>
    <a href="/work/" data-i18n="nav.work">Our work</a>
    <a href="/about/" data-i18n="nav.about">About</a>
    <a href="/reviews/" data-i18n="nav.reviews">Reviews</a>
    <a href="/faq/" data-i18n="nav.faq">FAQ</a>
    <a href="/contact/" data-i18n="nav.contact">Contact</a>
    <div class="menu-foot">
      <span class="lang menu-lang" role="group" aria-label="Language" data-i18n-attr="aria-label:aria.lang" hidden><a href="?lang=en" data-lang="en" lang="en" aria-current="true">English</a><a href="?lang=es" data-lang="es" lang="es">Español</a></span>
      <a class="menu-call" href="tel:{PHONE_TEL}">{PHONE}</a>
    </div>
  </nav>
</header>'''

def credentials():
    """Licence and BBB line for the footer, shown only once LICENSE / BBB are filled in."""
    ES["foot.lic"] = "Licencia de contratista de CA"
    ES["foot.citylic"] = "Licencia comercial municipal"
    parts = []
    if CITY_LICENSE:
        parts.append(f'<span><span data-i18n="foot.citylic">City business licence</span> #{e(CITY_LICENSE)}</span>')
    if LICENSE:
        parts.append(f'<a href="https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum={e(LICENSE)}" '
                     f'target="_blank" rel="noopener"><span data-i18n="foot.lic">CA contractor licence</span> #{e(LICENSE)}</a>')
    if BBB:
        parts.append(f'<a href="{e(BBB)}" target="_blank" rel="noopener">BBB</a>')
    return f'\n    <p class="foot-cred">{" · ".join(parts)}</p>' if parts else ""

def footer():
    svc = "\n".join(f'        <a href="/services/{s["slug"]}/" data-i18n="svcp.{s["gid"]}.h1">{e(s["h1"][0])}</a>' for s in SERVICES)
    ES["foot.services"] = "Servicios"
    ES["foot.company"] = "Empresa"
    ES["nav.privacy"] = "Privacidad"
    ES["nav.contact"] = "Contacto"
    ES["foot.follow"] = "Síganos en"
    ES.update({"foot.contact": "Contacto", "foot.tag": "Pintura e impermeabilización para casas y negocios en el Área de la Bahía.",
               "foot.area": "Hercules y el East Bay", "foot.rights": "Hercules, CA"})
    year = __import__("datetime").date.today().year
    return f'''<footer class="foot">
  <div class="foot-main">
    <div class="foot-brand">
      <span class="mark">Joshua Painting JM & Waterproofing</span>
      <p class="muted" data-i18n="foot.tag">Painting and waterproofing for homes and businesses around the Bay Area.</p>
      <p class="foot-social"><span data-i18n="foot.follow">Follow us</span> <a href="{FACEBOOK}" target="_blank" rel="noopener">Facebook</a> · <a href="{YELP}" target="_blank" rel="noopener">Yelp</a></p>{credentials()}
    </div>
    <nav class="foot-cols" aria-label="Footer" data-i18n-attr="aria-label:aria.foot">
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
      </div>
      <div class="foot-reach">
        <p class="label" data-i18n="foot.contact">Contact</p>
        <a class="foot-phone" href="tel:{PHONE_TEL}">{PHONE}</a>
        <span data-i18n="util.hours">Mon–Sat · 8 am – 7 pm</span>
        <span data-i18n="foot.area">Hercules and the East Bay</span>
        <a class="btn btn-ghost foot-cta" href="/contact/" data-cta data-i18n="nav.quote">Free quote</a>
      </div>
    </nav>
  </div>
  <div class="foot-bottom">
    <span>© {year} Joshua Painting JM & Waterproofing · <span data-i18n="foot.rights">Hercules, CA</span></span>
    <span><a href="/privacy/" data-i18n="nav.privacy">Privacy</a> · <a href="/admin/">Studio login</a></span>
  </div>
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
    if path == "/contact/":   # the form is right there, so the phone bar keeps only Call
        html = html.replace('<div class="dock">', '<div class="dock dock-call-only">', 1)
    return webp(hreflang(html))

def hreflang(html):
    """Search engines need full addresses in hreflang links, plus an x-default."""
    if 'name="robots" content="noindex' in html:   # e.g. the 404 page: no language alternates
        return re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', "", html)
    html = re.sub(r'(<link rel="alternate" hreflang="(?:en|es|x-default)" href=")(/[^"]*")', rf'\1{SITE}\2', html)
    if 'hreflang="x-default"' not in html:
        html = re.sub(r'(<link rel="alternate" hreflang="en" href="([^"]*)">\n)',
                      r'\1<link rel="alternate" hreflang="x-default" href="\2">\n', html, count=1)
    return html

# how wide each kind of photo is drawn, so phones download a small file
SIZES = {"wall-photo": "100vw", "panel-photo": "100vw", "story-photo": "(max-width: 960px) 100vw, 40vw", "about-photo": "(max-width: 960px) 100vw, 40vw",
         "area-photo": "(max-width: 960px) 100vw, 35vw", "svc-hero-photo": "(max-width: 960px) 100vw, 50vw",
         "frame-fig": "(max-width: 960px) 100vw, 45vw"}

def webp(html):
    """Swap job-photo JPEGs for WebP (made by tools/make_webp.py) with a 600 / 800 / full srcset."""
    def sub(m):
        attrs, name, w = m.group(1), m.group(2), int(m.group(3))
        before = html[max(0, m.start() - 160): m.start()] + attrs
        sizes = next((v for k, v in SIZES.items() if k in before.rsplit("<figure", 1)[-1] or f'class="{k}"' in attrs), "(max-width: 960px) 50vw, 25vw")
        if 'style="aspect-ratio' in attrs:   # /work/ rows: drawn at a fixed height, so up to ~620 px wide
            sizes = "(max-width: 620px) 82vw, 620px"
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
    html += "".join(f'<script src="/js/{s}.js" defer></script>\n' for s in ["i18n", "menu", "reveal"] + (["lightbox"] if 'class="work-item"' in main else []) + scripts)
    html += "</body>\n</html>\n"
    html = localize(html, path, has_form)
    out = PUB / out_file if out_file else PUB / path.strip("/") / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return path

def quote_section(src, scope):
    ES.update({"q.step": "Paso", "q.s1": "¿En qué le podemos ayudar?", "q.s2": "Cuéntenos sobre el trabajo",
               "q.s2hint": "Todo es opcional. Omita lo que prefiera explicar por teléfono.", "q.s3": "¿Cómo lo contactamos?",
               "q.next": "Siguiente", "q.back": "Atrás", "scope.walls": "Reparación de paredes", "scope.waterproofing": "Impermeabilización",
               "done.label": "Solicitud enviada", "done.title": "Gracias",
               "done.body": "Josué le llamará o le enviará un mensaje lo antes posible para agendar una visita gratis. Sin costo ni presión."})
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
    ES.update({"contactp.meta.title": "Presupuesto gratis y contacto — Joshua Painting JM & Waterproofing",
               "contactp.meta.description": "Pida un presupuesto gratis de pintura o impermeabilización en Hercules, CA. Llame al (510) 369-9079 o envíe el formulario."})
    main = page_h1(section(src, '<section id="quote"'), "quote-title", "nav.contact", "Contact") + "\n\n" + section(src, '<section class="block area"')
    hd = head("/contact/", "contactp.meta.title", "Free estimate & contact — Joshua Painting JM & Waterproofing", "contactp.meta.description",
              "Ask for a free painting or waterproofing estimate in Hercules, CA. Call (510) 369-9079 or send the form.",
              ES["contactp.meta.title"], ES["contactp.meta.description"], ld=[business_ld()])
    return page("/contact/", hd, main, ["site"], has_form=True)

def faq_page(src):
    ES.update({"faqp.meta.title": "Preguntas frecuentes — Joshua Painting JM & Waterproofing", "faqp.by": "Por servicio",
               "faqp.meta.description": "Respuestas sobre presupuestos, tiempos, pagos, garantía y cada servicio de Joshua Painting JM & Waterproofing."})
    groups = []
    for sv in SERVICES:
        g = sv["gid"]
        qs = "\n".join(f'    <details><summary data-i18n="svcp.{g}.q{i}">{e(q)}</summary><p data-i18n="svcp.{g}.a{i}">{e(a)}</p></details>'
                       for i, (q, a, _, _) in enumerate(sv["faq"], 1))
        groups.append(f'''  <h3 class="faq-group"><a href="/services/{sv["slug"]}/" data-i18n="svcp.{g}.h1">{e(sv["h1"][0])}</a></h3>
  <div class="faq-list">
{qs}
  </div>''')
    # two columns on computers: a side panel that stays put (title, topics, help) + all the questions
    ES.update({"faqp.h1": "Preguntas frecuentes", "faqp.intro": "Respuestas rápidas sobre presupuestos, tiempos, pagos y cada servicio.",
               "faqp.topics": "Temas", "faqp.general": "Generales", "faqp.help": "¿Tiene otra pregunta?",
               "faqp.helpbody": "Llámenos o pida un presupuesto gratis; respondemos lo antes posible."})
    general = section(src, '<section id="faq"')
    general_list = general[general.index('<div class="faq-list">'): general.rindex("</div>") + len("</div>")]
    toc = "\n".join(['        <a href="#faq-general" data-i18n="faqp.general">General</a>'] +
                     [f'        <a href="#faq-{sv["slug"]}" data-i18n="svcp.{sv["gid"]}.h1">{e(sv["h1"][0])}</a>' for sv in SERVICES])
    for k, sv in enumerate(SERVICES):
        groups[k] = groups[k].replace('<h3 class="faq-group">', f'<h3 class="faq-group" id="faq-{sv["slug"]}">', 1)
    faq = f'''<section class="block faq faq-page" aria-labelledby="faq-h1">
  <header class="faq-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.faq">FAQ</span></nav>
    <h1 id="faq-h1" data-i18n="faqp.h1">Questions &amp; answers</h1>
    <p class="muted" data-i18n="faqp.intro">Quick answers about estimates, timing, payment and each service.</p>
  </header>
  <div class="faq-layout">
    <aside class="faq-side">
      <nav class="faq-toc" aria-label="Topics" data-i18n-attr="aria-label:faqp.topics">
{toc}
      </nav>
      <div class="faq-help">
        <p class="faq-help-title" data-i18n="faqp.help">Still have a question?</p>
        <p class="muted" data-i18n="faqp.helpbody">Call us or ask for a free quote; we reply as soon as possible.</p>
        <div class="faq-help-actions">
          <a class="btn" href="/contact/" data-cta data-i18n="nav.quote">Free quote</a>
          <a class="btn btn-ghost" href="tel:{PHONE_TEL}">{PHONE}</a>
        </div>
      </div>
    </aside>
    <div class="faq-main">
      <h2 class="faq-group faq-first" id="faq-general" data-i18n="faqp.general">General</h2>
  {general_list}
      <h2 class="faq-by" id="faq-by" data-i18n="faqp.by">By service</h2>
{chr(10).join(groups)}
    </div>
  </div>
</section>'''
    main = faq   # the side panel already has Call / Free quote, so no second call-to-action block here
    hd = head("/faq/", "faqp.meta.title", "Questions — Joshua Painting JM & Waterproofing", "faqp.meta.description",
              "Answers about estimates, timing, payment, warranty and each of Joshua Painting JM & Waterproofing's services.",
              ES["faqp.meta.title"], ES["faqp.meta.description"])
    return page("/faq/", hd, main, [])


# ───────────────────────── customer quotes (tools/reviews.json) ─────────────────────────
# Only quotes marked "approved" (customer agreed) are shown; names are never shown.
MONTHS = {"en": "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(),
          "es": "ene feb mar abr may jun jul ago sep oct nov dic".split()}
JOB = {"interior": ("Interior painting", "Pintura de interiores"), "exterior": ("Exterior painting", "Pintura de exteriores"),
       "cabinets": ("Cabinet painting", "Pintura de gabinetes"), "walls": ("Wall repair", "Reparación de paredes"),
       "waterproofing": ("Waterproofing", "Impermeabilización"), "commercial": ("Commercial painting", "Pintura comercial")}

def approved_reviews():
    import json
    data = json.loads((Path(__file__).resolve().parent / "reviews.json").read_text(encoding="utf-8"))
    return [r for r in data["reviews"] if r.get("approved")]

def review_meta(r, i):
    y, m = r["date"].split("-")
    when_en, when_es = f'{MONTHS["en"][int(m) - 1]} {y}', f'{MONTHS["es"][int(m) - 1]} {y}'
    job_en, job_es = JOB.get(r.get("job", ""), ("", ""))
    en = " · ".join(x for x in ["Yelp review", job_en, when_en] if x)
    es = " · ".join(x for x in ["Reseña en Yelp", job_es, when_es] if x)
    ES[f"rv.meta.{i}"] = es
    return f'<span data-i18n="rv.meta.{i}">{e(en)}</span>'

def testimonials():
    """The "What people say about us" section; empty until a quote is approved."""
    revs = approved_reviews()
    if not revs:
        return ""
    ES.update({"rv.say": "Lo que dicen de nosotros", "rv.all": "Leer todas las reseñas en Yelp",
               "rv.en": "Reseñas originales en inglés."})
    cards = "\n".join(f'''    <figure class="tm">
      <p class="tm-stars"><span class="stars" aria-hidden="true">{"★" * r["stars"]}</span><span class="sr-only">{r["stars"]} / 5</span></p>
      <blockquote lang="en"><p>{e(r["text"])}</p></blockquote>
      <figcaption>{review_meta(r, i)}</figcaption>
    </figure>''' for i, r in enumerate(revs))
    return f'''<section class="block testimonials" aria-labelledby="say-title">
  <div class="block-head">
    <h2 id="say-title" data-i18n="rv.say">What people say about us</h2>
    <p class="muted es-only" data-i18n="rv.en"></p>
  </div>
  <div class="tm-row">
{cards}
  </div>
  <p class="work-more"><a href="{YELP}" target="_blank" rel="noopener"><span data-i18n="rv.all">Read all our reviews on Yelp</span> →</a></p>
</section>'''


def reviews_top():
    """Reviews page opening when there are approved quotes: title, rating, quotes, then Yelp link."""
    revs = approved_reviews()
    if not revs:
        return ""
    ES.update({"rv.say": "Lo que dicen de nosotros", "rv.rating": "5.0 en Yelp: todos los clientes que nos han reseñado nos dieron cinco estrellas.",
               "rv.en": "Reseñas originales en inglés.", "rv.yelp": "Leer todas las reseñas en Yelp"})
    cards = "\n".join(f'''    <figure class="tm">
      <p class="tm-stars"><span class="stars" aria-hidden="true">{"★" * r["stars"]}</span><span class="sr-only">{r["stars"]} / 5</span></p>
      <blockquote lang="en"><p>{e(r["text"])}</p></blockquote>
      <figcaption>{review_meta(r, i)}</figcaption>
    </figure>''' for i, r in enumerate(revs))
    return f'''<section class="block testimonials reviews-top" aria-labelledby="reviews-h1">
  <div class="block-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.reviews">Reviews</span></nav>
    <h1 id="reviews-h1" data-i18n="rv.say">What people say about us</h1>
    <p class="rv-rating"><span class="stars" aria-hidden="true">★★★★★</span> <span data-i18n="rv.rating">5.0 on Yelp: every customer who has reviewed us gave five stars.</span></p>
    <p class="muted es-only" data-i18n="rv.en"></p>
  </div>
  <div class="tm-row">
{cards}
  </div>
  <p class="rv-yelp"><a class="btn btn-ghost" href="{YELP}" target="_blank" rel="noopener"><span data-i18n="rv.yelp">Read all our reviews on Yelp</span> →</a></p>
</section>'''

def reviews_page(src):
    ES.update({"reviewsp.meta.title": "Reseñas — Joshua Painting JM & Waterproofing", "reviewsp.expect": "Lo que puede esperar",
               "reviewsp.meta.description": "Joshua Painting JM & Waterproofing tiene 5.0 estrellas en Yelp. Lea las reseñas y vea los trabajos."})
    # the reviews page keeps the full promises (the front page shows titles only)
    promises = """<ul class="promises" aria-label="Our promises" data-i18n-attr="aria-label:aria.promises">
  <li><a href="/faq/#insured"><b data-i18n="pr1.title">Insured</b><span data-i18n="pr1.body">General liability insurance on every job.</span></a></li>
  <li><a href="/contact/"><b data-i18n="pr2.title">Free written estimates</b><span data-i18n="pr2.body">Itemised, and sent as soon as possible after the visit.</span></a></li>
  <li><a href="/faq/#warranty"><b data-i18n="pr3.title">Interior warranty</b><span data-i18n="pr3.body">3 to 6 months on interior work. Peeling or flaking? We come back and fix it.</span></a></li>
  <li><a href="/faq/#cleanup"><b data-i18n="pr4.title">Spotless clean-up</b><span data-i18n="pr4.body">Floors covered, rooms swept, every day.</span></a></li>
</ul>"""
    figs = "\n".join("    " + photo(p) for p in ["petaluma-house", "orinda-deck", "kitchen", "interior-room"])
    main = "\n\n".join(x for x in [
        # with approved quotes: title on top, quotes, Yelp link at the bottom; otherwise the rating card
        reviews_top() or page_h1(section(src, '<section id="reviews"'), "reviews-title", "nav.reviews", "Reviews"),
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
        section(src, '<section class="block cta-end"')] if x)
    hd = head("/reviews/", "reviewsp.meta.title", "Reviews — Joshua Painting JM & Waterproofing", "reviewsp.meta.description",
              "Joshua Painting JM & Waterproofing is rated 5.0 stars on Yelp. Read the reviews and see the work.",
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
    hd = head("/privacy/", "privacy.meta.title", "Privacy — Joshua Painting JM & Waterproofing", "privacy.meta.description",
              "How Joshua Painting JM & Waterproofing uses the details you send with a quote request.",
              "Privacidad — Joshua Painting JM & Waterproofing", "Cómo usa Joshua Painting JM & Waterproofing los datos que envía al pedir una cotización.")
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
    hd = head("/404.html", "nf.meta.title", "Page not found — Joshua Painting JM & Waterproofing", "nf.meta.description",
              "This page doesn't exist.", "Página no encontrada — Joshua Painting JM & Waterproofing", "Esta página no existe.", noindex=True)
    page("/404.html", hd, main, [], out_file="404.html")

SHORT = {  # one line per service for the front page (EN, ES)
    "interior": ("Walls, ceilings, trim and doors.", "Paredes, techos, molduras y puertas."),
    "exterior": ("Siding, stucco, trim, decks and fences.", "Revestimiento, estuco, molduras, terrazas y cercas."),
    "cabinets": ("Kitchen cabinets and bathroom vanities.", "Gabinetes de cocina y muebles de baño."),
    "walls": ("Patching, texture and wallpaper removal.", "Resanes, textura y retiro de papel tapiz."),
    "water": ("Sealing decks, masonry and walls.", "Sellado de terrazas, mampostería y muros."),
    "commercial": ("Offices, shops and rentals, after hours.", "Oficinas, tiendas y rentas, fuera de horario."),
}

def rev_line():
    revs = [r for r in approved_reviews() if r.get("short")]
    if not revs:
        return '     <span class="muted" data-i18n="home.rev.body">Every customer who has reviewed us on Yelp gave us five stars.</span>'
    return f'     <q class="rev-quote" lang="en">{e(revs[0]["short"])}</q>'

def landing():
    """Front page body, in the order visitors decide: what we do → proof → how it works.
    Each part is a short preview that links to its own page."""
    ES.update({"home.svc.label": "Lo que hacemos", "home.svc.title": "Seis tipos de trabajo",
               "home.work.title": "Trabajos recientes", "home.rev.body": "Todos los clientes que nos han reseñado en Yelp nos dieron cinco estrellas.",
               "home.rev.read": "Leer las reseñas", "home.story.more": "Leer nuestra historia",
               "home.story": "Joshua Painting JM Waterproofing ofrece servicios de pintura e impermeabilización para proyectos residenciales y pequeños proyectos comerciales en el Área de la Bahía. Trabajamos con un equipo profesional de pintores en proyectos residenciales y comerciales. El dueño, Josué Mendoza, tiene 7 años de experiencia en pintura."})
    ES["hero.short"] = "Casas y negocios, pintados con cuidado."
    ES.update({"home.svc.more": "Cada servicio tiene su página con fotos, detalles y preguntas frecuentes.",
               "home.rev.title": "5.0 en Yelp", "home.rev.read": "Leer las reseñas"})
    rows = []
    for i, sv in enumerate(SERVICES, 1):
        g = sv["gid"]; en, es_ = SHORT[g]; ES[f"home.svc.{g}"] = es_
        rows.append(f'''    <a href="/services/{sv["slug"]}/"><span class="svc-n">0{i}</span><span class="svc-name"><span data-i18n="svcp.{g}.h1">{e(sv["h1"][0])}</span><small data-i18n="home.svc.{g}">{e(en)}</small></span><span class="svc-arrow" aria-hidden="true">→</span></a>''')
    return f'''<!-- explore -->
<section class="block home-services" aria-labelledby="home-svc-title">
  <div class="block-head">
    <h2 id="home-svc-title" data-i18n="home.svc.label">What we do</h2>
    <p class="muted" data-i18n="home.svc.more">Each service has its own page with photos, details and common questions.</p>
  </div>
  <nav class="svc-list" aria-labelledby="home-svc-title">
{chr(10).join(rows)}
  </nav>
</section>

{steps()}

<section class="block home-story" aria-labelledby="home-story-title">
  <div class="story-grid story-solo">
    <div>
      <p class="label" data-i18n="about.label">About us</p>
      <h2 id="home-story-title" data-i18n="about.title">A professional crew from Hercules</h2>
      <p class="story-text" data-i18n="home.story">Joshua Painting JM Waterproofing has provided painting and waterproofing services for residential and small commercial projects in the Bay Area. We work with a professional painting crew for residential and commercial projects. Owner Josué Mendoza has 7 years of painting experience.</p>
      <ul class="stats">
        <li><b>7</b><span data-i18n="about.s1">years of painting experience</span></li>
        <li><b>350+</b><span data-i18n="about.s2">homes and businesses painted</span></li>
        <li><b>5.0</b><span data-i18n="about.s3">stars on Yelp</span></li>
      </ul>
      <p class="story-more"><a class="btn btn-ghost" href="/about/"><span data-i18n="home.story.more">Read our story</span> →</a></p>
    </div>
  </div>
</section>
<section class="rev-band" aria-label="Reviews" data-i18n-attr="aria-label:nav.reviews">
  <a href="/reviews/"><span class="stars" aria-hidden="true">★★★★★</span> <b data-i18n="home.rev.title">5.0 on Yelp</b>
{rev_line()}
     <span class="rev-go"><span data-i18n="home.rev.read">Read the reviews</span> →</span></a>
</section>
<!-- /explore -->'''

# ───────────────────────── pages ─────────────────────────
def build():
    src = (PUB / "index.html").read_text(encoding="utf-8")
    ES["social.fb"] = "Joshua Painting JM Waterproofing"
    ES["cta.area"] = "Trabajamos en Hercules, Berkeley, Oakland, Alameda, Concord y el East Bay."
    ES.update({"about.s4n": "3–6 meses", "q8": "¿Tienen seguro?",
               "a8": "Sí. Tenemos seguro de responsabilidad civil general, así que su casa o negocio está cubierto mientras trabajamos.",
               "q9": "¿Cómo dejan limpio el lugar?",
               "a9": "Cubrimos pisos y muebles antes de empezar, barremos y recogemos cada día, y al final revisamos el trabajo con usted para que todo quede como lo encontramos, pero recién pintado."})
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
        hd = head(path, f"svcp.{g}.meta", f"{s['h1'][0]} in Hercules, CA — Joshua Painting JM & Waterproofing", f"svcp.{g}.lede", s["lede"][0],
                  f"{s['h1'][1]} en Hercules, CA — Joshua Painting JM & Waterproofing", s["lede"][1], image=s["hero"],
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
    hd = head("/services/", "svc.meta.title", "Services — Joshua Painting JM & Waterproofing", "svc.meta.description",
              "Everything Joshua Painting JM & Waterproofing does in Hercules, CA: interior and exterior painting, decks, fences, staining, cabinets, wall repair and texturing, wallpaper removal, waterproofing and commercial work.",
              "Servicios — Joshua Painting JM & Waterproofing",
              "Todo lo que hace Joshua Painting JM & Waterproofing en Hercules, CA: pintura de interiores y exteriores, terrazas, cercas, teñido, gabinetes, reparación y textura de paredes, retiro de papel tapiz, impermeabilización y trabajos comerciales.",
              ld=[crumbs_ld([("Home", "/"), ("Services", "/services/")])])
    built.append(page("/services/", hd, main, []))

    # /work/ — one chapter per kind of job, each a single row of photos at the same height,
    # so 2 or 7 photos both look intentional (no filters, no half-empty grid rows)
    chapters = [("exterior", "Exterior", "Exteriores"), ("interior", "Interior", "Interiores"),
                ("decks", "Decks & waterproofing", "Terrazas e impermeabilización"),
                ("commercial", "Commercial", "Comercial"), ("prep", "Prep & repair", "Preparación y reparación")]
    ES.update({"workp.title": "Trabajos terminados", "workp.photos": "fotos", "workp.prev": "Fotos anteriores", "workp.next": "Más fotos",
               "workp.intro": "Trabajos reales del equipo de Josué en el Área de la Bahía. Toque una foto para verla en grande.",
               "workp.all": "Ver todo nuestro trabajo"})
    parts = []
    for c, en, es in chapters:
        ES[f"workp.c.{c}"] = es
        names = [n for n, v in PHOTOS.items() if v[4] == c]
        # each photo keeps its own proportions (reserved before it loads, so nothing jumps);
        # the first chapter's first two photos load straight away (they are on the first screen)
        figs = "\n".join("      " + photo(n, lazy=not (c == chapters[0][0] and k < 2)).replace(
            "<img ", f'<img style="aspect-ratio:{PHOTOS[n][0]}/{PHOTOS[n][1]}" ' + ('fetchpriority="high" ' if c == chapters[0][0] and k == 0 else ""), 1)
            for k, n in enumerate(names))
        parts.append(f'''  <section class="chapter" aria-labelledby="ch-{c}">
    <div class="chapter-head">
      <h2 id="ch-{c}" data-i18n="workp.c.{c}">{e(en)}</h2>
      <span class="chapter-n">{len(names)} <span data-i18n="workp.photos">photos</span></span>
      <span class="shots-nav" hidden><button type="button" class="shots-prev" aria-label="Previous photos" data-i18n-attr="aria-label:workp.prev">←</button><button type="button" class="shots-next" aria-label="More photos" data-i18n-attr="aria-label:workp.next">→</button></span>
    </div>
    <div class="shots">
{figs}
    </div>
  </section>''')
    main = f'''<section class="block work work-page" aria-labelledby="work-h1">
  <div class="block-head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.work">Our work</span></nav>
    <h1 id="work-h1" data-i18n="workp.title">Jobs we've finished</h1>
    <p class="muted" data-i18n="workp.intro">Real jobs by Josué's crew around the Bay Area. Tap a photo to see it full size.</p>
  </div>
{chr(10).join(parts)}
  <p class="work-more"><a href="{YELP}" target="_blank" rel="noopener" data-i18n="work.more">See more photos on Yelp</a></p>
</section>

{section(src, '<section class="block cta-end"')}'''
    hd = head("/work/", "workp.meta.title", "Our work — Joshua Painting JM & Waterproofing", "workp.meta.description",
              "Photos of interior, exterior, deck and commercial painting jobs by Joshua Painting JM & Waterproofing in Hercules and around the Bay Area.",
              "Nuestro trabajo — Joshua Painting JM & Waterproofing",
              "Fotos de trabajos de pintura de interiores, exteriores, terrazas y locales comerciales de Joshua Painting JM & Waterproofing en Hercules y el Área de la Bahía.",
              image="orinda-deck")
    built.append(page("/work/", hd, main, ["work"]))

    # /about/
    about = section(src, '<section id="about"')
    about = about.replace('<h2 id="about-title" data-i18n="about.title">', '<h1 id="about-title" data-i18n="about.title">', 1)
    about = re.sub(r'(<h1 id="about-title"[^>]*>[^<]*)</h2>', r'\1</h1>', about, 1)
    about = about.replace('<div class="about-grid about-split">',
                          '<nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-i18n="crumb.home">Home</a> / <span data-i18n="nav.about">About</span></nav>\n  <div class="about-grid about-split">', 1)
    main = "\n\n".join([about, section(src, '<section id="method"'), section(src, '<section class="block cta-end"')])
    hd = head("/about/", "aboutp.meta.title", "About — Joshua Painting JM & Waterproofing", "aboutp.meta.description",
              "Joshua Painting JM & Waterproofing is a professional painting and waterproofing crew from Hercules, CA, rated 5.0 on Yelp.",
              "Nosotros — Joshua Painting JM & Waterproofing",
              "Joshua Painting JM & Waterproofing es un equipo profesional de pintura e impermeabilización de Hercules, CA, con 5.0 en Yelp.",
              ld=[business_ld()])
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
    home_seo = seo("/", "Joshua Painting JM & Waterproofing — Painting & waterproofing in Hercules, CA",
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
