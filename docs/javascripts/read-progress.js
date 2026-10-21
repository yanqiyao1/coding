/* ==========================================================================
   阅读进度条
   - 顶部 2px 品牌渐变条，随滚动推进
   - 兼容 Material 的即时加载（instant loading）：每次切页后重算
   ========================================================================== */

(function () {
  "use strict";

  var bar = document.createElement("div");
  bar.className = "read-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  var ticking = false;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    bar.style.transform = "scaleX(" + p + ")";
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  if (window.document$) {
    window.document$.subscribe(update);
  }

  update();
})();
