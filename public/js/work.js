// /work/: filter the photo grid by kind of job.
(() => {
  const buttons = document.querySelectorAll(".filters [data-filter]");
  const items = document.querySelectorAll(".work-grid [data-cat]");
  buttons.forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.filter;
    buttons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    items.forEach((it) => { it.hidden = f !== "all" && it.dataset.cat !== f; });
  }));
})();
