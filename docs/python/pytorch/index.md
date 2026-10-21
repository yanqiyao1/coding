---
title: PyTorch
description: 从 tensor 和 autograd 开始，把训练循环的每一行都写明白
hide:
  - toc
---

这一部分的目标不是「会用 `nn.Sequential`」，而是**能解释训练过程中的每一个数字是从哪来的**：梯度怎么算、显存被谁吃了、为什么换个 batch size 结果就不一样。

<div class="panel" markdown>

<p class="panel__title">🔥 文章</p>

- [Tensor 与 autograd：把反向传播拆开看](tensor-autograd.md) <span>手写一遍梯度，再回来看 `loss.backward()`</span>

</div>

## 计划中

- **`nn.Module` 与训练循环**：参数注册、`train()` / `eval()` 到底改了什么、为什么必须 `zero_grad()`
- **DataLoader 与数据管道**：`Dataset` 的两种写法、`num_workers`、collate_fn、变长序列的 padding
- **混合精度**：`autocast` 与 `GradScaler`、bf16 和 fp16 的取舍
- **显存**：激活值、优化器状态、`checkpoint`、`empty_cache()` 为什么没用

## 前置

至少写过一次「用 numpy 实现两层全连接网络 + 反向传播」的练习。没写过也没关系，`tensor-autograd` 这篇就是从零推的。
