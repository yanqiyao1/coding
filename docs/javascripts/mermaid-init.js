/* ==========================================================================
   Mermaid 按需加载
   - 只有页面里真的出现 ```mermaid 代码块时才去下载 mermaid.min.js（约 3.4 MB）
   - 支持 Material 的即时加载（instant loading）与深/浅色切换后重绘
   ========================================================================== */

(function () {
  "use strict";

  var self = document.currentScript;
  var sourceCache = new WeakMap();
  var loading = null;
  var lastScheme = null;

  function isDark() {
    return document.body.getAttribute("data-md-color-scheme") === "slate";
  }

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (loading) return loading;

    loading = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = new URL("mermaid.min.js", self.src).href;
      script.async = true;
      script.onload = function () {
        resolve(window.mermaid);
      };
      script.onerror = function () {
        loading = null;
        reject(new Error("无法加载 mermaid.min.js"));
      };
      document.head.appendChild(script);
    });

    return loading;
  }

  function render() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll(".mermaid")
    );
    if (!nodes.length) return;

    loadMermaid()
      .then(function (mermaid) {
        lastScheme = isDark() ? "dark" : "default";

        // 还原成原始的图定义，再交给 mermaid 重新渲染
        nodes.forEach(function (node) {
          if (!sourceCache.has(node)) {
            sourceCache.set(node, node.textContent);
          }
          node.removeAttribute("data-processed");
          node.textContent = sourceCache.get(node);
        });

        mermaid.initialize({
          startOnLoad: false,
          theme: lastScheme,
          securityLevel: "loose",
          fontFamily: getComputedStyle(document.body).fontFamily,
        });

        try {
          mermaid.run({ nodes: nodes });
        } catch (err) {
          console.warn("[mermaid]", err);
        }
      })
      .catch(function (err) {
        console.warn("[mermaid]", err);
      });
  }

  // 每次页面切换（含即时加载）后渲染
  if (window.document$) {
    window.document$.subscribe(function () {
      render();
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // 深浅色切换后按新主题重绘
  var timer = null;
  new MutationObserver(function () {
    var scheme = isDark() ? "dark" : "default";
    if (scheme === lastScheme) return;

    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      render();
    }, 120);
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"],
  });
})();
