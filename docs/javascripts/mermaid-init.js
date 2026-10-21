/* ==========================================================================
   Mermaid 按需加载
   - 只有页面里真的出现 ```mermaid 代码块时才去下载 mermaid.min.js（约 3.4 MB）
   - 支持 Material 的即时加载（instant loading）与深/浅色切换后重绘
   - 渲染是串行的：上一次没画完不会重复触发，避免把图元清空
   ========================================================================== */

(function () {
  "use strict";

  var self = document.currentScript;
  var sources = new WeakMap();
  var loading = null;
  var state = { scheme: null, busy: false, pending: false, timer: null };

  function currentScheme() {
    return document.body.getAttribute("data-md-color-scheme") === "slate"
      ? "dark"
      : "light";
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        reject(new Error("加载失败：" + src));
      };
      document.head.appendChild(script);
    });
  }

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (loading) return loading;

    // 先本地（快、可离线），失败再退到 CDN
    var local = new URL("mermaid.min.js", self.src).href;
    var cdn = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

    loading = loadScript(local)
      .catch(function () {
        return loadScript(cdn);
      })
      .then(function () {
        return window.mermaid;
      })
      .catch(function (err) {
        loading = null;
        throw err;
      });

    return loading;
  }

  function initMermaid(mermaid, scheme) {
    if (state.scheme === scheme) return;
    state.scheme = scheme;

    var dark = scheme === "dark";
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      fontFamily: getComputedStyle(document.body).fontFamily,
      themeVariables: {
        background: dark ? "#0a0e1a" : "#ffffff",
        primaryColor: dark ? "#0e1526" : "#f8fbff",
        primaryTextColor: dark ? "#d8e2f0" : "#0f172a",
        primaryBorderColor: dark ? "#00d4ff" : "#0891b2",
        lineColor: dark ? "#5c7392" : "#94a3b8",
        secondaryColor: dark ? "#121a2e" : "#eef6ff",
        tertiaryColor: dark ? "#0b1120" : "#f1f6ff",
        noteBkgColor: dark ? "#121a2e" : "#eef6ff",
        noteTextColor: dark ? "#d8e2f0" : "#0f172a",
        edgeLabelBackground: dark ? "#0a0e1a" : "#ffffff",
      },
    });
  }

  function render() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll(".mermaid-chart")
    );
    if (!nodes.length) return;

    if (state.busy) {
      state.pending = true;
      return;
    }
    state.busy = true;

    loadMermaid()
      .then(function (mermaid) {
        initMermaid(mermaid, currentScheme());

        nodes.forEach(function (node) {
          if (!sources.has(node)) {
            sources.set(node, node.textContent);
          }
          node.removeAttribute("data-processed");
          node.textContent = sources.get(node);
        });

        return mermaid.run({ nodes: nodes });
      })
      .catch(function (err) {
        console.warn("[mermaid]", err);
      })
      .then(function () {
        state.busy = false;
        if (state.pending) {
          state.pending = false;
          render();
        }
      });
  }

  function schedule(delay) {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(render, delay || 0);
  }

  // 每次页面切换（含即时加载）后渲染
  if (window.document$) {
    window.document$.subscribe(function () {
      schedule(0);
    });
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      schedule(0);
    });
  } else {
    schedule(0);
  }

  // 深浅色切换后按新主题重绘
  new MutationObserver(function () {
    schedule(120);
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"],
  });
})();
