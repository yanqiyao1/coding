---
title: 工具链
description: 编译器、CMake、Git 与 Shell
hide:
  - toc
---

代码写得对不对是一回事，工程能不能维护是另一回事。这个系列记录那些「一开始觉得麻烦、后来离不开」的工具和配置。

## 已发布

- [一个够用的 CMake 模板](../../blog/posts/2026-10-08-cmake-that-works.md)
  从 `g++ main.cpp` 到 target-based 的 CMake，附带 sanitizer 和 CTest。

## 接下来写

- 编译器的警告选项：`-Wall -Wextra` 之外，`-Wconversion` 和 `-Wshadow` 值得开吗
- `-O2` 到底做了什么：从 `-fdump-tree-optimized` 看优化过程
- 从 Makefile 迁移到 CMake：什么时候值得，什么时候不值得
- Git：rebase / worktree / bisect，三个真正省时间的功能
- Shell：`set -euo pipefail` 之后仍然会踩的坑

## 参考

- GCC / Clang 的官方手册（`man gcc` 比搜索快）
- [CMake Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)
- *Pro Git*（免费在线，中文版也有）
