---
date: 2026-10-17
title: C 语言里的未定义行为
slug: undefined-behavior
authors: [qiyao]
categories: [C 与内存]
description: 未定义行为不是「结果不确定」，而是「编译器可以假设它永远不会发生」——这是两件完全不同的事。
---

C 语言里最容易被误解的一个概念是未定义行为（undefined behavior，简称 UB）。很多人的理解停在「结果不确定，别写就行」，但它真正的含义要严重得多：

> **undefined behavior** — behavior, for which this document imposes no requirements.
>
> — ISO/IEC 9899:2018, §3.4.3

标准不是「没说结果是什么」，而是**什么都没说**。编译器可以假定这件事永远不会发生，并基于这个假设做优化。于是你写下的那行「溢出一下应该没事」的代码，可能让整个函数被优化成别的东西。

<!-- more -->

## 第一个例子：有符号溢出

```c title="overflow.c"
#include <limits.h>
#include <stdio.h>

int main(void) {
    int x = INT_MAX;
    x += 1;                 // (1)
    printf("%d\n", x);
    return 0;
}
```

1. `INT_MAX + 1` 超出了 `int` 的表示范围。有符号整数溢出在 C 里是 **UB**，不是「回绕成 INT_MIN」。（无符号整数溢出是良定义的，会按 `2^n` 取模。）

打开 UBSan 跑一下：

```bash
$ cc -O0 -fsanitize=undefined -fno-sanitize-recover=all overflow.c -o overflow
$ ./overflow
overflow.c:6:7: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
SUMMARY: UndefinedBehaviorSanitizer: undefined-behavior overflow.c:6:7
```

`-fno-sanitize-recover=all` 让它在第一次出错时直接 abort，而不是「报告后继续」。调试阶段建议一直开着。

!!! note "为什么 `-O0` 也要开 sanitizer"

    UB 在 `-O0` 下往往表现为「看起来正常」：寄存器正好回绕、恰好读到想要的值。这比崩溃更危险——你会带着一个错误的结论继续往下写。sanitizer 是检查语义，不是检查优化后的产物，所以任何优化级别都应该开。

## 编译器到底拿 UB 做了什么

标准说「没有要求」，于是编译器有了一个极强的假设：**这段程序里不会发生 UB**。所以 `x + 1 > x` 永远为真。

```c title="assume.c"
#include <limits.h>

int always_true(int x) {
    return x + 1 > x;   // 若 x == INT_MAX 会溢出，而溢出是 UB
}
```

`cc -O2 -S` 在 arm64 上生成的东西，连比较都没有了：

```asm
_always_true:
    mov   w0, #1      ; 直接返回 1
    ret
```

同样的假设还能让循环整个消失。下面这个求和函数，在 `n == INT_MAX` 时 `i++` 会溢出（UB），因此编译器可以认为循环一定会正常结束，直接把它算成一个闭式解：

```asm
_sum_to:
    sub   w8, w0, #1
    umull x8, w0, w8      ; n * (n - 1)，用无符号乘法实现
    lsr   x8, x8, #1      ; / 2
    add   w8, w8, w0
    cmp   w0, #0
    csel  w0, wzr, w8, lt
    ret
```

一个 `for` 循环变成四条指令。这不是编译器「太聪明」，而是你先告诉它「这里不会溢出」——通过写下一个溢出了就会 UB 的循环。

!!! warning "这类优化不是 bug"

    如果你觉得「我的程序里 `n` 根本不会到 INT_MAX，优化掉有什么关系」——那确实没关系。问题出在反过来的情况：你写了一个会溢出的循环，然后奇怪为什么结果和 `-O0` 不一样。UB 的代价就是「讨论前提不成立时，任何结果都合法」。

## 第二个例子：求值顺序

```c
int i = 0;
i = i++ + 1;    // UB：i 在一个表达式中被修改了两次，且中间没有序列点
```

C11 之后标准把这类问题描述为「unsequenced side effect」，C17 里依然是 UB。clang 会直接警告：

```text
warning: multiple unsequenced modifications to 'i' [-Wunsequenced]
```

类似的还有：

| 写法 | 问题 |
| --- | --- |
| `a[i] = i++` | `i` 的读取和修改没有顺序 |
| `printf("%d %d", i++, i++)` | 参数求值顺序未指定 |
| `f() + g()` | 两个函数谁先执行未指定（如果它们都修改同一个全局变量，就是 UB） |
| `x = x++` | 同一个对象两次修改 |

!!! tip "记住一句话就够了"

    一个表达式里，对同一个标量对象的两次访问，如果其中至少一次是写，且两次之间没有序列点（`;`、`&&`、`||`、`?:`、逗号运算符、函数调用边界），那就是 UB。**不要为了少写一行而把副作用塞进表达式。**

## 第三个例子：越界与指针

数组越界是 UB，这一点大家都知道。不清楚的是它的**传染性**：

```c
int a[4];
for (int i = 0; i <= 4; i++)   // 应该是 i < 4
    a[i] = i;
```

越界写会踩坏相邻内存（可能是别的变量、可能是 `malloc` 的元数据、可能是返回地址）。而且因为越界是 UB，编译器完全可以假设 `i` 永远不会到 4，于是把循环条件优化成别的东西。

指针相关的经典 UB：

- 解引用空指针（`*p`，即使只是想取个地址做偏移）
- 解引用已 `free` 的指针（use-after-free）
- 指针算术跑出数组边界（哪怕不解引用，`p + n` 超出 `[a, a+n]` 也是 UB）
- 把 `int *` 强转成 `float *` 再解引用（违反严格别名规则）

严格别名这条特别隐蔽。下面这段代码在 `-O2` 下可能不按你想的执行：

```c
float f = 1.0f;
int *ip = (int *)&f;    // 违反 strict aliasing
*ip = 0x3f800000;

printf("%f\n", f);      // 可能仍然打印 1.000000：编译器认为 f 没被改过
```

正确做法是用 `memcpy`（编译器会把它优化成一条 move）：

```c
int bits = 0x3f800000;
float f;
memcpy(&f, &bits, sizeof f);   // 良定义，且没有额外开销
```

## 怎么把 UB 抓出来

靠读代码是不行的——UB 的可怕之处就在于它在源码层面看起来完全正常。要靠工具：

=== "运行时检查"

    ```bash
    cc -g -O1 \
       -fsanitize=address,undefined \
       -fno-sanitize-recover=all \
       -fno-omit-frame-pointer \
       demo.c -o demo
    ```

    - `address`：越界、use-after-free、double free、栈溢出
    - `undefined`：有符号溢出、移位越界、空指针、对齐错误、`vla` 问题
    - 两者可以同时开，代价是 2–3 倍运行时间和更多内存

    ASan 报 use-after-free 时长得像这样（输出已删去符号化路径和构建 ID）：

    ```text
    ==51420==ERROR: AddressSanitizer: heap-use-after-free on address 0x0001069006d8
    READ of size 4 at 0x0001069006d8 thread T0
        #0 0x10403fdf4 in main /tmp/demo.c:9
    0x0001069006d8 is located 8 bytes inside of 16-byte region
    freed by thread T0 here:
        #0 0x104462fa4 in wrap_free
        #1 0x10403fda8 in main /tmp/demo.c:8
    previously allocated by thread T0 here:
        #0 0x104462e68 in wrap_malloc
        #1 0x10403fd68 in main /tmp/demo.c:4
    ```

    三处栈回溯分别对应「读」「free」「malloc」，一眼就能看出生命周期错在哪。

=== "编译期检查"

    ```bash
    cc -std=c17 -Wall -Wextra -Wpedantic -Wconversion -Wshadow \
       -fanalyzer -O2 demo.c -o demo
    ```

    - `-Wconversion`：隐式窄化（`int` → `short`、`size_t` → `int`），能抓掉一大类溢出
    - `-Wshadow`：变量遮蔽，很多「改错了变量」的 bug 由此暴露
    - `-fanalyzer`（GCC）：路径敏感的静态分析，会真的走一遍分支

=== "测试时"

    ```bash
    cc -g -O1 -fsanitize=address,undefined -fno-sanitize-recover=all \
       tests/*.c -o tests && ./tests
    ```

    把 sanitizer 挂进 CI 的测试步骤，比出事之后再回来查便宜得多。

## 一张表总结

| 行为 | 是否 UB | 说明 |
| --- | --- | --- |
| 无符号整数溢出 | 否 | 按 `2^n` 取模，良定义 |
| 有符号整数溢出 | **是** | 用 `-fwrapv` 可以要求回绕，但会损失优化 |
| 数组越界读写 | **是** | 用 ASan 抓 |
| 解引用空指针 | **是** | 即使只读不写 |
| `free` 后继续使用 | **是** | use-after-free |
| 违反严格别名 | **是** | 用 `memcpy` 或 `may_alias` 属性 |
| 同一表达式内重复修改对象 | **是** | 拆成多条语句 |
| 除以零 | **是** | 整数除零；浮点是 IEEE 定义的 inf/nan |

## 最后

写 C 的时候，把「这段代码在什么情况下会不满足前提」当成一个必须回答的问题。回答不了的地方，就是 UB 藏身的地方。

工具能帮你兜住大部分：`-Wall -Wextra` 常开、测试跑 sanitizer、CI 上 `-Werror`。剩下的靠经验——而经验基本都是从「为什么 `-O2` 和 `-O0` 结果不一样」这类问题里长出来的。

下一篇会讲[缓存友好的循环重排](2026-10-02-cache-friendly-loops.md)：那里没有 UB，但同样的加法，换个循环顺序就差六倍。
