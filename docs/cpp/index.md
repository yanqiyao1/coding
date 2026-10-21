---
title: C++ 基础与进阶
description: 从对象模型到移动语义、并发与性能
hide:
  - toc
---

C++ 的难点不在语法，而在「这段代码到底做了什么」：对象什么时候构造、内存谁负责、这里发生的是移动还是拷贝、编译器有没有把它优化掉。

<div class="panel" markdown>

<p class="panel__title">⚙️ 两个部分</p>

- [基础](basics/index.md) <span>类型系统、指针与引用、RAII、STL、模板入门</span>
- [进阶](advanced/index.md) <span>移动语义、智能指针、并发、编译期计算、性能</span>

</div>

## 建议的顺序

1. **基础**：重点是「值语义」和对象生命周期。把栈/堆、构造/析构、拷贝发生的位置数清楚，后面就顺了。
2. **进阶**：移动语义、智能指针、并发。这三块是面试和工程里最常被问到的。

## 已发布

- [RAII 与智能指针：谁负责 delete](advanced/raii-smart-pointers.md) —— 从 `lock_guard` 讲到 `weak_ptr` 断开循环引用

## 计划中

- 基础：对象模型与内存布局 / 引用、指针与 const / STL 容器的复杂度与失效规则
- 进阶：移动语义与完美转发 / 并发与内存序 / 模板与编译期计算
