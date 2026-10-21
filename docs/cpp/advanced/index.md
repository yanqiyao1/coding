---
title: 进阶
description: 移动语义、智能指针、并发——现代 C++ 的三道坎
hide:
  - toc
---

进阶部分只讲三件事，但每件都值得反复看：**所有权怎么表达**、**对象怎么移动**、**多线程怎么不出错**。

<div class="panel" markdown>

<p class="panel__title">📄 文章</p>

- [RAII 与智能指针：谁负责 delete](raii-smart-pointers.md) <span>从 `lock_guard` 讲到 `weak_ptr` 断开循环引用</span>

</div>

## 计划中

- **移动语义与完美转发**：右值引用、`std::move` 不移动、返回值优化、`std::forward`
- **并发与内存序**：`std::thread`、`mutex`、`atomic`、`memory_order` 到底在保证什么
- **模板与编译期计算**：`constexpr`、`if constexpr`、变参模板
- **性能**：缓存友好、`std::string` 的 SSO、避免不必要的拷贝

## 前置

能说清楚「拷贝构造函数什么时候被调用」，再来看移动语义会轻松很多。
