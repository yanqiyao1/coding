/* ==========================================================================
   KaTeX：渲染 markdown 里的 $...$ 与 $$...$$
   - arithmatex（generic 模式）会把公式包成 \(...\) / \[...\]
   - 只在页面切换后渲染一次，代码块里的 $ 不会被误伤（auto-render 默认跳过 pre/code）
   ========================================================================== */

(function () {
  "use strict";

  function renderMath() {
    if (typeof window.renderMathInElement !== "function") return;

    window.renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
      strict: false,
      trust: true,
    });
  }

  if (window.document$) {
    window.document$.subscribe(function () {
      renderMath();
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      renderMath();
    });
  } else {
    renderMath();
  }
})();
