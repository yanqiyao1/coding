---
title: 基础
description: 值语义、对象生命周期、STL——把「发生了什么」数清楚
hide:
  - toc
---

C++ 的基础不是背语法，而是建立三个直觉：**对象在哪**、**谁的生命周期更长**、**这一步是拷贝还是引用**。

<div class="panel" markdown>

<p class="panel__title">📄 计划中</p>

- 对象模型与内存布局 <span>栈/堆、对齐、空类的大小、虚函数表</span>
- 引用、指针与 `const` <span>三种 const 位置、引用折叠、指针的指针</span>
- 构造与析构的顺序 <span>成员初始化列表、临时对象、返回值优化</span>
- STL 容器 <span>vector 扩容、迭代器失效、map/unordered_map 的取舍</span>
- 模板入门 <span>函数模板、类模板、为什么模板要写在头文件里</span>

</div>

## 怎么练

每个话题都配一段能编译的小程序：先预测输出，再实际跑一遍，最后解释差异。编译器用 `-Wall -Wextra -Wpedantic`，很多「我以为」会在这里被拦下来。
