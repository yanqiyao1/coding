---
title: 手写 Self-Attention（含因果掩码）
description: 从公式到多头，再到和 F.scaled_dot_product_attention 对齐
---

面试里让手写 Attention，考的不是背代码，而是**形状意识**和**细节**：mask 加在哪、为什么除以 `√d`、多头的 reshape 顺序对不对。

这篇从公式开始，写完单头再拼多头，最后和 PyTorch 的内置实现比对输出。

## 公式与形状

```text
Attention(Q, K, V) = softmax(Q·Kᵀ / √d_k) · V
```

约定输入形状：

```text
q, k, v : [B, H, T, D]
B = batch, H = 头数, T = 序列长度, D = 每个头的维度
```

attention 的输出是 `[B, H, T, D]`，注意力权重是 `[B, H, T, T]`——**每个 query 对所有 key 的分数**。

## 单头实现

```python title="attention.py"
import math
import torch

def attention(q, k, v, causal=True):
    d = q.size(-1)

    # 1. 打分：最后一维和倒数第二维相乘 -> [B, H, T, T]
    scores = q @ k.transpose(-2, -1) / math.sqrt(d)

    # 2. 因果掩码：位置 i 只能看到 <= i 的 token
    if causal:
        T = q.size(-2)
        mask = torch.triu(
            torch.ones(T, T, dtype=torch.bool, device=q.device), diagonal=1
        )
        scores = scores.masked_fill(mask, float("-inf"))

    # 3. 归一化 + 加权求和
    attn = scores.softmax(dim=-1)
    return attn @ v, attn
```

三个细节：

- `transpose(-2, -1)` 只交换最后两维，前面的 `[B, H]` 不动
- mask 用 `-inf` 而不是 0：`softmax` 之前要让它变成 0 概率
- 除的是 `√d`，不是 `d`

跑一下：

```python
B, H, T, D = 2, 3, 5, 8
q = torch.randn(B, H, T, D)
k = torch.randn(B, H, T, D)
v = torch.randn(B, H, T, D)

out, a = attention(q, k, v)
print(out.shape)          # torch.Size([2, 3, 5, 8])
print(a.shape)            # torch.Size([2, 3, 5, 5])
print(a[0, 0, 0].sum())   # tensor(1.0000)
print(a[0, 0].triu(1).abs().max())   # tensor(0.)
```

最后一行验证了因果性：**对角线右上方全是 0**，也就是每个位置都没有看到未来。

## 为什么除以 √d

`q·k` 是 `d` 个乘积的和。如果 `q`、`k` 的每个分量独立、均值 0、方差 1，那么点积的方差是 `d`，标准差是 `√d`。

不缩放的话，`d=64` 时分数会散布在 ±8 左右，`softmax` 会变得非常尖锐——几乎变成 one-hot，梯度接近 0，训练不动。除以 `√d` 把方差拉回 1 附近，softmax 的输出才「软」得起来。

!!! note "面试追问：为什么是 √d 而不是 d"

    目标是让点积的**方差**回到 1。点积方差是 `d`，所以要除以 `√d`；除以 `d` 会把方差压成 `1/d`，反而过平滑。

## 多头：只是换个形状

多头不是把 attention 跑 H 次，而是把 `d_model` 切成 H 份，并行算再拼回来。

```python title="mha.py"
import torch
import torch.nn as nn

class SelfAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads = n_heads
        self.d_head = d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model)   # 一次算出 q/k/v
        self.proj = nn.Linear(d_model, d_model)

    def forward(self, x):
        B, T, C = x.shape

        q, k, v = self.qkv(x).chunk(3, dim=-1)        # 各 [B, T, C]

        # [B, T, C] -> [B, T, H, D] -> [B, H, T, D]
        q = q.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.d_head).transpose(1, 2)

        out, _ = attention(q, k, v)                   # [B, H, T, D]

        # 拼回 [B, T, C]
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(out)
```

```text
mha out: torch.Size([2, 10, 64])
```

`view` 和 `transpose` 的顺序是最容易写错的地方。记住：**先切分头，再把头挪到前面**。

```text
[B, T, C] --view--> [B, T, H, D] --transpose(1,2)--> [B, H, T, D]
```

回来的时候反过来：`transpose(1, 2)` 之后必须 `.contiguous()`，否则 `view` 会因为内存不连续而报错。

## 和内置实现对一遍

PyTorch 2.0 之后有 `F.scaled_dot_product_attention`，可以直接对照：

```python
import torch.nn.functional as F

ref = F.scaled_dot_product_attention(q, k, v, is_causal=True)
print((out - ref).abs().max())    # tensor(3.5763e-07)
```

差值是浮点误差级别的 `3.58e-07`，说明实现是对的。

生产代码当然用内置版本——它会自动选 FlashAttention、Memory-Efficient 或数学实现，快得多。但面试要你手写的时候，得能写出上面那 10 行。

## 面试常追问

**1. 复杂度是多少？**

`O(T²·D)`。分数矩阵是 `T×T`，这是长上下文贵的根本原因。FlashAttention 优化的是**显存访问**，不是把 `T²` 变成线性。

**2. 推理时为什么要 KV Cache？**

自回归生成时，第 `t` 步只需要新的 query，但 key/value 要包含前面所有 token。把历史 K、V 缓存下来，每步只算一个新的 q，复杂度从 `O(T²)` 降到 `O(T)`。

**3. mask 为什么用 `-inf` 而不是 `-1e9`？**

`-inf` 在 softmax 里精确变成 0；一个大负数在 fp16 下可能溢出（fp16 最大约 65504），或者因为指数太小得到 0 但仍有数值误差。fp16 里常用 `-1e4` 这类安全值，但要清楚它只是近似。

**4. 多头和单头参数量一样吗？**

如果 `d_model` 相同，总参数量基本一样（`4·d_model²`）。多头是把同样的计算切成 H 份并行，换来的是**不同的表示子空间**，不是更多参数。

## 五个常见错误

| 错误 | 后果 |
| --- | --- |
| 忘了除 `√d` | softmax 过尖，梯度消失 |
| mask 加在 softmax 之后 | 概率不再归一，分母错了 |
| `transpose` 后没 `contiguous()` 就 `view` | 运行时直接报错 |
| 多头 reshape 时把 `T` 和 `H` 弄反 | shape 对得上但语义全错，最难查 |
| causal mask 用了 `tril` | 看到的是未来，训练 loss 异常低 |

## 小结

手写 Attention 的检查清单：

1. 形状 `[B, H, T, D]`，输出同形
2. 缩放因子 `1/√d`
3. mask 在 softmax **之前**，用 `-inf`
4. 多头：`view → transpose → attention → transpose → contiguous → view`
5. 和 `F.scaled_dot_product_attention` 对齐验证

下一篇写 Multi-Head 的完整实现和 KV Cache：怎么在增量解码时复用历史 K/V，以及为什么它能让生成快一个数量级。
