---
title: 变量不是盒子：Python 的对象模型
description: is、可变默认参数、浅拷贝——这些坑全都从「名字绑定对象」这一条推出来
---

学过 C 的人第一次写 Python，很容易带进来一个错误直觉：**变量是一个装值的盒子**。`a = 1` 就是往盒子里放个 1，`b = a` 就是把 1 复制到另一个盒子里。

Python 不是这样。变量只是**名字**，名字绑定到对象上；赋值不复制对象，只是让名字改指向另一个对象。这一条想通了，`is`、默认参数、浅拷贝这些坑就都不用背了。

## 赋值只改绑定

```python title="bind.py"
a = [1, 2, 3]
b = a            # b 和 a 绑定到同一个 list
b.append(4)

print(a)         # [1, 2, 3, 4]
print(a is b)    # True
```

`b = a` 没有复制列表，只是给同一个对象多起了一个名字。所以通过 `b` 修改，`a` 看得见。

但如果给 `b` **重新赋值**，改的是名字的指向，不是对象：

```python
a = [1, 2, 3]
b = a
b = [9]          # b 改指向新列表
print(a)         # [1, 2, 3]
print(a is b)    # False
```

!!! note "和 C 的对照"

    `b = a` 更像 C 里的指针赋值 `b = a`，而不是 `memcpy`。区别是 Python 没有「解引用」这一步，名字用起来就像对象本身。

## 可变与不可变

对象分两类：

| 类型 | 可变？ | 例子 |
| --- | --- | --- |
| `int` / `float` / `str` / `tuple` / `frozenset` | 不可变 | `(1, 2)`、`"abc"` |
| `list` / `dict` / `set` / 自定义类实例 | 可变 | `[1, 2]`、`{"a": 1}` |

差别在「原地修改」这件事上最明显：

```python
x = 1
y = x
x += 1
print(x, y)          # 2 1        ← int 不可变，x += 1 其实是新建了 2

a = [1]
b = a
a += [2]             # list 的 += 是 extend，原地改
print(a, b)          # [1, 2] [1, 2]
```

同样是 `+=`，对 `int` 是「新建对象再绑定」，对 `list` 是「改这个对象」。这就是为什么 `a += [2]` 和 `a = a + [2]` 在列表上效果不同：

```python
a = [1]
b = a
a = a + [2]          # 新建列表，a 改指向它
print(a, b)          # [1, 2] [1]
```

## `is` 和 `==` 不是一回事

- `==` 比较**值**（调用 `__eq__`）
- `is` 比较**身份**，即是不是同一个对象（比较 `id()`）

```python
a = [1, 2]
b = [1, 2]
print(a == b)   # True
print(a is b)   # False
```

`is` 的正确用途只有一个：和**单例**比较，比如 `x is None`、`flag is True`。

!!! warning "不要依赖小整数缓存"

    CPython 会缓存 -5 到 256 的整数，也常驻留短字符串，所以下面这段在 CPython 上可能打印 `True`：

    ```python
    print(int("256") is int("256"))   # True —— 小整数是单例
    print(int("257") is int("257"))   # False —— 每次新建
    ```

    这是实现细节，换个解释器、换个版本就可能变。**判断相等永远用 `==`。**

## 默认参数只在定义时求值一次

这是新手最常踩的一个坑：

```python title="default_arg.py"
def add(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add(1))   # [1]
print(add(2))   # [1, 2]   ← 不是 [2]
print(add(3))   # [1, 2, 3]
```

`def` 执行时，`[]` 被求值一次，之后每次调用都复用这同一个列表。`bucket` 不是「每次调用新建一个空列表」，而是「默认绑定到定义时创建的那个列表」。

正确写法是用 `None` 占位：

```python
def add(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

!!! tip "同样的坑还有哪些"

    - `def f(x, cache={})`：字典共享
    - `def f(x, now=datetime.now())`：时间被冻结在定义那一刻
    - 类的可变类属性：`class A: items = []`，所有实例共享

## 函数传参：传的是对象的引用

```python
def modify(lst):
    lst.append(99)     # 改对象，外部看得见

def rebind(lst):
    lst = [0]          # 只改局部名字，外部看不见

a = [1]
modify(a)
print(a)               # [1, 99]

b = [1]
rebind(b)
print(b)               # [1]
```

Python 的传参方式常被叫作 **call by object reference**：函数拿到的是对象的引用，但形参是新的名字。改对象能传出去，重新绑定名字传不出去。

## 浅拷贝与深拷贝

切片、`list()`、`copy.copy()` 都是**浅拷贝**：只复制最外层容器，里面的元素还是共享的。

```python
import copy

a = [[1, 2], [3, 4]]
b = a[:]                 # 浅拷贝
c = copy.deepcopy(a)     # 深拷贝

a[0].append(99)
print(b)                 # [[1, 2, 99], [3, 4]]
print(c)                 # [[1, 2], [3, 4]]
```

`b` 的外层是新列表，但 `b[0]` 和 `a[0]` 是同一个内层列表；`c` 连内层也复制了，所以不受影响。

## 一张表收尾

| 写法 | 发生了什么 |
| --- | --- |
| `b = a` | 名字绑定同一个对象 |
| `b = a[:]` / `list(a)` / `copy.copy(a)` | 浅拷贝（外层新，内层共享） |
| `copy.deepcopy(a)` | 递归复制，完全独立 |
| `a += [x]`（list） | 原地修改 |
| `a = a + [x]` | 新建列表，`a` 改指向它 |
| `x is y` | 是不是同一个对象（只用来判断 `None` / `True` / `False`） |

记一句话就够了：**Python 里变量是名字，不是盒子。** 遇到「为什么改了一个，另一个也变了」，先问「这两个名字指向的是不是同一个对象」。
