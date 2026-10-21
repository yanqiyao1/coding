---
title: 基础
description: 对象、名字、作用域——Python 里那些「看起来会」但其实没想明白的东西
hide:
  - toc
---

Python 的语法很浅，坑都在语义上：名字和对象是什么关系、可变对象在哪里被共享、函数参数到底传了什么。

这一部分不讲「怎么写出能跑的代码」，讲**为什么它会这样跑**。

<div class="panel" markdown>

<p class="panel__title">📄 文章</p>

- [变量不是盒子：Python 的对象模型](names-and-objects.md) <span>`is` / 可变默认参数 / 浅拷贝，一次讲清楚</span>

</div>

## 计划中

- **迭代器与生成器**：`yield` 的暂停与恢复、惰性求值的代价
- **装饰器与闭包**：`functools.wraps`、带参数的装饰器、类装饰器
- **类与魔法方法**：`__init__` / `__call__` / `__getattr__` 的区别，为什么 PyTorch 用 `module(x)` 而不是 `module.forward(x)`
- **类型标注**：`Optional`、`TypeVar`、`Protocol`，以及运行时到底检查了什么
- **异常与上下文管理器**：`with` 的协议、`contextlib`、异常链
- **并发**：GIL、`threading` / `multiprocessing` / `asyncio` 各自适合什么

## 怎么练

每个话题配一个 20 行以内的小例子，跑一遍、改坏一次、再解释为什么坏。这个模块里的所有代码都可以直接用 `python3` 跑，不需要装任何第三方库。
