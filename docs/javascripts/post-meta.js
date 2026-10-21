/* 文章元信息：按正文字数估算阅读时长 */
(function () {
  "use strict";

  function update() {
    var holder = document.querySelector("[data-reading-time]");
    if (!holder) return;
    var content = document.querySelector(".md-content__inner.md-typeset");
    if (!content) return;

    var clone = content.cloneNode(true);
    Array.prototype.forEach.call(
      clone.querySelectorAll("pre, .toc-inline, .post-meta, script, style"),
      function (n) { n.remove(); }
    );
    var chars = (clone.textContent || "").replace(/\s+/g, "").length;
    if (!chars) return;
    var minutes = Math.max(1, Math.round(chars / 400));
    holder.textContent = "约 " + minutes + " 分钟 · " + chars + " 字";

    // 标签链接补上 Material 生成的锚点：#tag:<slug>
    Array.prototype.forEach.call(
      document.querySelectorAll(".post-meta .tag[data-tag]"),
      function (a) {
        var slug = a.getAttribute("data-tag")
          .toLowerCase()
          .replace(/\+/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "");
        if (slug) a.href = a.href.replace(/#.*$/, "") + "#tag:" + slug;
      }
    );
  }

  if (window.document$) {
    window.document$.subscribe(update);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update);
  } else {
    update();
  }
})();
