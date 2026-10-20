---
title: C 与内存
description: 指针、对象生命周期、未定义行为与缓存
hide:
  - toc
---

C 语言给人的错觉是「我知道它在干什么」。多数时候确实如此，但那少数时候——有符号溢出、越界、别名、悬垂指针——编译器并没有义务实现你的想象。

这个系列想解决一件事：**让你写下的每一行 C 代码，行为都是可预测的。**

## 已发布

- [C 语言里的未定义行为](../../blog/posts/2026-10-17-undefined-behavior.md)
  编译器如何利用 UB 做优化，以及怎么用 sanitizer 把它抓出来。
- [缓存友好的循环重排](../../blog/posts/2026-10-02-cache-friendly-loops.md)
  同样是求和，行优先和列优先差了 6 倍；分块为什么能救回来。

## 接下来写

- 指针与数组：数组退化、`&arr` 和 `arr` 的区别、二维数组的真实类型
- `malloc` / `free` 背后：元数据、对齐、为什么 `free` 不需要长度
- 结构体布局：padding、`alignas`、为什么把 `char` 换成 `double` 之后结构体大了 8 字节
- 柔性数组与 `offsetof`
- `restrict` 与严格别名：编译器什么时候可以假设两个指针不重叠

## 参考

- *Computer Systems: A Programmer's Perspective*（CSAPP）第 2、3、6 章
- ISO/IEC 9899:2018（C17）——遇到争议时以标准原文为准
- *Expert C Programming: Deep C Secrets*——老书，但关于数组指针的那几章仍然好用
