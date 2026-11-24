// /work/: each job type is a row of photos you swipe sideways. On computers, ← → buttons
// appear beside the title when a row is wider than the screen.
(() => {
  document.querySelectorAll(".chapter").forEach((ch) => {
    const row = ch.querySelector(".shots");
    const nav = ch.querySelector(".shots-nav");
    const [prev, next] = nav.querySelectorAll("button");
    const step = () => Math.max(240, row.clientWidth * 0.8);
    const update = () => {
      const more = row.scrollWidth > row.clientWidth + 4;
      nav.hidden = !more;
      prev.disabled = row.scrollLeft < 4;
      next.disabled = row.scrollLeft + row.clientWidth > row.scrollWidth - 4;
      ch.classList.toggle("has-more", more && !next.disabled);
    };
    prev.addEventListener("click", () => row.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => row.scrollBy({ left: step(), behavior: "smooth" }));
    row.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    row.querySelectorAll("img").forEach((img) => img.complete || img.addEventListener("load", update, { once: true }));
    update();
  });
})();
