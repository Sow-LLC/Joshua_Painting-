/* Rotating photos: any element with data-slides="<ms>" cross-fades through its <img>s.
   Extra photos load only after the page has finished loading, and the rotation
   pauses when the photo is off screen or the tab is hidden. Off for reduced motion. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const boxes = [...document.querySelectorAll("[data-slides]")];
  if (!boxes.length) return;

  const start = () => boxes.forEach((box) => {
    const imgs = [...box.querySelectorAll("img")];
    if (imgs.length < 2) return;
    imgs.forEach((img) => { if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute("data-srcset"); } });
    let i = 0, seen = true;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(box);
    setInterval(() => {
      if (!seen || document.hidden) return;
      const next = imgs[(i + 1) % imgs.length];
      if (!next.complete || !next.naturalWidth) return;   // wait until it has downloaded
      imgs[i].classList.remove("on");
      next.classList.add("on");
      i = (i + 1) % imgs.length;
    }, Number(box.dataset.slides) || 6000);
  });

  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
})();
