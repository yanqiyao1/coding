/* Ctrl/⌘ + K 唤起搜索（IDE 习惯） */
(function () {
  "use strict";

  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "k") return;
    e.preventDefault();

    var toggle = document.querySelector("[data-md-toggle='search']");
    if (toggle && !toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }

    window.setTimeout(function () {
      var input = document.querySelector(".md-search__input");
      if (input) input.focus();
    }, 80);
  });
})();
