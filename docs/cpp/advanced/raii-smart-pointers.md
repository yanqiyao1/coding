---
title: RAII 与智能指针：谁负责 delete
description: 从 lock_guard 到 weak_ptr，把「资源释放」交给对象的析构函数
---

C++ 里最容易出错的地方不是算法，是**资源管理**：文件、锁、内存、socket，拿到了就必须还，而函数可能从任意一条路径提前返回、抛异常。

手动 `delete` 的问题是：你得在每一条路径上都记得写。RAII 的思路是把它变成「对象析构时自动执行」，于是不管怎么退出，都有人负责。

## 手动管理的问题

```cpp
void bad() {
    FILE* f = std::fopen("data.txt", "r");
    if (!f) return;

    if (!check(f)) {
        return;              // ← 忘了 fclose，泄漏
    }

    std::vector<int> v = parse(f);
    if (v.empty()) {
        std::fclose(f);
        return;
    }

    std::fclose(f);          // 每条路径都要写一遍
}
```

三条返回路径，只有两条关了文件。真实代码里路径更多，还要考虑异常——`fclose` 根本不会被执行。

## RAII：构造时获取，析构时释放

```cpp title="raii.cpp"
#include <cstdio>
#include <stdexcept>
#include <string>

class File {
public:
    explicit File(const char* path) : f_(std::fopen(path, "w")) {
        if (!f_) throw std::runtime_error("open failed");
    }

    ~File() {
        if (f_) std::fclose(f_);
    }

    File(const File&) = delete;              // 不允许拷贝
    File& operator=(const File&) = delete;

    void write(const std::string& s) { std::fputs(s.c_str(), f_); }

private:
    std::FILE* f_;
};
```

用起来：

```cpp
{
    File f("/tmp/out.txt");
    f.write("hello\n");
    std::cout << "in scope\n";
}
std::cout << "after scope\n";
```

输出：

```text
in scope
File closed
after scope
```

不管是正常离开作用域、`return`，还是抛异常，`~File()` 都会被调用。**所有权跟着对象走，释放跟着析构走**——这就是 RAII 的全部。

!!! note "两个特殊成员函数"

    资源类通常要禁用拷贝（`= delete`），否则两个对象析构时会对同一个指针 `free` 两次。如果确实需要复制语义，就得写引用计数——那就是 `shared_ptr` 干的事。

## 标准库里的 RAII

| 资源 | RAII 包装 |
| --- | --- |
| 堆内存 | `std::unique_ptr` / `std::shared_ptr` |
| 互斥锁 | `std::lock_guard` / `std::unique_lock` |
| 文件 | `std::ifstream` / `std::ofstream` |
| 动态数组 | `std::vector` |
| 线程 | `std::jthread`（C++20，析构时 join） |

```cpp
std::mutex m;

void f() {
    std::lock_guard<std::mutex> lock(m);   // 构造加锁
    do_something();                        // 这里抛异常也没关系
}                                          // 析构解锁
```

`lock_guard` 只有构造和析构，没有 `unlock()`——想提前解锁就用 `unique_lock`。这种「把接口收窄到只够用」的设计，本身就是防错的一部分。

## unique_ptr：独占所有权

```cpp
auto p = std::make_unique<int>(42);
std::cout << *p << '\n';          // 42

auto q = std::move(p);            // 所有权转移
std::cout << (p ? "non-null" : "null") << '\n';   // null
```

`unique_ptr` 不能拷贝，只能移动。这从类型系统上保证了「同一时刻只有一个所有者」，析构时一定会释放。

几个常用操作：

```cpp
p.get();          // 裸指针，不转移所有权
p.release();      // 放弃所有权，返回裸指针（要自己 delete）
p.reset();        // 释放当前对象
p.reset(new T);   // 换一个对象
```

自定义 deleter 可以管住任何资源，比如 `FILE*`：

```cpp
struct FileCloser {
    void operator()(std::FILE* f) const { if (f) std::fclose(f); }
};

std::unique_ptr<std::FILE, FileCloser> f(std::fopen("data.txt", "r"));
```

!!! tip "传参时别传 unique_ptr"

    ```cpp
    void use(const Widget& w);      // 好：不关心所有权
    void take(std::unique_ptr<Widget> w);   // 只有真的要接管时才这么写
    ```

    参数写成 `unique_ptr` 等于要求调用方转移所有权，大多数时候并不是你的意思。

## shared_ptr：共享所有权

多个对象需要共享同一个资源时，用 `shared_ptr`：内部有一个引用计数，最后一个 `shared_ptr` 析构时才释放对象。

```cpp
auto a = std::make_shared<Node>("a");
auto b = std::make_shared<Node>("b");
a->next = b;
b->prev = a;

std::cout << a.use_count() << ' ' << b.use_count() << '\n';
```

但这里有个经典陷阱：**循环引用**。

```cpp title="cycle.cpp"
struct Bad {
    std::string name;
    std::shared_ptr<Bad> next;
    std::shared_ptr<Bad> prev;      // ← 问题在这里
    ~Bad() { std::cout << "destroy " << name << '\n'; }
};
```

```text
a count 2, b count 2
leaving main
```

`main` 结束了，两个 `destroy` 都没打印。因为 `a` 和 `b` 互相持有对方的 `shared_ptr`，引用计数各是 2，谁都降不到 0，对象永远不会被释放——**内存泄漏**。

## weak_ptr：只观察，不拥有

把其中一个方向换成 `weak_ptr`：

```cpp
struct Node {
    std::string name;
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;       // 不增加引用计数
    explicit Node(std::string n) : name(std::move(n)) {}
    ~Node() { std::cout << "destroy " << name << '\n'; }
};
```

```text
a count 1, b count 2
destroy a
destroy b
```

`b->prev` 指向 `a` 但不增加 `a` 的计数，所以 `a` 能正常析构；`a` 析构时释放了 `a->next`，`b` 的计数降到 0，`b` 也跟着析构。

`weak_ptr` 不能直接解引用，要用 `lock()` 提升成 `shared_ptr`：

```cpp
if (auto sp = node->prev.lock()) {
    sp->do_something();     // 期间对象保证存活
} else {
    // 对象已经没了
}
```

!!! warning "shared_ptr 的线程安全"

    `shared_ptr` 的**引用计数**是原子的，多线程拷贝/析构同一个 `shared_ptr` 是安全的；但它**指向的对象**不是——两个线程同时改 `*sp` 照样要加锁。

## 怎么选

| 场景 | 用什么 |
| --- | --- |
| 独占一个资源，出了作用域就释放 | `unique_ptr`（默认选它） |
| 多个对象共享，生命周期不确定 | `shared_ptr` |
| 只观察，不参与生命周期 | 裸指针或 `weak_ptr` |
| 数组 | `std::vector` / `std::array` |
| 锁 | `lock_guard` / `unique_lock` |
| 文件流 | `ifstream` / `ofstream` |

原则：**能用 `unique_ptr` 就不用 `shared_ptr`**。`shared_ptr` 有原子操作开销，而且所有权一分散，对象的生命周期就很难推理——循环引用只是其中一个后果。

## 三个常见的坑

**1. `new[]` 配 `delete`**

```cpp
int* p = new int[10];
delete p;      // 未定义行为，应该是 delete[]
```

用 `std::vector` 或 `std::make_unique<int[]>(10)` 就不会错。

**2. 用 `this` 构造 `shared_ptr`**

```cpp
class Widget : public std::enable_shared_from_this<Widget> {
public:
    std::shared_ptr<Widget> self() { return shared_from_this(); }
};
```

直接 `std::shared_ptr<Widget>(this)` 会创建**第二个**独立的计数控制块，最终 double free。

**3. 按值传 `shared_ptr`**

```cpp
void f(std::shared_ptr<T> p);       // 每次调用都 ++/-- 引用计数
void f(const std::shared_ptr<T>& p); // 只在需要共享所有权时才这样
```

参数不需要共享所有权时，传 `T&` 或 `T*` 就够了。

## 小结

RAII 不是某个库，是一种写法：**让资源的生命周期等于对象的生命周期**。智能指针只是这个思路在内存上的实现，`lock_guard`、`ifstream`、`vector` 都是同一个套路的产物。

写现代 C++ 时，先问「这个资源归谁」，再选 `unique_ptr` / `shared_ptr` / 值类型。真正需要手写 `new` 和 `delete` 的地方，已经非常少了。
