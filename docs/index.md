---
title: 首页
hide:
  - navigation
  - toc
---

<div class="hero" markdown>

# 把学到的东西讲清楚

<p class="hero__subtitle">C / C++、操作系统、算法与工程实践。<br>写代码时踩过的坑，回头讲一遍。</p>

[:material-book-open-variant: 读博客](blog/index.md){ .md-button .md-button--primary }
[:material-account-circle-outline: 关于我](about/index.md){ .md-button }

<p class="hero__meta">更新于 2026 年 10 月 · 用 MkDocs Material 写作</p>

</div>

<div class="grid cards" markdown>

-   :material-memory:{ .lg .middle } __C 与内存__

    ---

    指针、对象生命周期、未定义行为、缓存友好性。
    写 C 的人迟早要在这些地方栽一次。

    [:octicons-arrow-right-24: 进入系列](series/c-memory/index.md)

-   :material-console:{ .lg .middle } __系统与调试__

    ---

    进程、虚拟内存、gdb、core dump、性能测量。
    让程序在出问题时还能被看见。

    [:octicons-arrow-right-24: 进入系列](series/systems/index.md)

-   :material-wrench-outline:{ .lg .middle } __工具链__

    ---

    编译器、CMake、Git、Shell。
    把「能跑」变成「可维护」。

    [:octicons-arrow-right-24: 进入系列](series/tooling/index.md)

</div>

## 最近更新

- **2026-10-20** · [为什么又开一个博客](blog/posts/2026-10-20-hello.md) —— 写什么、怎么写、这个站是怎么搭起来的
- **2026-10-17** · [C 语言里的未定义行为](blog/posts/2026-10-17-undefined-behavior.md) —— 编译器没有义务实现你的想象
- **2026-10-13** · [gdb 的第一小时](blog/posts/2026-10-13-gdb-first-hour.md) —— 从 segfault 到定位到具体的那一行

## 关于这个站

这里不写「十分钟入门」之类的东西。每篇文章尽量做到两件事：把机制讲清楚，把代码跑起来给你看。

站点的源码在 [yanqiyao1/coding](https://github.com/yanqiyao1/coding)，用 MkDocs Material 排版、GitHub Actions 自动构建。
个人主页在 [yanqiyao1.github.io](https://yanqiyao1.github.io/)，这里只放长文。
