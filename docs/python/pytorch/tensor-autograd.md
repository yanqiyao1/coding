---
title: Tensor 与 autograd：把反向传播拆开看
description: 从 requires_grad 到 loss.backward()，中间到底发生了什么
---

`loss.backward()` 是深度学习里最像魔法的一行：调一下，所有参数的梯度就都有了。

这篇把它拆开：先看张量是什么，再看 autograd 怎么记录运算，最后手推一遍线性回归的梯度，和 PyTorch 的结果对上。

## 张量：带 dtype 和 device 的多维数组

```python
import torch

a = torch.tensor([[1.0], [2.0]])          # [2, 1]
b = torch.tensor([10.0, 20.0, 30.0])      #    [3]

c = a + b
print(c.shape)      # torch.Size([2, 3])
```

形状不同却能相加，靠的是**广播**：从右往左对齐，维度为 1 的那一维被「拉长」。

```text
a:  [2, 1]  →  [2, 3]
b:     [3]  →  [2, 3]
```

广播不是复制数据，是计算时按规则取值。所以 `[2,1] + [3]` 不会真的创建一个 2×3 的中间结果再相加（至少在算子实现里不是）。

## autograd：把运算记成一张图

```python
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x ** 2).sum()

print(y.grad_fn)     # <SumBackward0 object at 0x...>
y.backward()
print(x.grad)        # tensor([2., 4., 6.])
```

几件事同时发生了：

1. `x` 带 `requires_grad=True`，它参与的每个运算都会被记录
2. `y` 的 `grad_fn` 指向产生它的那个反向函数（这里是 `SumBackward0`）
3. `backward()` 从 `y` 出发，沿着 `grad_fn` 链把梯度一层层传回去
4. 传回来的梯度**累加**到叶子张量的 `.grad` 上

`x.grad` 是 `[2, 4, 6]`，因为 $\frac{d}{dx}x^2 = 2x$，代入 `x = [1,2,3]` 正好是 `[2,4,6]`。

!!! note "叶子与非叶子"

    自己创建、带 `requires_grad=True` 的张量是**叶子**（`x.is_leaf == True`），梯度会存进 `.grad`。中间结果（比如 `y`）不是叶子，梯度算完就丢，除非你调 `y.retain_grad()`。

## 手推一遍线性回归的梯度

模型和损失：

$$
\hat{y} = wx + b, \qquad L = \frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)^2
$$

分别对 $w$ 和 $b$ 求偏导：

$$
\frac{\partial L}{\partial w} = \frac{2}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)\,x_i,
\qquad
\frac{\partial L}{\partial b} = \frac{2}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)
$$

用 `w=1, b=0`，数据 `x=[1,2,3]`、`y=[3,5,7]` 算一遍：

```python
w = torch.tensor(1.0, requires_grad=True)
b = torch.tensor(0.0, requires_grad=True)
xs = torch.tensor([1.0, 2.0, 3.0])
ys = torch.tensor([3.0, 5.0, 7.0])

pred = w * xs + b
loss = ((pred - ys) ** 2).mean()
loss.backward()

print(loss.item())      # 9.666666984558105
print(w.grad.item())    # -13.333333969116211
print(b.grad.item())    # -6.0
```

手算验证：

- `pred = [1, 2, 3]`，误差 `[-2, -3, -4]`
- `L = (4 + 9 + 16) / 3 = 29/3 ≈ 9.667` ✓
- `∂L/∂w = 2/3 × (−2×1 + −3×2 + −4×3) = 2/3 × (−20) ≈ −13.333` ✓
- `∂L/∂b = 2/3 × (−2 − 3 − 4) = −6` ✓

对上了。**autograd 做的就是这件事**，只是把链式法则自动化了。

## 为什么必须 `zero_grad()`

梯度是**累加**的，PyTorch 不会自动清零：

```python
w = torch.tensor(1.0, requires_grad=True)
for i in range(2):
    loss = (w * 1.0) ** 2
    loss.backward()
    print(w.grad.item())    # 2.0 然后 4.0
```

第一次 `2w = 2`，第二次又加了 2，所以是 4。训练循环里如果忘了 `optimizer.zero_grad()`，梯度会一轮轮累加，学习率相当于被你悄悄放大了。

## 训练循环的五步

```python
for xb, yb in loader:
    pred = model(xb)              # 1. 前向
    loss = loss_fn(pred, yb)      # 2. 算损失
    optimizer.zero_grad()         # 3. 清空上一轮梯度
    loss.backward()               # 4. 反向传播，填 .grad
    optimizer.step()              # 5. 按梯度更新参数
```

这五行是几乎所有 PyTorch 训练代码的骨架。`nn.Module`、混合精度、梯度累积，都是在这五步上加东西。

## 三个容易踩的坑

**1. 对叶子做原地操作**

```python
x = torch.tensor([1.0], requires_grad=True)
x += 1
# RuntimeError: a leaf Variable that requires grad is being used in an in-place operation.
```

autograd 需要原始值来算梯度，原地改掉它就没法求导了。要改就写 `x = x + 1`（新建对象），或者在 `torch.no_grad()` 里改。

**2. 拿 tensor 当日志**

```python
print(loss)          # tensor(9.6667, grad_fn=<MeanBackward0>)
print(loss.item())   # 9.666666984558105
```

`.item()` 取 Python 标量，不会带着计算图，也不占显存。

**3. `no_grad()` 和 `detach()` 不是一回事**

- `with torch.no_grad():`：这段代码里的运算不记录计算图（推理、评估时用）
- `t.detach()`：返回一个共享存储、但脱离计算图的新张量（改它会影响原张量）

推理时用 `model.eval()` + `torch.no_grad()`：

```python
model.eval()
with torch.no_grad():
    logits = model(x)
```

`model.eval()` 改的是层的行为（Dropout、BatchNorm），`no_grad()` 关的是梯度记录，两件事都要做。

## 小结

| 概念 | 一句话 |
| --- | --- |
| `requires_grad` | 这个张量参不参与求导 |
| `grad_fn` | 产生这个张量的运算，反向传播的入口 |
| `.backward()` | 从当前张量往回走，把梯度累加到叶子的 `.grad` |
| `.grad` | 梯度，累加的，不会自动清零 |
| `no_grad` / `detach` | 不记录计算图 / 从图里摘出来 |

下一篇会在这个骨架上装 `nn.Module`：参数怎么注册、`train()` 和 `eval()` 改了什么、`DataLoader` 的 `num_workers` 为什么会卡住。
