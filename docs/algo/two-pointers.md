---
date: 2026-10-21
tags: [算法, 双指针, LeetCode]
title: 双指针：从有序数组到盛水容器
description: 对撞、快慢、三数之和——把「为什么可以这样移」讲清楚
---

「双指针」不是一个算法，而是三种套路的统称：

| 类型 | 指针怎么动 | 典型题 |
| --- | --- | --- |
| 对撞指针 | 一头一尾，向中间靠 | 两数之和 II、盛水容器、三数之和 |
| 快慢指针 | 同向，速度不同 | 环形链表、删除倒数第 N 个 |
| 滑动窗口 | 同向，维护一个区间 | 最长无重复子串、最小覆盖子串 |

前两种在这篇，滑动窗口单独一篇——它的难点在「窗口什么时候收缩」，是另一套思路。

## 对撞指针：靠单调性剪枝

核心问题：为什么可以安全地移动某一侧，而不漏掉答案？

### 两数之和 II（LC 167）

数组**升序**，找两个数之和等于 `target`：

```cpp
std::vector<int> twoSum(const std::vector<int>& a, int target) {
    int l = 0, r = static_cast<int>(a.size()) - 1;
    while (l < r) {
        int sum = a[l] + a[r];
        if (sum == target) return {l + 1, r + 1};   // 题目要 1-based
        if (sum < target) ++l;                     // 太小，左指针右移
        else --r;                                  // 太大，右指针左移
    }
    return {};
}
```

**为什么对**：固定 `r` 时，`a[l]` 是当前能取到的最小值。如果 `a[l] + a[r] < target`，那么 `a[l]` 和任何 `r' ≤ r` 的组合都更小，`a[l]` 可以直接排除——所以 `++l` 不会漏解。右边同理。

这就是双指针的本质：**每一步都排除掉一整批不可能的解**。

### 盛水容器（LC 11）

`height[i]` 是隔板高度，选两块板，装水量是 `min(h[l], h[r]) * (r - l)`。

```cpp
int maxArea(const std::vector<int>& h) {
    int l = 0, r = static_cast<int>(h.size()) - 1, best = 0;
    while (l < r) {
        best = std::max(best, std::min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) ++l;
        else --r;
    }
    return best;
}
```

跑一下 `[1,8,6,2,5,4,8,3,7]`：

```text
maxArea: 49
```

**为什么移动短的那一侧**：当前面积由较短的板决定。如果移动长板，宽度一定变小，而高度上限不变（还是那块短板），面积只会更小。所以移动长板不可能得到更优解，只能移动短板。

### 三数之和（LC 15）

排序后固定一个数，剩下两个数用对撞指针找：

```cpp
std::vector<std::vector<int>> threeSum(std::vector<int> a) {
    std::sort(a.begin(), a.end());
    std::vector<std::vector<int>> res;
    int n = static_cast<int>(a.size());

    for (int i = 0; i < n - 2; ++i) {
        if (i > 0 && a[i] == a[i - 1]) continue;      // 跳过重复的 i
        int l = i + 1, r = n - 1;
        while (l < r) {
            int sum = a[i] + a[l] + a[r];
            if (sum < 0) ++l;
            else if (sum > 0) --r;
            else {
                res.push_back({a[i], a[l], a[r]});
                while (l < r && a[l] == a[l + 1]) ++l;   // 跳过重复的 l
                while (l < r && a[r] == a[r - 1]) --r;   // 跳过重复的 r
                ++l;
                --r;
            }
        }
    }
    return res;
}
```

```text
threeSum: [-1,-1,2] [-1,0,1]
```

去重是这道题真正的考点：三处都要跳过（`i`、`l`、`r`），漏一处就会出重复解。

## 快慢指针：用速度差找结构

### 环形链表（LC 141）

快指针每次走两步，慢指针走一步。如果有环，快的会在环里追上慢的：

```cpp
bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}
```

```text
hasCycle: 1
hasCycle(acyclic): 0
```

为什么一定会相遇：进入环后，每走一轮快指针就比慢指针多靠近一步，距离不断缩小，最终必然相等。

> LC 142 要在相遇后把其中一个指针放回头部，再同速前进，相遇点就是环入口——推导用「慢指针走了 a+b，快指针走了 a+b+k·L」，值得自己推一遍。

### 删除有序数组的重复项（LC 26）

慢指针指向「已去重部分的末尾」，快指针负责扫描：

```cpp
int removeDuplicates(std::vector<int>& a) {
    if (a.empty()) return 0;
    int k = 1;                                    // [0, k) 是去重后的结果
    for (int i = 1; i < static_cast<int>(a.size()); ++i) {
        if (a[i] != a[k - 1]) a[k++] = a[i];
    }
    return k;
}
```

```text
removeDuplicates k=2 first: 1 2
```

快慢指针在这类「原地修改数组」的题里特别常见：一个读、一个写，写指针永远不超过读指针。

## 什么时候不能用

- **数组无序，且题目要求找所有组合**：对撞指针依赖有序性，先排序（O(n log n)）或者换哈希
- **需要保留原始下标**：排序会打乱下标，要么存 `(value, index)`，要么换方法
- **有负数，但要求滑动窗口的单调性**：窗口和不再单调，双指针失效（比如「和 ≥ target 的最短子数组」在有负数时）

## 复杂度

| 题型 | 时间 | 额外空间 |
| --- | --- | --- |
| 两数之和 II | O(n) | O(1) |
| 盛水容器 | O(n) | O(1) |
| 三数之和 | O(n²) | O(1)（不含排序） |
| 环形链表 | O(n) | O(1) |
| 删除重复项 | O(n) | O(1) |

## 练习清单

按顺序做，每道都先想「为什么可以移动」再写代码：

1. [167. 两数之和 II](https://leetcode.cn/problems/two-sum-ii-input-array-is-sorted/)
2. [11. 盛水容器](https://leetcode.cn/problems/container-with-most-water/)
3. [15. 三数之和](https://leetcode.cn/problems/3sum/)
4. [26. 删除有序数组中的重复项](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/)
5. [141. 环形链表](https://leetcode.cn/problems/linked-list-cycle/)
6. [142. 环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/)
7. [19. 删除链表的倒数第 N 个结点](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/)
8. [75. 颜色分类](https://leetcode.cn/problems/sort-colors/)（三指针）
