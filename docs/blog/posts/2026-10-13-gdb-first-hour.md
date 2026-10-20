---
date: 2026-10-13
title: gdb 的第一小时
slug: gdb-first-hour
authors: [qiyao]
categories: [系统与调试]
description: 段错误之后别急着加 printf：gdb 的十来个命令就能定位到出错的那一行。
---

程序崩了，最常见的反应是在可疑的地方插一堆 `printf`，然后一遍遍重新编译。问题是段错误往往发生在「和真正出错的地方隔着好几层调用」的位置——打印法能找到症状，但找不出因果。

gdb 的全部价值在于：**崩溃的那一刻，程序的完整状态还停在内存里**。你能看到调用栈、每一层的局部变量、以及那个非法地址是哪来的。

这篇是第一小时够用的那部分。

<!-- more -->

## 先把编译做对

```bash
cc -g -O0 -fno-omit-frame-pointer demo.c -o demo
```

- `-g`：生成调试信息（变量名、行号、类型）。没有它，gdb 只能给你地址
- `-O0`：不优化。优化会把变量塞进寄存器、把循环展开、把「没用」的变量删掉，`print x` 就会告诉你 `optimized out`
- `-fno-omit-frame-pointer`：保留帧指针，栈回溯更可靠

要在优化后的程序上调试，用 `-Og`：它保留调试所需的可读性，同时开启少量不影响调试的优化。

## 十个命令覆盖八成场景

| 命令 | 作用 |
| --- | --- |
| `run` / `r` | 从头开始运行；`run arg1 arg2` 传参数 |
| `bt` | 打印调用栈，`bt full` 连局部变量一起打 |
| `frame N` / `f N` | 切换到第 N 层栈帧 |
| `list` / `l` | 显示当前位置附近的源码 |
| `print x` / `p x` | 求值表达式；`p *node`、`p arr[3]`、`p/x addr` |
| `info locals` | 当前帧所有局部变量 |
| `next` / `n` | 单步，不进入函数 |
| `step` / `s` | 单步，进入函数 |
| `continue` / `c` | 继续运行到下一个断点 |
| `finish` | 跑完当前函数，回到调用者 |

## 一次典型的定位过程

下面这个程序要崩溃：链表节点只填了 `value`，忘了把 `next` 置空。

```c title="list.c"
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static int list_sum(const Node *head) {
    int sum = 0;
    while (head) {
        sum += head->value;      // (1)
        head = head->next;
    }
    return sum;
}

int main(void) {
    Node *a = malloc(sizeof *a);
    if (!a) return 1;

    a->value = 1;
    /* 忘了写 a->next = NULL; */

    printf("%d\n", list_sum(a));  // (2)
    free(a);
    return 0;
}
```

1. 崩溃点通常在这里：`head` 变成野指针之后被解引用
2. 真正的错误在这之前——问题出在「谁没有初始化它」

```bash
$ cc -g -O0 -o list list.c && ./list
Segmentation fault (core dumped)
```

### 用 gdb 看现场

```text
$ gdb ./list
(gdb) run
Program received signal SIGSEGV, Segmentation fault.
0x00005555555551a8 in list_sum (head=0x35c1a2b2b2b2b2b2) at list.c:12
12              sum += head->value;
```

!!! note "输出示意"

    地址、行号、路径都会随机器和源码变化，下面所有 gdb 输出都是示意。命令本身是准确的。

三个信息一次性拿到：

1. 崩在 `list_sum` 的第 12 行
2. `head` 的值是 `0x35c1a2b2b2b2b2b2`——一个明显不像合法堆地址的垃圾值
3. 这是 `SIGSEGV`，即访问了未映射的内存

### 往上找因果

```text
(gdb) bt
#0  0x00005555555551a8 in list_sum (head=0x35c1a2b2b2b2b2b2) at list.c:12
#1  0x0000555555555210 in main () at list.c:25

(gdb) frame 1
#1  0x0000555555555210 in main () at list.c:25
25          printf("%d\n", list_sum(a));

(gdb) print a
$1 = (Node *) 0x5555555592a0

(gdb) print *a
$2 = {value = 1, next = 0x35c1a2b2b2b2b2b2}
```

到这里结论已经很清楚了：`a` 是合法指针，`a->value` 是对的，**`a->next` 是垃圾**。也就是说 `malloc` 之后没有初始化 `next`，循环顺着垃圾指针走进了未映射的内存。

!!! tip "为什么这个 bug 有时不崩"

    `malloc` 拿到的内存如果是内核刚映射的新页，内容是全零，`next` 恰好是 `NULL`，循环正常结束，程序打印出 `1`。只有在这块内存被复用过、残留了垃圾值时才会崩。

    「昨天还好好的」的 bug，九成属于这一类——**未定义行为的表现取决于环境**。所以修 bug 时要问的不是「怎么让它不崩」，而是「这里为什么会被读取」。

修法只有一行：

```c
a->value = 1;
a->next = NULL;     // 必须显式初始化
```

## 断点比你想的更强

### 条件断点

循环里第 500 次迭代才出问题的时候，别按 500 次 `n`：

```text
(gdb) break list.c:12 if head->value > 100
(gdb) break list_sum if head == 0
```

### 临时断点与正则断点

```text
(gdb) tbreak list.c:12     # 命中一次后自动删除
(gdb) rbreak list_.*       # 给所有匹配正则的函数下断点
```

### 观察点：只在「被改」时停下

```text
(gdb) watch a->next                    # 写 a->next 时中断
(gdb) watch -l a->next                 # -l 只监视这个地址，不受作用域影响
(gdb) rwatch x                         # 读 x 时中断
```

观察点靠硬件断点实现，数量有限（通常 4 个），而且监视大范围内存时很慢——但定位「这个变量到底被谁改了」时无可替代。

### 让断点自己干活

调试多线程或高频循环时，手动回车太慢：

```text
(gdb) break list.c:12
(gdb) commands
> silent
> printf "head=%p value=%d\n", head, head->value
> continue
> end
```

之后每次命中只打印一行，不进入交互。

## 看内存：`x` 命令

`print` 按类型解释内存，`x` 按格式直接看字节：

```text
(gdb) x/4gx a          # 从 a 开始，4 个 8 字节，十六进制
0x5555555592a0: 0x0000000000000001      0x35c1a2b2b2b2b2b2
0x5555555592b0: 0x0000000000000000      0x0000000000000000
```

格式串是 `数量 + 格式 + 单位`：

| 单位 | 含义 | 格式 | 含义 |
| --- | --- | --- | --- |
| `b` | 1 字节 | `x` | 十六进制 |
| `h` | 2 字节 | `d` | 十进制 |
| `w` | 4 字节 | `s` | 字符串 |
| `g` | 8 字节 | `i` | 指令 |

`x/10i $pc` 可以看接下来要执行的十条汇编，配合 `layout asm` 读编译器优化非常有用。

## core dump：事后验尸

程序已经崩了、进程也没了的时候，靠 core 文件恢复现场：

```bash
ulimit -c unlimited                     # 允许生成 core（只对当前 shell 有效）
cat /proc/sys/kernel/core_pattern       # core 文件写到哪里
gdb ./demo core                         # 用可执行文件 + core 恢复现场
```

进去之后 `bt`、`frame`、`print` 的用法一模一样。容器里默认不生成 core，需要挂载 `--ulimit core=-1` 或者改 `core_pattern`。

macOS 上 core 文件默认写到 `/cores`，而且需要先 `sudo sysctl kern.corefile=...`，比较麻烦——在 Linux 上练这一节更省事。

## 让 gdb 好用一点

`~/.gdbinit`：

```text
set pagination off              # 不要每屏停一下
set print pretty on             # 结构体多行展开
set print elements 0            # 打印数组不截断
set disassembly-flavor intel    # 看汇编时用 Intel 语法
set history save on             # 保存命令历史
```

再配一个 `layout`：

```text
(gdb) layout src      # 上面源码，下面命令
(gdb) layout asm      # 看汇编
(gdb) tui disable     # 退出 TUI
```

## 优化过的程序怎么调

发布版本带 `-O2` 时，`print` 经常告诉你 `optimized out`。可用的手段：

- 编译时加 `-Og -g3`，保留更多调试信息
- 用 `info registers` 直接看寄存器，变量可能就在里面
- 用 `disassemble /m list_sum` 把源码和汇编混排，看编译器到底把哪一行变成了什么
- 真需要精确观察时，把可疑的变量声明成 `volatile` 临时禁用优化（记得改回来）

## 如果你在 macOS 上

macOS 没有 gdb（Apple 用 lldb 替代）。命令对照：

| gdb | lldb |
| --- | --- |
| `run` | `run` |
| `bt` | `bt` |
| `frame 1` | `frame select 1` |
| `print x` | `frame variable x` 或 `p x` |
| `break file.c:12` | `breakpoint set -f file.c -l 12` |
| `watch x` | `watchpoint set variable x` |
| `x/4gx a` | `memory read -f x -s 8 -c 4 a` |
| `info locals` | `frame variable` |

具体语义有差异，但调试思路完全一样：**先看栈，再看帧，再看值，最后回头看这个值是谁写的**。

## 收尾

gdb 的常用命令一只手数得过来，真正的门槛是「知道该问什么问题」：

1. 崩在哪一行、哪个地址？
2. 这个地址是从哪一层传进来的？
3. 它是谁的字段、在哪分配、什么时候被写的？

把这三个问题对应到 `bt`、`frame`、`p` / `watch` 上，大部分段错误十分钟内能定位。剩下的时间应该花在「为什么这里会漏掉初始化」上，而不是继续加 `printf`。
