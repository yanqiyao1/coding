/* 代码块左上角语言标签 */
(function () {
  "use strict";

  var NAMES = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    text: "text",
  };

  function label() {
    var blocks = document.querySelectorAll(".md-typeset div.highlight");
    Array.prototype.forEach.call(blocks, function (block) {
      if (block.dataset.langLabel) return;
      var lang = null;
      Array.prototype.forEach.call(block.classList, function (c) {
        if (c.indexOf("language-") === 0) lang = c.slice(9);
      });
      if (!lang) return;
      lang = NAMES[lang] || lang;
      var chip = document.createElement("span");
      chip.className = "code-lang";
      chip.textContent = lang;
      block.insertBefore(chip, block.firstChild);
      block.dataset.langLabel = "1";
    });
  }

  if (window.document$) {
    window.document$.subscribe(label);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", label);
  } else {
    label();
  }
})();
