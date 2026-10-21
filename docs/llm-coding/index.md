---
title: LLM 手撕代码
description: 面试现场要能写出来的那些组件
hide:
  - toc
---

大模型岗位的面试手撕题有一个共同点：**代码不长，但必须精确**。Attention 少一个 `-inf`、LayerNorm 少一个 `eps`、RoPE 的维度配错一半，结果就全错。

这个模块把常见题目拆成「公式 → 形状 → 代码 → 追问」，每篇都能直接跑。

<div class="panel" markdown>

<p class="panel__title">🤖 已整理</p>

- [手写 Self-Attention（含因果掩码）](attention.md) <span>从公式到多头，再到 `scaled_dot_product_attention`</span>

</div>

## 题目清单

| 类别 | 题目 | 状态 |
| --- | --- | --- |
| 基础组件 | [Self-Attention 与因果掩码](attention.md) | 已整理 |
| 基础组件 | Multi-Head Attention（含 reshape 的顺序） | 计划中 |
| 基础组件 | LayerNorm / RMSNorm（手推梯度） | 计划中 |
| 基础组件 | RoPE 位置编码（含外推） | 计划中 |
| 基础组件 | SwiGLU / FFN | 计划中 |
| 训练 | CrossEntropy 与 label smoothing | 计划中 |
| 训练 | LoRA 注入与初始化 | 计划中 |
| 训练 | 梯度累积与裁剪 | 计划中 |
| 推理 | KV Cache（增量解码） | 计划中 |
| 推理 | Sampling：top-k / top-p / temperature | 计划中 |
| 推理 | Beam Search | 计划中 |
| 其他 | Softmax 的数值稳定实现 | 计划中 |
| 其他 | BN 与 LN 的区别（含小 batch 行为） | 计划中 |

## 面试时的加分项

- **先说形状**：`[B, T, C]` 进、`[B, T, C]` 出，每一步 shape 变化能讲清楚
- **再说复杂度**：Attention 是 O(T²·C)，KV Cache 把生成阶段的复杂度降到 O(T·C)
- **最后说坑**：mask 用 `-inf` 还是大负数、`softmax` 在 fp16 下的溢出、`sqrt(d)` 为什么不能省
