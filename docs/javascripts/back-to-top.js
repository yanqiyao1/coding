/* 回到顶部 + 图片懒加载 */
(function () {
  "use strict";

  var btn = null;

  function ensureButton() {
    if (btn) return btn;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "回到顶部");
    btn.innerHTML = "↑";
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(btn);
    return btn;
  }

  function onScroll() {
    var b = ensureButton();
    b.classList.toggle("is-visible", window.scrollY > 600);
  }

  function lazyImages() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".md-typeset img:not([loading])"),
      function (img) { img.loading = "lazy"; }
    );
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  if (window.document$) window.document$.subscribe(lazyImages);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { onScroll(); lazyImages(); });
  } else {
    onScroll();
    lazyImages();
  }
})();
