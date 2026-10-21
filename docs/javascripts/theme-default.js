/* 深色优先：没有保存过偏好时，默认切到 slate 配色 */
(function () {
  "use strict";

  var KEY = "__palette";

  function hasPreference() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
  }

  function activateDark() {
    var input = document.querySelector(
      'input[name="__palette"][data-md-color-scheme="slate"]'
    );
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (hasPreference()) return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activateDark);
  } else {
    activateDark();
  }
})();
