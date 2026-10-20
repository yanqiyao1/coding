---
date: 2026-10-08
title: 一个够用的 CMake 模板
slug: cmake-that-works
authors: [qiyao]
categories: [工具链]
description: 从 g++ 一把梭到 target-based 的 CMake：一份能直接用、带 sanitizer 和 CTest 的最小模板。
---

课程实验和个人项目通常这样开始：

```bash
g++ -std=c++17 -O2 main.cpp -o main
```

三个文件以内这没问题。等到出现第四个 `.cpp`，你就会开始手工维护文件列表、`-I` 路径和链接库；再往后是「在我机器上能编，在 CI 上不行」。

CMake 解决的问题不是「生成 Makefile」，而是**把依赖关系写成声明**：谁需要哪个头文件目录、哪个库、哪个编译选项。下面这份模板是我现在开新项目直接复制的版本。

<!-- more -->

## 目录结构

```text
project/
├── CMakeLists.txt
├── CMakePresets.json
├── include/
│   └── demo/
│       └── math.h
├── src/
│   ├── math.c
│   └── main.c
└── tests/
    └── test_math.c
```

两个约定值得坚持：

- `include/` 下的头文件用**带项目前缀的路径**引用（`#include "demo/math.h"`），避免和系统头文件撞名
- 测试放在 `tests/`，和产品代码分开；`BUILD_TESTING=OFF` 时整套测试不参与构建

## CMakeLists.txt

```cmake title="CMakeLists.txt"
cmake_minimum_required(VERSION 3.20)
project(demo VERSION 0.1.0 LANGUAGES C)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)          # 关掉 -std=gnu17，用严格的 -std=c17
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # 生成 compile_commands.json，给 clangd 用

# ---- 构建选项 -------------------------------------------------------------
option(DEMO_SANITIZE "Build with AddressSanitizer / UBSan" OFF)
option(DEMO_WERROR   "Treat warnings as errors"            OFF)

if(DEMO_SANITIZE)
  add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
  add_link_options(-fsanitize=address,undefined)
endif()

# ---- 库 -------------------------------------------------------------------
add_library(demo_lib src/math.c)
target_include_directories(demo_lib PUBLIC include)          # (1)
target_compile_options(demo_lib PRIVATE -Wall -Wextra -Wpedantic)
if(DEMO_WERROR)
  target_compile_options(demo_lib PRIVATE -Werror)
endif()

# ---- 可执行文件 -----------------------------------------------------------
add_executable(demo src/main.c)
target_link_libraries(demo PRIVATE demo_lib)                 # (2)

# ---- 测试 -----------------------------------------------------------------
include(CTest)          # 定义 BUILD_TESTING 选项，并调用 enable_testing()
if(BUILD_TESTING)
  add_executable(test_math tests/test_math.c)
  target_link_libraries(test_math PRIVATE demo_lib)
  add_test(NAME math COMMAND test_math)
endif()
```

1. `PUBLIC` 的意思是「我自己要这个路径，链接我的人也要」。所以 `demo` 不需要再写一次 `target_include_directories`。
2. 用 target 名而不是路径。CMake 会自动带上它的头文件目录、编译定义和传递依赖。

`src/math.c` 和 `include/demo/math.h` 就很普通：

```c title="include/demo/math.h"
#ifndef DEMO_MATH_H
#define DEMO_MATH_H

int demo_add(int a, int b);
int demo_fib(int n);

#endif /* DEMO_MATH_H */
```

```c title="src/math.c"
#include "demo/math.h"

int demo_add(int a, int b) {
    return a + b;
}

int demo_fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int t = a + b;
        a = b;
        b = t;
    }
    return a;
}
```

## CMakePresets.json：把「怎么配置」也写进仓库

命令行里那串 `-DCMAKE_BUILD_TYPE=... -D...` 会越攒越长，而且每个人敲的都不一样。用 preset 把它固定下来：

```json title="CMakePresets.json"
{
  "version": 6,
  "configurePresets": [
    {
      "name": "debug",
      "displayName": "Debug",
      "binaryDir": "${sourceDir}/build/debug",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "CMAKE_EXPORT_COMPILE_COMMANDS": "ON"
      }
    },
    {
      "name": "release",
      "displayName": "Release",
      "binaryDir": "${sourceDir}/build/release",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" }
    },
    {
      "name": "sanitize",
      "displayName": "Debug + ASan/UBSan",
      "binaryDir": "${sourceDir}/build/sanitize",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "Debug",
        "DEMO_SANITIZE": "ON"
      }
    }
  ],
  "buildPresets": [
    { "name": "debug", "configurePreset": "debug" },
    { "name": "release", "configurePreset": "release" },
    { "name": "sanitize", "configurePreset": "sanitize" }
  ],
  "testPresets": [
    {
      "name": "debug",
      "configurePreset": "debug",
      "output": { "outputOnFailure": true }
    }
  ]
}
```

日常就三条命令：

```bash
cmake --preset debug          # 配置到 build/debug
cmake --build --preset debug  # 构建
ctest --preset debug          # 跑测试
```

要跑 sanitizer 版本，把 `debug` 换成 `sanitize` 就行，构建目录是分开的，不会互相污染。

!!! tip "为什么要分目录"

    `CMAKE_BUILD_TYPE` 是**配置期**变量，同一个构建目录里切换它不会重新编译已有的目标文件——这是个经典的「为什么我的 Release 版本还带调试信息」的原因。一个配置一个目录最省心。

## 验证一下

```text
$ cmake --preset debug
-- Configuring done (0.3s)
-- Generating done (0.0s)
-- Build files have been written to: /tmp/cmake-demo/build/debug

$ cmake --build --preset debug
[ 83%] Building C object CMakeFiles/test_math.dir/tests/test_math.c.o
[100%] Linking C executable test_math
[100%] Built target test_math

$ ctest --preset debug
1/1 Test #1: math .............................   Passed    0.63 sec
100% tests passed, 0 tests failed out of 1
```

`test_math.c` 用 `assert` 写断言就够，不需要引入测试框架：

```c title="tests/test_math.c"
#include <assert.h>
#include "demo/math.h"

int main(void) {
    assert(demo_add(1, 2) == 3);
    assert(demo_fib(10) == 55);
    return 0;
}
```

!!! note "Release 构建会关掉 assert"

    `assert` 受 `NDEBUG` 控制。用 `assert` 写的测试必须在 Debug 下跑；或者干脆别用 `assert`，用显式的 `if (...) return 1;`。这是个很容易踩的坑：CI 上跑的是 Release，测试永远通过。

## 常见坑

**在源码目录里构建。** `cmake .` 会把 `CMakeCache.txt`、`CMakeFiles/` 撒得到处都是，而且以后再想改构建目录就得先删干净。永远用 `-B build`（或者 preset 里的 `binaryDir`）。

**用 `file(GLOB ...)` 收集源文件。** 新增文件后 CMake 不会自动重新配置，你会对着「链接错误：找不到符号」发呆。显式列出文件，多写几行换来可预测的构建。

**覆盖 `CMAKE_C_FLAGS`。** 这个变量是全局的，覆盖它会把工具链默认的选项一起冲掉。用 `target_compile_options(<target> PRIVATE ...)`。

**把 `PUBLIC` 当默认值。** `PRIVATE` 是更安全的默认选择：只有确实需要传递出去的东西（头文件路径、公共宏）才用 `PUBLIC` / `INTERFACE`。

**混用 `include_directories()` 和 `target_include_directories()`。** 前者是目录级的、全局的；后者跟着 target 走。新项目不应该再出现前者。

## 什么时候不该用 CMake

一个文件、一次编译、跑完就扔的脚本，直接 `cc file.c -o file` 更快。CMake 的成本在于多一层配置——它的收益要等到「多平台、多 target、有依赖、要打包」的时候才显现出来。

我的判断标准是：**如果需要写第二个 `-I` 或者第二个 `.c`，就上 CMake**。因为那意味着你已经有了「项目」而不只是「一个文件」。

下一篇打算写[缓存友好的循环重排](../posts/2026-10-02-cache-friendly-loops.md)：CMake 管的是怎么把代码编出来，那片文章管的是编出来的代码在内存里怎么跑。
