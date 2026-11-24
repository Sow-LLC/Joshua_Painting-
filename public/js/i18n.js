// English / Spanish for the public site.
// English lives in the HTML itself (so it works without JS and for search engines);
// this file holds the Spanish, and swaps it in for elements marked with:
//   data-i18n="key"        → textContent
//   data-i18n-html="key"   → innerHTML (only our own strings below, for <br>/<em>/<small>/<a>)
//   data-i18n-attr="alt:key; placeholder:key"
// Choice order: ?lang=es|en  →  saved choice  →  browser language  →  English.
(() => {
  const ES = {
    "meta.title": "Joshua's Painting Service — Pintura de interiores y exteriores",
    "meta.description": "Joshua's Painting Service pinta casas y negocios: interiores, exteriores, gabinetes, comercial y reparaciones. Pintura e impermeabilización en Hercules, CA. Cotizaciones por escrito gratis, terminado a mano.",
    "aria.home": "Inicio de Joshua's Painting Service",
    "aria.nav": "Principal",
    "aria.lang": "Idioma",
    "aria.promises": "Nuestras garantías",
    "aria.foot": "Pie de página",

    "util.call": "Llame al",
    "util.hours": "Lun–Sáb · 8 am – 7 pm",
    "util.trust": "Hercules, CA · Cotizaciones gratis",

    "nav.services": "Servicios",
    "nav.estimate": "Calcular precio",
    "nav.faq": "Preguntas",
    "nav.quote": "Cotización gratis",
    "nav.work": "Trabajos",
    "nav.reviews": "Reseñas",
    "nav.menu": "Menú",
    "work.label": "Nuestro trabajo",
    "work.title": "Trabajos recientes",
    "work.intro": "Casas, terrazas y negocios en el Área de la Bahía, fotografiados en la obra.",
    "work.more": "Ver más fotos en Yelp",
    "rev.short": "5.0 en Yelp",
    "rev.title": "5 estrellas en Yelp",
    "rev.body": "Todos los clientes que nos han reseñado en Yelp nos dieron cinco estrellas. Lea lo que dijeron y luego pida su propia cotización gratis.",
    "rev.read": "Leer las reseñas en Yelp",
    "contact.reviews": "Reseñas",
    "gal.1": "Comedor repintado",
    "gal.2": "Terraza · Orinda, CA",
    "gal.3": "Exterior completo · Petaluma, CA",
    "gal.4": "Gabinetes y paredes de cocina",
    "gal.5": "Exterior de casa",
    "gal.6": "Pared de acento comercial",
    "gal.7": "Terraza lavada, preparada y pintada",
    "gal.8": "Casa de 1980 · San José, CA",
    "gal.9": "Resane antes de pintar",
    "gal.10": "Exterior de dos pisos",
    "gal.11": "Revestimiento de tablas y listones",
    "gal.12": "Exterior y escaleras de entrada",
    "nav.about": "Nosotros",
    "f.more": "Agregar detalles (opcional): dirección, tamaño, fechas",
    "about.alt": "Pintor preparando el revestimiento de madera antes de pintar",
    "about.cap": "Primero la preparación, en cada trabajo",
    "about.label": "Nosotros",
    "about.title": "Un equipo profesional de Hercules",
    "about.p1": "Joshua Painting JM Waterproofing ofrece servicios de pintura e impermeabilización para proyectos residenciales y pequeños proyectos comerciales en el Área de la Bahía. Trabajamos con un equipo profesional de pintores en proyectos residenciales y comerciales. El dueño, Josué Mendoza, tiene 7 años de experiencia en pintura.",
    "about.p2": "Josué visita cada trabajo en persona, escribe cada presupuesto y hace la revisión final con usted. El mismo equipo trabaja del primer día al último, así siempre sabe quién está en su casa.",
    "about.p3": "Hablamos inglés y español.",
    "about.s1": "años de experiencia en pintura",
    "about.s2": "casas y negocios pintados",
    "about.s3": "estrellas en Yelp",
    "about.s4": "de garantía en interiores",
    // <generated-pages> (tools/build_pages.py — edit there, not here)
    "a8": "Sí. Tenemos seguro de responsabilidad civil general, así que su casa o negocio está cubierto mientras trabajamos.",
    "a9": "Cubrimos pisos y muebles antes de empezar, barremos y recogemos cada día, y al final revisamos el trabajo con usted para que todo quede como lo encontramos, pero recién pintado.",
    "about.s4n": "3–6 meses",
    "aboutp.meta.description": "Joshua's Painting Service es un equipo profesional de pintura e impermeabilización de Hercules, CA, con 5.0 en Yelp.",
    "aboutp.meta.title": "Nosotros — Joshua's Painting Service",
    "contactp.meta.description": "Pida un presupuesto gratis de pintura o impermeabilización en Hercules, CA. Llame al (510) 369-9079 o envíe el formulario.",
    "contactp.meta.title": "Presupuesto gratis y contacto — Joshua's Painting Service",
    "crumb.home": "Inicio",
    "cta.area": "Trabajamos en Hercules, Berkeley, Oakland, Alameda, Concord y el East Bay.",
    "cta.body": "Cuéntenos sobre el trabajo y vamos, medimos y le enviamos un precio por escrito. Sin costo ni presión.",
    "cta.title": "¿Listo para su presupuesto gratis?",
    "done.body": "Josué le llamará o le enviará un mensaje lo antes posible para agendar una visita gratis. Sin costo ni presión.",
    "done.label": "Solicitud enviada",
    "done.title": "Gracias",
    "f.privacy": "Solo usamos sus datos para responderle sobre su trabajo. <a href=\"/privacy/\">Privacidad</a>",
    "faqp.by": "Por servicio",
    "faqp.general": "Generales",
    "faqp.h1": "Preguntas frecuentes",
    "faqp.help": "¿Tiene otra pregunta?",
    "faqp.helpbody": "Llámenos o pida un presupuesto gratis; respondemos lo antes posible.",
    "faqp.intro": "Respuestas rápidas sobre presupuestos, tiempos, pagos y cada servicio.",
    "faqp.meta.description": "Respuestas sobre presupuestos, tiempos, pagos, garantía y cada servicio de Joshua's Painting Service.",
    "faqp.meta.title": "Preguntas frecuentes — Joshua's Painting Service",
    "faqp.topics": "Temas",
    "foot.area": "Hercules y el East Bay",
    "foot.citylic": "Licencia comercial municipal",
    "foot.company": "Empresa",
    "foot.contact": "Contacto",
    "foot.follow": "Síganos en",
    "foot.lic": "Licencia de contratista de CA",
    "foot.rights": "Hercules, CA",
    "foot.services": "Servicios",
    "foot.tag": "Pintura e impermeabilización para casas y negocios en el Área de la Bahía.",
    "hero.short": "Casas y negocios, pintados con cuidado.",
    "hero.work": "Ver nuestro trabajo",
    "home.rev.body": "Todos los clientes que nos han reseñado en Yelp nos dieron cinco estrellas.",
    "home.rev.read": "Leer las reseñas",
    "home.rev.title": "5.0 en Yelp",
    "home.story": "Joshua Painting JM Waterproofing ofrece servicios de pintura e impermeabilización para proyectos residenciales y pequeños proyectos comerciales en el Área de la Bahía. Trabajamos con un equipo profesional de pintores en proyectos residenciales y comerciales. El dueño, Josué Mendoza, tiene 7 años de experiencia en pintura.",
    "home.story.more": "Leer nuestra historia",
    "home.svc.cabinets": "Gabinetes de cocina y muebles de baño.",
    "home.svc.commercial": "Oficinas, tiendas y rentas, fuera de horario.",
    "home.svc.exterior": "Revestimiento, estuco, molduras, terrazas y cercas.",
    "home.svc.interior": "Paredes, techos, molduras y puertas.",
    "home.svc.label": "Lo que hacemos",
    "home.svc.more": "Cada servicio tiene su página con fotos, detalles y preguntas frecuentes.",
    "home.svc.title": "Seis tipos de trabajo",
    "home.svc.walls": "Resanes, textura y retiro de papel tapiz.",
    "home.svc.water": "Sellado de terrazas, mampostería y muros.",
    "home.work.title": "Trabajos recientes",
    "nav.allServices": "Todos los servicios",
    "nav.contact": "Contacto",
    "nav.privacy": "Privacidad",
    "nav.showServices": "Mostrar servicios",
    "nf.body": "Puede que la dirección esté mal escrita o que la página se haya movido. Estos enlaces le pueden servir:",
    "nf.home": "Página de inicio",
    "nf.meta.description": "Esta página no existe.",
    "nf.meta.title": "Página no encontrada — Joshua's Painting Service",
    "nf.title": "Esta página no existe",
    "ph.board-and-batten": "Revestimiento de tablas y listones",
    "ph.cape-cod-exterior": "Exterior de casa",
    "ph.commercial-accent-wall": "Pared de acento comercial",
    "ph.commercial-project": "Proyecto comercial interior",
    "ph.crew-prep": "Raspado y lijado del revestimiento",
    "ph.deck-stairs": "Terraza lavada, preparada y pintada",
    "ph.deck-work": "Preparación de terraza entre los árboles",
    "ph.drywall-prep": "Resane antes de pintar",
    "ph.exterior-ladder": "Exterior en proceso",
    "ph.green-house": "Exterior de dos pisos",
    "ph.interior-bedroom": "Recámara lista para habitar",
    "ph.interior-door": "Puertas y marcos",
    "ph.interior-room": "Habitación luminosa, paredes y molduras",
    "ph.kitchen": "Gabinetes y paredes de cocina",
    "ph.orinda-deck": "Terraza · Orinda, CA",
    "ph.petaluma-house": "Exterior completo · Petaluma, CA",
    "ph.primer-siding": "Revestimiento con primer",
    "ph.san-jose-house": "Casa de 1980 · San José, CA",
    "ph.surface-prep": "Preparación de superficies",
    "ph.white-house-stairs": "Exterior y escaleras de entrada",
    "privacy.h1": "Qué datos recopilamos",
    "privacy.h2": "Cómo los usamos",
    "privacy.h3": "Dónde se guardan",
    "privacy.h4": "Conteo de visitas",
    "privacy.h5": "Su navegador",
    "privacy.h6": "Ver o borrar sus datos",
    "privacy.intro": "En pocas palabras: usamos sus datos solo para su trabajo, y nada más.",
    "privacy.meta.description": "Cómo usa Joshua's Painting Service los datos que envía al pedir una cotización.",
    "privacy.meta.title": "Privacidad — Joshua's Painting Service",
    "privacy.p1": "Solo lo que escribe en el formulario de cotización: su nombre, correo o teléfono, la dirección del trabajo y lo que nos cuente sobre él.",
    "privacy.p2": "Para responderle, visitarlo, preparar su presupuesto y hacer el trabajo. Nunca vendemos ni compartimos sus datos, y no enviamos correos publicitarios.",
    "privacy.p3": "En nuestro sistema de trabajos, alojado por Cloudflare en Estados Unidos. Cuando llega una solicitud, también se envía al teléfono de Joshua a través de ntfy, un servicio de notificaciones que guarda el mensaje unas 12 horas y luego lo borra.",
    "privacy.p4": "Contamos las visitas para saber qué páginas son útiles: la página, el sitio del que viene y el idioma. Sin cookies, sin direcciones IP y nada que lo identifique.",
    "privacy.p5": "Si cambia a español, su navegador recuerda esa elección en su propio dispositivo. Es lo único que guarda el sitio.",
    "privacy.p6": "Llame o envíe un mensaje al (510) 369-9079 y le diremos qué datos tenemos, los corregiremos o los borraremos. Los registros de trabajos terminados pueden guardarse el tiempo que exija la ley para facturas y garantías.",
    "privacy.title": "Privacidad",
    "privacy.updated": "Actualizado el 19 de noviembre de 2026",
    "q.back": "Atrás",
    "q.next": "Siguiente",
    "q.s1": "¿En qué le podemos ayudar?",
    "q.s2": "Cuéntenos sobre el trabajo",
    "q.s2hint": "Todo es opcional. Omita lo que prefiera explicar por teléfono.",
    "q.s3": "¿Cómo lo contactamos?",
    "q.step": "Paso",
    "q8": "¿Tienen seguro?",
    "q9": "¿Cómo dejan limpio el lugar?",
    "reviewsp.expect": "Lo que puede esperar",
    "reviewsp.meta.description": "Joshua's Painting Service tiene 5.0 estrellas en Yelp. Lea las reseñas y vea los trabajos.",
    "reviewsp.meta.title": "Reseñas — Joshua's Painting Service",
    "rv.all": "Leer todas las reseñas en Yelp",
    "rv.en": "Reseñas originales en inglés.",
    "rv.meta.0": "Reseña en Yelp · Pintura de exteriores · abr 2026",
    "rv.meta.1": "Reseña en Yelp · jul 2025",
    "rv.say": "Lo que dicen de nosotros",
    "scope.walls": "Reparación de paredes",
    "scope.waterproofing": "Impermeabilización",
    "social.fb": "Joshua Painting JM Waterproofing",
    "step.1.b": "Vamos, vemos el trabajo, medimos y respondemos sus preguntas. Sin costo ni presión.",
    "step.1.t": "Visita gratis",
    "step.2.b": "Un precio detallado y una fecha de inicio, enviados lo antes posible.",
    "step.2.t": "Cotización por escrito",
    "step.3.b": "El mismo equipo de principio a fin, limpieza cada día y una revisión final con usted.",
    "step.3.t": "El trabajo",
    "step.label": "Cómo funciona",
    "step.title": "Tres pasos, sin sorpresas",
    "svc.meta.description": "Todo lo que hace Joshua's Painting Service en Hercules, CA: pintura de interiores y exteriores, terrazas, cercas, teñido, gabinetes, reparación y textura de paredes, retiro de papel tapiz, impermeabilización y trabajos comerciales.",
    "svc.meta.title": "Servicios — Joshua's Painting Service",
    "svcp.cabinets.a1": "La mayoría de las cocinas tardan de cuatro a seis días, incluido el secado entre manos. Puede seguir usando la cocina por las tardes.",
    "svcp.cabinets.a2": "Desengrasamos, lijamos, usamos un primer de adherencia y terminamos con un esmalte resistente para gabinetes, que aguanta golpes y limpieza diaria.",
    "svcp.cabinets.a3": "Sí. Rellenamos los agujeros viejos y perforamos para las nuevas si las elige antes de empezar.",
    "svcp.cabinets.h1": "Pintura de gabinetes",
    "svcp.cabinets.lede": "Los gabinetes pintados le dan una nueva cara a la cocina o el baño por una fracción de lo que cuesta cambiarlos. Desmontamos puertas y frentes de cajón, los limpiamos, lijamos, aplicamos primer y pintamos, y luego los volvemos a colgar y ajustar.",
    "svcp.cabinets.meta": "Pintura de gabinetes en Hercules, CA — Joshua's Painting Service",
    "svcp.cabinets.q1": "¿Cuánto tarda pintar gabinetes?",
    "svcp.cabinets.q2": "¿La pintura va a durar?",
    "svcp.cabinets.q3": "¿Pueden cambiar las jaladeras?",
    "svcp.commercial.a1": "Sí. Podemos programar trabajo por la tarde, de noche o en fin de semana para que su negocio no cierre.",
    "svcp.commercial.a2": "Sí. Preparamos rentas y edificios de varias unidades rápido para que estén listos para mostrar.",
    "svcp.commercial.a3": "Sí. Envíenos las direcciones y visitamos y cotizamos cada sitio en una sola cotización por escrito.",
    "svcp.commercial.h1": "Pintura comercial",
    "svcp.commercial.lede": "Oficinas, tiendas, restaurantes y unidades de renta pintadas según su horario. Podemos trabajar de noche y en fin de semana para que siga abierto, y mantenemos el espacio limpio y seguro para empleados y clientes.",
    "svcp.commercial.meta": "Pintura comercial en Hercules, CA — Joshua's Painting Service",
    "svcp.commercial.q1": "¿Pueden trabajar fuera de horario?",
    "svcp.commercial.q2": "¿Pintan entre inquilinos?",
    "svcp.commercial.q3": "¿Pueden cotizar varios locales a la vez?",
    "svcp.exterior.a1": "De finales de primavera a principios de otoño es lo ideal, pero pintamos todo el año cuando la superficie está seca y el pronóstico es despejado. Los días de lluvia se reprograman sin costo.",
    "svcp.exterior.a2": "Siempre. El lavado quita suciedad, polvo y moho para que la pintura nueva se adhiera. La pintura suelta se raspa y se lija, y la madera expuesta lleva primer.",
    "svcp.exterior.a3": "Sí. Hacemos exteriores completos y trabajos pequeños como molduras, puertas, una cerca o el lado que recibe más sol.",
    "svcp.exterior.h1": "Pintura de exteriores",
    "svcp.exterior.lede": "Pintura de exteriores que aguanta el sol, la neblina y la lluvia del Área de la Bahía. Cada trabajo empieza con lavado, raspado, sellado y primer en las partes expuestas, y luego dos manos en revestimiento, estuco, molduras, puertas, terrazas y cercas.",
    "svcp.exterior.meta": "Pintura de exteriores en Hercules, CA — Joshua's Painting Service",
    "svcp.exterior.q1": "¿Cuál es la mejor época para pintar el exterior?",
    "svcp.exterior.q2": "¿Lavan a presión primero?",
    "svcp.exterior.q3": "¿Pueden pintar solo las molduras o un lado de la casa?",
    "svcp.faq": "Preguntas sobre este servicio",
    "svcp.free": "Presupuesto gratis",
    "svcp.included": "Qué incluye",
    "svcp.interior.a1": "Una o dos habitaciones suelen tardar de uno a dos días. Un interior completo tarda de tres a seis días, según techos, molduras y reparaciones.",
    "svcp.interior.a2": "Sí. Paredes, techos, zócalos, marcos de puertas y ventanas y puertas pueden ir en la misma cotización o cotizarse por separado.",
    "svcp.interior.a3": "Sí. Trabajamos habitación por habitación, dejamos el paso libre, usamos pintura de bajo olor y limpiamos cada tarde.",
    "svcp.interior.h1": "Pintura de interiores",
    "svcp.interior.lede": "Pintura de interiores para casas, condominios y rentas en Hercules y el East Bay. Protegemos sus pisos y muebles, reparamos primero las paredes y aplicamos dos manos completas para que el color sea parejo con cualquier luz.",
    "svcp.interior.meta": "Pintura de interiores en Hercules, CA — Joshua's Painting Service",
    "svcp.interior.q1": "¿Cuánto tarda un trabajo de interiores?",
    "svcp.interior.q2": "¿También pintan techos y molduras?",
    "svcp.interior.q3": "¿Podemos quedarnos en casa mientras pintan?",
    "svcp.more": "Ver detalles",
    "svcp.others": "Otros servicios",
    "svcp.walls.a1": "Sí. Igualamos texturas de cáscara de naranja, knockdown y lisas para que la reparación no se note al pintar.",
    "svcp.walls.a2": "Sí. Lo retiramos, lavamos el pegamento, reparamos la pared de abajo y le aplicamos primer para pintar.",
    "svcp.walls.a3": "Las reparaciones pequeñas van incluidas en la cotización de pintura. Las grandes se cobran por hora o con precio fijo, acordado antes de empezar.",
    "svcp.walls.h1": "Reparación y textura de paredes",
    "svcp.walls.lede": "Los agujeros, grietas, manchas de agua, el papel tapiz viejo y la textura dispareja se notan a través de la pintura nueva. Resanamos, encintamos, texturizamos y lijamos hasta dejar la pared lisa, y luego aplicamos primer para que el acabado luzca bien.",
    "svcp.walls.meta": "Reparación y textura de paredes en Hercules, CA — Joshua's Painting Service",
    "svcp.walls.q1": "¿Pueden igualar la textura de mi pared?",
    "svcp.walls.q2": "¿Quitan papel tapiz?",
    "svcp.walls.q3": "¿Las reparaciones se cobran aparte?",
    "svcp.water.a1": "La mayoría necesita una nueva mano de sellador o tinte cada dos o tres años, antes si recibe sol directo todo el día.",
    "svcp.water.a2": "Sellamos y recubrimos superficies para mantener el agua fuera. Si encontramos madera podrida o una filtración estructural, se la mostramos y le decimos a quién llamar.",
    "svcp.water.a3": "Sí, y normalmente ahorra tiempo y dinero porque el lavado y la preparación se comparten.",
    "svcp.water.h1": "Impermeabilización",
    "svcp.water.lede": "El agua es lo que arruina la pintura y la madera. Sellamos terrazas, escaleras, mampostería y muros exteriores para que la lluvia escurra en lugar de filtrarse, como trabajo aparte o junto con la pintura del exterior.",
    "svcp.water.meta": "Impermeabilización en Hercules, CA — Joshua's Painting Service",
    "svcp.water.q1": "¿Cada cuánto hay que sellar una terraza?",
    "svcp.water.q2": "¿Arreglan goteras?",
    "svcp.water.q3": "¿Se puede impermeabilizar junto con la pintura del exterior?",
    "workp.all": "Ver todo nuestro trabajo",
    "workp.c.commercial": "Comercial",
    "workp.c.decks": "Terrazas e impermeabilización",
    "workp.c.exterior": "Exteriores",
    "workp.c.interior": "Interiores",
    "workp.c.prep": "Preparación y reparación",
    "workp.intro": "Trabajos reales del equipo de Josué en el Área de la Bahía. Toque una foto para verla en grande.",
    "workp.meta.description": "Fotos de trabajos de pintura de interiores, exteriores, terrazas y locales comerciales de Joshua's Painting Service en Hercules y el Área de la Bahía.",
    "workp.meta.title": "Nuestro trabajo — Joshua's Painting Service",
    "workp.next": "Más fotos",
    "workp.photos": "fotos",
    "workp.prev": "Fotos anteriores",
    "workp.title": "Trabajos terminados",
    // </generated-pages>
    "nav.quote.short": "Cotizar",

    "hero.label": "Pintura e impermeabilización · Hercules y el East Bay",
    "hero.tagline": "Las costuras quedan por dentro.",
    "hero.lede": "Cada pared que pintamos es, sobre todo, preparación que usted nunca verá. Le mostramos el proceso, lo cotizamos partida por partida y no dejamos nada más que el acabado.",
    "hero.cta": "Pedir cotización gratis",
    "hero.estimate": "Calcular precio al instante",
    "pencil.1": "perfilar · 2 manos",
    "pencil.2": "resanar y lijar",
    "pencil.3": "cáscara de huevo, blanco cálido",

    "pr1.title": "Asegurados",
    "pr1.body": "Seguro de responsabilidad civil general en cada trabajo.",
    "pr2.title": "Cotizaciones por escrito gratis",
    "pr2.body": "Detalladas, y enviadas lo antes posible después de la visita.",
    "pr3.title": "Garantía en interiores",
    "pr3.body": "De 3 a 6 meses en trabajos de interiores. ¿Se pela o se descascara? Volvemos y lo arreglamos.",
    "pr4.title": "Limpieza impecable",
    "pr4.body": "Pisos cubiertos y todo barrido, cada día.",

    "services.label": "Índice",
    "services.title": "Cinco tipos de trabajo",
    "s1.title": "Interiores",
    "s1.body": "Paredes, techos, molduras y puertas. Movemos los muebles, cubrimos los pisos y resanamos y lijamos cada superficie antes de aplicar una gota de color.",
    "s1.note": "desde $2.40 / pie²",
    "s2.title": "Exteriores",
    "s2.body": "Revestimiento, estuco, molduras, terrazas y cercas. Lavado a presión, raspado, sellado e imprimado, o teñido, para que el acabado dure más que el clima.",
    "s2.note": "desde $3.10 / pie²",
    "s3.title": "Gabinetes",
    "s3.body": "Puertas desmontadas, numeradas, desengrasadas y pintadas con pistola en una cabina limpia. Se vuelven a colgar y ajustar. Una cocina nueva sin demolición.",
    "s3.note": "desde $95 / puerta",
    "s4.title": "Comercial",
    "s4.body": "Oficinas, tiendas y restaurantes pintados de noche o en fin de semana, para que el lunes sus puertas sigan abiertas.",
    "s4.note": "precio según el sitio",
    "s5.title": "Reparaciones e impermeabilización",
    "s5.body": "Resane y textura de paredes, retiro de papel tapiz y pintura vieja, e impermeabilización, por separado o como parte de una repintada.",
    "s5.note": "por hora o precio fijo",

    "w1.title": "Comedor",
    "w1.spec": "Repintado de interior",
    "w1.alt": "Comedor luminoso con paredes y molduras blancas recién pintadas",
    "w2.title": "Exterior de casa",
    "w2.spec": "Revestimiento, molduras y puerta",
    "w2.alt": "Casa gris con molduras y puerta blancas después de pintar el exterior",
    "w3.title": "Cocina",
    "w3.spec": "Gabinetes y paredes",
    "w3.alt": "Cocina con gabinetes y paredes blancas después de pintar",
    "w4.title": "Local comercial",
    "w4.spec": "Pared de acento · pisos protegidos",
    "w4.alt": "Local comercial con una pared de acento azul intenso y el piso cubierto con papel",
    "w5.title": "Reparación de paredes",
    "w5.spec": "Resanado, encintado y lijado",
    "w5.alt": "Habitación con la tablaroca resanada lista para pintar y el piso cubierto",
    "w6.title": "Petaluma, CA",
    "w6.spec": "Exterior completo",
    "w6.alt": "Casa amarilla de dos pisos en Petaluma después de pintar el exterior",

    "method.label": "Método",
    "method.title": "Una pared, en corte transversal",
    "m1.title": "Inspección",
    "m1.body": "Lo visitamos, medimos cada habitación y fotografiamos cada imperfección; luego le enviamos un presupuesto detallado: área, manos, galones y mano de obra, partida por partida.",
    "m2.title": "Preparación",
    "m2.body": "Primero, la protección. Después, rellenar, lijar, sellar e imprimar donde haga falta. Es la mayor parte del trabajo, y es la razón por la que el acabado dura.",
    "m3.title": "Pintura",
    "m3.body": "Bordes perfilados a brocha y superficies a rodillo, dos manos completas como estándar. La misma cuadrilla del primer al último día.",
    "m4.title": "Entrega",
    "m4.body": "Se retira la cinta, los muebles vuelven a su lugar y hacemos un recorrido con usted a la luz del día. Retoques el mismo día. La pintura sobrante, etiquetada para que usted la guarde.",

    "est.label": "Calculadora",
    "est.title": "¿Cuánto costará?",
    "est.intro": "Un precio aproximado en diez segundos. Su cotización por escrito, después de una visita gratuita, es el precio que paga.",
    "est.type": "Tipo de trabajo",
    "est.floor": "Superficie de piso a pintar <small>(pie²)</small>",
    "est.floor.hint": "Una recámara de 12 × 12 pies mide unos 150 pie².",
    "est.home": "Tamaño de la casa <small>(pie²)</small>",
    "est.stories": "Pisos",
    "est.st1": "Uno",
    "est.st2": "Dos",
    "est.st3": "Tres",
    "est.doors": "Puertas y frentes de cajón",
    "est.cond": "Estado de las superficies",
    "est.good": "Bueno — solo desgastado",
    "est.fair": "Regular — algunas grietas y golpes",
    "est.poor": "Malo — pintura pelada, mucha reparación",
    "est.paint": "Pintura",
    "est.standard": "Estándar, resistente",
    "est.premium": "Premium, la más duradera",
    "est.ceilings": "Techos también",
    "est.trim": "Molduras y puertas también",
    "est.dark": "Gran cambio de color (oscuro → claro)",
    "est.ballpark": "Precio aproximado",
    "est.fine": "Incluye mano de obra, pintura y materiales, preparación y limpieza. No es una cotización vinculante.",
    "est.send": "Enviar para una cotización exacta",

    "svc.meta.title": "Servicios — Joshua's Painting Service",
    "svc.meta.description": "Todo lo que hace Joshua's Painting Service en Hercules, CA: pintura de interiores y exteriores, terrazas, cercas, teñido, gabinetes, reparación y textura de paredes, retiro de papel tapiz, impermeabilización y trabajos comerciales.",
    "svc.label": "Servicios",
    "svc.title": "Todo lo que pintamos, reparamos y protegemos",
    "svc.intro": "Casas y negocios en Hercules, CA y alrededores. Ningún trabajo es demasiado grande ni pequeño. Elija lo que necesita y pida un presupuesto gratis: vamos, medimos y le enviamos un precio por escrito.",
    "svc.jump": "Grupos de servicios",
    "svc.ask": "Cotización gratis para esto",
    "svc.all": "Ver todos los servicios",
    "svc.end.title": "¿No ve su trabajo aquí?",
    "svc.end.body": "Pregunte de todos modos. Si tiene que ver con pintura, tinte o mantener el agua fuera, probablemente podemos ayudar, y si no, le diremos quién puede.",
    "svc.interior.title": "Interiores",
    "svc.interior.body": "Paredes, techos y carpintería, con los muebles movidos y los pisos cubiertos. Resanamos y lijamos cada superficie antes de aplicar el color.",
    "svc.interior.i1": "Paredes y techos",
    "svc.interior.i2": "Molduras y zócalos",
    "svc.interior.i3": "Puertas",
    "svc.interior.i4": "Teñido de interiores",
    "svc.exterior.title": "Exteriores",
    "svc.exterior.body": "Todo el exterior de la casa o solo lo que lo necesita. Lavado a presión, raspado, sellado e imprimado para que el acabado dure más que el clima.",
    "svc.exterior.i1": "Exterior completo: revestimiento y estuco",
    "svc.exterior.i2": "Molduras y aleros",
    "svc.exterior.i3": "Terrazas y porches",
    "svc.exterior.i4": "Cercas y portones",
    "svc.exterior.i5": "Teñido de exteriores",
    "svc.cabinets.title": "Gabinetes",
    "svc.cabinets.body": "Puertas desmontadas, numeradas, desengrasadas y pintadas con pistola; luego se vuelven a colgar y ajustar. Una cocina como nueva sin demolición.",
    "svc.cabinets.i1": "Gabinetes de cocina",
    "svc.cabinets.i2": "Muebles de baño",
    "svc.cabinets.i3": "Puertas y frentes de cajón",
    "svc.walls.title": "Paredes y reparaciones",
    "svc.walls.body": "El trabajo bajo la pintura: agujeros, grietas, acabados viejos y textura, arreglados para que la nueva mano luzca bien.",
    "svc.walls.i1": "Resane de paredes",
    "svc.walls.i2": "Reparación de acabados",
    "svc.walls.i3": "Instalación o reemplazo de acabados",
    "svc.walls.i4": "Texturizado de paredes",
    "svc.walls.i5": "Retiro de papel tapiz",
    "svc.walls.i6": "Retiro de pintura",
    "svc.water.title": "Impermeabilización",
    "svc.water.body": "Mantenemos el agua fuera de paredes, terrazas y mampostería, como trabajo aparte o junto con un exterior.",
    "svc.water.i1": "Impermeabilización",
    "svc.water.i2": "Sellado de terrazas y mampostería",
    "svc.commercial.title": "Comercial",
    "svc.commercial.body": "Oficinas, tiendas y restaurantes, pintados de noche o en fin de semana para que pueda seguir abierto.",
    "svc.commercial.i1": "Oficinas",
    "svc.commercial.i2": "Tiendas y restaurantes",
    "svc.commercial.i3": "Rentas y edificios de varias unidades",
    "area.label": "Zona de servicio",
    "area.title": "Hercules, Berkeley, Oakland, Alameda, Concord y alrededores",
    "area.body": "Con base en Hercules, trabajamos en todo el East Bay: Berkeley, Oakland, Alameda, Concord y las ciudades de en medio. Casas, rentas, oficinas, tiendas y restaurantes. ¿No sabe si estamos cerca? Envíenos su dirección y le avisamos enseguida.",

    "faq.label": "Preguntas",
    "faq.title": "Antes de que pregunte",
    "q1": "¿La cotización es realmente gratis?",
    "a1": "Sí. Lo visitamos, medimos y le enviamos una cotización por escrito y detallada lo antes posible. Sin compromiso y sin presión.",
    "q2": "¿Cuánto tardará mi trabajo?",
    "a2": "Una o dos habitaciones suelen tomar uno o dos días; el interior de una casa completa, de tres a seis días; los exteriores, de tres a siete, según el clima. Su cotización indica las fechas exactas.",
    "q3": "¿Tengo que mover los muebles?",
    "a3": "No. Movemos y cubrimos los muebles y los regresamos a su lugar. Solo guarde objetos de valor pequeños y cosas frágiles.",
    "q4": "¿Qué pintura usan?",
    "a4": "Pintura de calidad profesional de marcas reconocidas, elegida según la superficie. Si tiene en mente una marca o un color exacto, lo usamos.",
    "q5": "¿Cómo es el pago?",
    "a5": "Aceptamos Zelle, tarjeta, cheque o efectivo. Los detalles de pago de su trabajo se acuerdan en su presupuesto por escrito, antes de empezar.",
    "q6": "¿El trabajo tiene garantía?",
    "a6": "Sí. Los trabajos de interiores tienen garantía de 3 a 6 meses, según el trabajo: si la pintura se pela, se ampolla o se descascara por cómo la aplicamos, volvemos y lo arreglamos sin costo.",
    "q7": "¿Pueden trabajar mientras vivimos o atendemos ahí?",
    "a7": "Sí. Trabajamos habitación por habitación, dejamos el paso libre y limpiamos cada tarde. Los trabajos comerciales pueden hacerse de noche o en fin de semana.",

    "quote.label": "Cotización gratis",
    "quote.title": "Solicitar cotización",
    "quote.intro": "Tres pasos rápidos. Le respondemos lo antes posible, normalmente el mismo día, para agendar una visita gratis.",
    "contact.phone": "Teléfono",
    "contact.hours": "Horario",
    "contact.reply": "Respuesta",
    "contact.reply.body": "Lo antes posible",
    "f.name": "Nombre",
    "f.email": "Correo electrónico",
    "f.phone": "Teléfono",
    "f.address": "Dirección del trabajo",
    "f.scope": "Tipo de trabajo",
    "scope.interior": "Interiores",
    "scope.exterior": "Exteriores",
    "scope.cabinets": "Gabinetes",
    "scope.commercial": "Comercial",
    "scope.other": "Otra cosa",
    "f.rooms": "Habitaciones <small>(aprox.)</small>",
    "f.sqft": "Pies cuadrados <small>(si lo sabe)</small>",
    "f.when": "Cuándo",
    "when.asap": "Lo antes posible",
    "when.month": "Dentro de un mes",
    "when.quarter": "En 1–3 meses",
    "when.planning": "Solo estoy planeando",
    "f.message": "Algo más",
    "f.message.ph": "Colores que tiene en mente, zonas problemáticas, acceso, mascotas…",
    "f.send": "Enviar solicitud",

    "foot.licensed": "Pintura e impermeabilización · Asegurados · Hercules, CA",
    "foot.code": "JP — pintado a mano · <a href=\"/admin/\">Acceso del estudio</a>",
    "dock.call": "Llamar",
  };

  // Messages written by site.js / estimate.js (not in the HTML), in both languages.
  const MSG = {
    en: {
      thanks: "Thank you — we'll get back to you as soon as possible.",
      needName: "Please tell us your name.",
      needContact: "Please leave an email or a phone number.",
      badEmail: "That email address looks wrong.",
      sending: "Sending…",
      failed: "Something went wrong.",
      callUs: "You can also call us directly.",
      tooMany: "Too many requests. Please wait a minute or call us at (510) 369-9079.",
      "lb.close": "Close", "lb.prev": "Previous photo", "lb.next": "Next photo", "lb.open": "Open photo",
      "est.day1": "About 1 day of work",
      "est.dayN": "About {n} days of work",
      "est.days": "About {a}–{b} days of work",
      "est.prefill": "Instant estimate",
      "est.ceilings": "Ceilings too",
      "est.trim": "Trim & doors too",
      "est.dark": "Big colour change (dark → light)",
      "est.storiesShort": "stories",
      "est.doorsShort": "doors & drawer fronts",
    },
    es: {
      thanks: "Gracias — le responderemos lo antes posible.",
      needName: "Por favor, díganos su nombre.",
      needContact: "Por favor, deje un correo electrónico o un número de teléfono.",
      badEmail: "Ese correo electrónico no parece correcto.",
      sending: "Enviando…",
      failed: "Algo salió mal.",
      callUs: "También puede llamarnos directamente.",
      tooMany: "Demasiadas solicitudes. Espere un minuto o llámenos al (510) 369-9079.",
      "lb.close": "Cerrar", "lb.prev": "Foto anterior", "lb.next": "Foto siguiente", "lb.open": "Abrir foto",
      "est.day1": "Aproximadamente 1 día de trabajo",
      "est.dayN": "Aproximadamente {n} días de trabajo",
      "est.days": "Aproximadamente {a}–{b} días de trabajo",
      "est.prefill": "Cálculo instantáneo",
      "est.ceilings": "Techos también",
      "est.trim": "Molduras y puertas también",
      "est.dark": "Gran cambio de color (oscuro → claro)",
      "est.storiesShort": "pisos",
      "est.doorsShort": "puertas y frentes de cajón",
    },
  };

  const LANGS = ["en", "es"];
  const STORE = "ab-lang";
  const root = document.documentElement;

  // Remember the English that shipped in the HTML, so switching back needs no second dictionary.
  const EN = new Map();
  const remember = (el, kind, value) => {
    if (!EN.has(el)) EN.set(el, {});
    const saved = EN.get(el);
    if (!(kind in saved)) saved[kind] = value;
  };

  function pick() {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(STORE);
      if (LANGS.includes(saved)) return saved;
    } catch {}
    return (navigator.languages || [navigator.language || "en"]).some((l) => /^es\b/i.test(l)) ? "es" : "en";
  }

  function apply(lang) {
    const es = lang === "es";
    root.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      remember(el, "text", el.textContent);
      el.textContent = es ? ES[el.dataset.i18n] ?? EN.get(el).text : EN.get(el).text;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      remember(el, "html", el.innerHTML);
      el.innerHTML = es ? ES[el.dataset.i18nHtml] ?? EN.get(el).html : EN.get(el).html;
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      for (const pair of el.dataset.i18nAttr.split(";")) {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (!attr || !key) continue;
        remember(el, "@" + attr, el.getAttribute(attr));
        el.setAttribute(attr, es ? ES[key] ?? EN.get(el)["@" + attr] : EN.get(el)["@" + attr]);
      }
    });

    document.querySelectorAll("[data-lang]").forEach((b) => b.dataset.lang === lang ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
    const field = document.querySelector('#quote-form input[name="lang"]');
    if (field) field.value = lang;

    window.AB_LANG = lang;
    document.dispatchEvent(new CustomEvent("ab:lang", { detail: lang }));
  }

  window.abT = (key) => (MSG[window.AB_LANG] || MSG.en)[key] || MSG.en[key] || key;

  function start() {
    const lang = pick();
    apply(lang);
    root.classList.remove("i18n-pending");

    // Arriving with a #section in the address (e.g. /#quote from the services page):
    // the browser's own jump can land at the top once the language swap and images
    // change the layout, so jump again ourselves, instantly, when everything is in.
    const jump = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id && document.getElementById(id);
      if (!el) return;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      el.scrollIntoView();
      root.style.scrollBehavior = prev;
    };
    if (location.hash) {
      requestAnimationFrame(jump);
      if (document.readyState !== "complete") window.addEventListener("load", () => { if (scrollY < 10) jump(); }, { once: true });
    }

    document.querySelectorAll(".lang").forEach((s) => { s.hidden = false; });
    document.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        const next = b.dataset.lang;
        try { localStorage.setItem(STORE, next); } catch {}
        // keep the address shareable: ?lang=es when Spanish, nothing when English
        const url = new URL(location.href);
        url.searchParams.delete("sent");
        if (next === "es") url.searchParams.set("lang", "es"); else url.searchParams.delete("lang");
        history.replaceState(null, "", url);
        apply(next);
      }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
