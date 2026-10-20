---
date: 2026-10-02
title: 缓存友好的循环重排
slug: cache-friendly-loops
authors: [qiyao]
categories: [C 与内存]
description: 同样一个求和，把内外层循环换个顺序，慢了六倍。分块为什么能把它救回来。
---

矩阵求和是那种「怎么遍历不是一样」的代码：

```c
for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
        sum += a[i * n + j];
```

把内外层交换一下，数学上完全等价，加法次数一次不差。但在 `n = 4096` 时，它在我的机器上慢 **5.9 倍**。

这篇想说明两件事：为什么会有这个差距，以及分块（blocking）是怎么把它抹平的。所有数字都是下面这段代码真跑出来的。

<!-- more -->

## 实验

```c title="bench.c"
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static double sink;   /* 防止整个循环被优化掉 */

static double now_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1e3 + ts.tv_nsec / 1e6;
}

/* 行优先：a[i*n + j]，内层走 j */
static double sum_rows(const double *a, size_t n) {
    double s = 0.0;
    for (size_t i = 0; i < n; i++)
        for (size_t j = 0; j < n; j++)
            s += a[i * n + j];
    sink = s;
    return s;
}

/* 列优先：a[i*n + j]，内层走 i */
static double sum_cols(const double *a, size_t n) {
    double s = 0.0;
    for (size_t j = 0; j < n; j++)
        for (size_t i = 0; i < n; i++)
            s += a[i * n + j];
    sink = s;
    return s;
}

/* 分块：把矩阵切成 B x B 的块，块内仍按行访问 */
static double sum_blocked(const double *a, size_t n, size_t B) {
    double s = 0.0;
    for (size_t ii = 0; ii < n; ii += B)
        for (size_t jj = 0; jj < n; jj += B)
            for (size_t i = ii; i < ii + B && i < n; i++)
                for (size_t j = jj; j < jj + B && j < n; j++)
                    s += a[i * n + j];
    sink = s;
    return s;
}
```

计时用 `CLOCK_MONOTONIC`，每个函数跑 5 次取最小值（排除调度抖动）。`main` 和上面的计时逻辑我省掉了，完整版本在[仓库](https://github.com/yanqiyao1/coding)里：

```bash
$ cc -O2 -o bench bench.c
$ ./bench 4096
n=4096  bytes=134.2 MB
row-major       8.35 ms
col-major      49.64 ms  (5.9x slower)
blocked(32)     9.02 ms  (1.08x vs row)
```

## 数据

不同规模下各跑一遍（Apple M4 / macOS 15.7 / Apple clang 14.0.3，`-O2`，每个数字是 5 次的最小值）：

| n | 数据量 | 行优先 | 列优先 | 分块（B=32） |
| --- | --- | --- | --- | --- |
| 256 | 0.5 MB | 0.05 ms | 0.05 ms | 0.05 ms |
| 512 | 2.1 MB | 0.17 ms | 0.24 ms | 0.18 ms |
| 1024 | 8.4 MB | 0.65 ms | 0.92 ms | 0.66 ms |
| 2048 | 33.6 MB | 2.25 ms | 8.89 ms | 2.19 ms |
| 4096 | 134.2 MB | 8.35 ms | 49.64 ms | 9.02 ms |

规律很清楚：

- **数据小的时候（≤ 8 MB）差距只有 1.4 倍**——整个矩阵基本在片上缓存里，怎么跳都不贵
- **数据一超出缓存，差距立刻变成 4～6 倍**——这时候每次访问都要往内存跑
- **分块几乎和行优先一样快**，在所有规模下都是

## 为什么会这样

内存不是按字节搬运的，是以 **cache line** 为单位整块搬的。x86 上一条 line 是 64 字节，Apple Silicon 的 L1 是 128 字节。取一个 `double`（8 字节），硬件会把包含它的 64 字节一起搬到缓存里——也就是**顺便带了 7 个邻居**。

行优先的访问正好用得上这些邻居：

```text
访问顺序: a[0] a[1] a[2] ... a[7] | a[8] ...
           └──── 一条 cache line ────┘
命中情况: miss hit  hit  ... hit   | miss ...
```

每个 cache line 只 miss 一次，之后 7 次全部命中。134 MB 的数据，实际从内存读的也是 134 MB，有效带宽约 16 GB/s。

列优先的访问则是：

```text
访问顺序: a[0]      → miss（搬进 64 字节，只用 8 字节）
          a[4096]   → miss（另一条 line，另一页）
          a[8192]   → miss
          ...
```

内层每走一步就跨 32 KB（`n * 8` 字节）。上一个 line 里剩下的 7 个 `double` 在**这一整趟列遍历里都用不上了**——要等外层 `j` 递增，才回来用它们。等回来的时候，缓存里早被别的 line 挤掉了。

这带来三个代价：

1. **带宽浪费**：每条 line 只用了 1/8，等效带宽掉到 2.7 GB/s
2. **预取器失效**：硬件预取器靠「连续地址」猜测下一步，32 KB 的等距跳跃超出它的能力
3. **TLB 压力**：每个元素都在不同的页上（4 KB 页装不下同一列的相邻元素），地址翻译也变慢

第二点最容易被忽略。CPU 的预取器不是魔法，它认的是 stride——小的固定 stride 能预取（所以列优先比完全随机还是快得多），32 KB 这种跨页 stride 就无能为力了。

!!! note "为什么只慢 6 倍，不是 8 倍"

    因为 4096 行 × 64 字节 = 256 KB，同一列的所有 line 加起来还能塞进 L2。第二趟列遍历时，虽然 L1 已经不认识了，但 L2 里可能还有。如果再大一个数量级，差距会更难看。

## 分块：让每次搬进来的数据被用满

既然问题在于「搬进来 64 字节只用 8 字节」，那就改成**搬进来之后把它用光**：

```text
不分块：先走完一整行，再走下一行   → 跨行访问时 cache line 早被淘汰
分块：  先处理 32x32 的小块        → 块只有 32*32*8 = 8 KB，稳稳待在 L1
```

在块内部仍然按行访问（连续地址），所以每条 cache line 的 8 个 `double` 都会被用上；块与块之间虽然跳跃，但块足够小，装得进 L1（M4 的 L1D 是 128 KB，8 KB 的块绰绰有余）。

代价是循环多了一层，边界处理麻烦了一点（`i < ii + B && i < n`）。收益是 5.9 倍的那个差距直接消失。

块大小怎么选？经验规则：**让 `B × B × sizeof(T)` 落在 L1 的一半以内**。`double` 的 `B = 32` 对应 8 KB；`float` 可以用 `B = 64`（16 KB）。太小则循环开销占比升高，太大则装不进 L1。

```c
/* 想让 B 可调，就用模板/宏，别在运行时传参——这层循环要能被展开 */
#define BLOCK 32
```

## 什么时候值得这么改

先说实话：**大多数代码不需要手写分块**。编译器会做循环交换和向量化，BLAS 之类的库早就把这套做到极致了——真要做矩阵乘法，用 `cblas_dgemm` 而不是自己写三重循环。

值得考虑分块的情况是：

- 你在写数值计算的内核，且已经在用 `-O3 -march=native` 之后仍然是瓶颈
- 访问模式由数据结构决定，编译器没法替你换顺序（比如稀疏矩阵、图遍历）
- 你在写库，需要跨编译器、跨平台都有稳定表现

不值得的情况：`n` 只有几十、总耗时在微秒级、或者这个循环一年跑一次。**优化之前先测**，`perf stat` 里的 `cache-misses` 比直觉可靠：

```bash
$ perf stat -e cache-references,cache-misses ./bench 4096
```

## 顺带一提：另一种「缓存问题」

多线程程序里还有一种更隐蔽的情况——**false sharing**。两个线程各自修改同一个 cache line 上的不同变量，硬件仍然要在这条 line 上做一致性同步，性能会莫名其妙地掉。解法是让热点变量各自独占一条 line：

```c
struct aligned_counter {
    _Alignas(64) long value;
};
```

这和分块是同一件事的两面：**缓存的单位是 line，不是变量**。写代码时脑子里要有这条 64 字节的线。

---

这一篇和上一篇 [C 语言里的未定义行为](../posts/2026-10-17-undefined-behavior.md) 是同一个系列的两半：那篇讲「编译器可以假设什么」，这篇讲「硬件实际怎么搬数据」。两件事都不在源码里，但都决定了程序跑多快、跑不跑得对。
