---
title: Python
description: 从语言本身，到 PyTorch，再到能跑起来的 LLM 项目
hide:
  - toc
---

这个模块分三段：先把 Python 本身写明白，再用 PyTorch 做深度学习，最后落到几个真的能跑起来的 LLM 项目。

<div class="panel" markdown>

<p class="panel__title">🐍 三个部分</p>

- [基础](basics/index.md) <span>对象模型、数据结构、函数与作用域、类、迭代器、装饰器、类型标注</span>
- [PyTorch](pytorch/index.md) <span>Tensor、autograd、nn.Module、训练循环、显存与混合精度</span>
- [LLM 项目](llm-projects/index.md) <span>tokenizer、Transformer、LoRA 微调、推理与评测</span>

</div>

## 建议的顺序

1. **基础**：至少把「对象模型」「迭代器与生成器」「装饰器」吃透。PyTorch 里大量写法（`nn.Module.__call__`、hook、`with torch.no_grad()`）都是这些机制的延伸。
2. **PyTorch**：从 tensor 和 autograd 开始，别一上来就 `nn.Sequential`。知道梯度是怎么来的，调参时才不是碰运气。
3. **LLM 项目**：先跑通一个小的（nanoGPT 这个量级），再去看 vLLM、SGLang 这类推理框架，否则会被抽象层淹没。

## 已发布

- [变量不是盒子：Python 的对象模型](basics/names-and-objects.md) —— `is`、可变默认参数、浅拷贝，全都从这一条推出来
- [Tensor 与 autograd：把反向传播拆开看](pytorch/tensor-autograd.md) —— 先手写一遍梯度，再回来看 `loss.backward()`

## 计划中

- 基础：迭代器与生成器 / 装饰器与闭包 / 类与魔法方法 / 类型标注与 `Protocol`
- PyTorch：`nn.Module` 与训练循环 / DataLoader 与数据管道 / 混合精度与显存
- LLM 项目：从零写 BPE tokenizer / 复现 nanoGPT / LoRA 微调一个小模型
