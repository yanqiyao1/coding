---
title: 强化学习方向
description: RLHF、RLVR、PPO、GRPO——用奖励把模型「会」变成「稳定地对」
hide:
  - toc
---

## 在解决什么问题

预训练给了模型「见过很多题」的能力，但**见过 ≠ 会做**。强化学习这一侧的岗位，核心是用奖励信号把模型的行为往「对」的方向推：

- 推理题能不能一步步推、最后答对
- 数学题能不能给出可验证的答案
- 代码能不能通过单测
- Agent 能不能多步调用工具、完成任务

和 SFT 的区别在于：SFT 是「模仿标准答案」，RL 是「自己采样、按结果好坏调整」。前者学的是过程，后者优化的是结果。

## 一条主线：从 SFT 到 RL

```text
SFT  （学会格式和基本能力）
 ↓
奖励  （RM 打分 / 规则验证：答案对错、单测通过）
 ↓
RL   （采样多条轨迹 → 按奖励更新策略）
 ↓
评测  （是不是真的变强了，还是只是变长了）
```

早期 RLHF 用人类偏好训练 Reward Model，再用 PPO 优化；现在数学、代码这类**答案可验证**的任务，直接用规则做奖励（RLVR），省掉了 RM，也更难被 hack。

## 概念地图

### 算法

| 术语 | 一句话 |
| --- | --- |
| **RLHF** | 人类排序偏好 → 训练 RM → 用 PPO 优化策略；InstructGPT 的三阶段 |
| **RLVR** | 奖励来自可验证的结果（答案对错、单测、格式），不需要 RM |
| **Online RL** | 训练过程中持续采样新轨迹（PPO / GRPO），数据分布随策略变化 |
| **Offline / 偏好优化** | 用固定偏好数据直接优化（DPO / IPO / KTO），不采样 |
| **PPO** | Actor-Critic + 重要性采样比率裁剪 + KL 约束，稳定但吃显存 |
| **GRPO** | 去掉 Critic，用同一 prompt 的一组回答的均值/方差做 baseline |
| **DAPO / RLOO / REINFORCE++** | GRPO 的工程改良：解耦裁剪、token 级 loss、leave-one-out baseline |

### 奖励

| 术语 | 一句话 |
| --- | --- |
| **Reward Model (RM)** | 学出来的打分器，输入回答输出标量；训练目标是 Bradley-Terry |
| **Verifier** | 规则或模型判断答案对不对，适合数学、代码这类可验证任务 |
| **ORM** | Outcome Reward Model，只看最终结果 |
| **PRM** | Process Reward Model，给每一步打分，用于搜索和过程监督 |
| **Reward Hacking** | 模型找到奖励的漏洞：变长、堆格式、讨好评审 |

### 能力方向

| 方向 | 关键点 |
| --- | --- |
| **Reasoning** | 长链思考、自我检查、反思；奖励稀疏，容易退化成「写得更长」 |
| **Math** | 答案可精确验证，RLVR 最成熟的场景；难点在题目难度分布 |
| **Code** | 单测作为奖励，天然可验证；难点在测试覆盖和 flaky test |
| **Agent** | 多步决策、稀疏奖励、credit assignment（哪一步做对了） |

### 提升手段

| 术语 | 一句话 |
| --- | --- |
| **Self-play** | 模型自己出题、自己解，用验证器筛，形成难度课程 |
| **Self-improvement** | 拒绝采样 + 微调（STaR / ReST），用模型自己的好样本训练自己 |
| **Test-Time Scaling** | 推理时多花算力：best-of-N、多数投票、verifier 重排、MCTS |
| **探索** | temperature、熵正则、课程学习；探索不足会早熟收敛 |

## 学习路径

**第 1 步：RL 基础（必须能手推）**

- MDP、策略、回报、值函数
- 策略梯度定理 → REINFORCE → baseline 为什么能降方差
- Actor-Critic、GAE
- PPO：重要性采样比率、clip、KL penalty

**第 2 步：RLHF 的完整流程**

- InstructGPT 的三阶段，每阶段的输入输出
- RM 怎么训练（pairwise 排序、Bradley-Terry）
- PPO 在 LLM 上的四个模型：actor、critic、reward、reference

**第 3 步：偏好优化**

- DPO 的推导：KL 正则下的最优策略有闭式解，代回去得到「隐式奖励」
- DPO / IPO / KTO / ORPO 各自改了什么
- 为什么 DPO 不需要 online 采样，代价是什么

**第 4 步：RLVR 与 GRPO**

- 可验证奖励怎么设计（答案抽取、单测、格式）
- GRPO 的组内 baseline、优势和 loss
- 工程问题：长度偏置、熵坍塌、梯度裁剪、rollout 吞吐

**第 5 步：前沿**

- PRM 与过程监督：怎么标注、怎么用（best-of-N、树搜索）
- Test-time scaling：算力花在训练还是推理
- Agent RL：多步、稀疏奖励、环境构建

## 面试常问

**Q：PPO 的 clip 解决什么问题？**

限制策略更新的幅度。比率 `π/π_old` 超出 `[1-ε, 1+ε]` 时梯度被截断，避免一次更新把策略带崩。它是「信任域」的近似实现。

**Q：GRPO 为什么可以去掉 Critic？**

同一个 prompt 采样一组回答，用组内奖励的均值和标准差做归一化，得到一个 baseline。省掉了与策略同规模的价值网络，显存和训练成本大幅下降。

**Q：DPO 和 PPO 是什么关系？**

DPO 在 KL 正则下求最优策略的闭式解，把「奖励」表示成策略与参考模型的对数比，于是可以直接用偏好数据做监督学习。它是**离线**方法，不做 online 探索；PPO 是 on-policy 的。

**Q：Reward hacking 怎么发现？**

看奖励涨但真实指标不涨；看输出长度、格式、重复率异常；看 RM 对分布外样本的打分。缓解手段：规则奖励、多奖励集成、长度惩罚、定期人工抽检。

**Q：RLVR 里要不要 KL 约束？**

看目标。加 KL 能防止策略跑离参考模型太远、保持语言能力；但太强会限制探索。很多工作只对部分 token 加，或者用较小的系数。

**Q：为什么 RL 之后回答会变长？**

两个原因：部分正确性让长答案更容易蒙对；以及长度本身可能被奖励模型偏好。需要长度归一化或显式的长度惩罚。

**Q：稀疏奖励下怎么做 credit assignment？**

过程奖励（PRM）、step-level 优势估计、把长轨迹切段、或者用结果奖励 + 更细的归一化（token-level loss）。

**Q：怎么判断提升是真的？**

换一个没参与训练的 benchmark、看 pass@1 而不是 pass@k、控制输出长度、检查训练集泄漏、跑多次看方差。

**Q：Self-play 和拒绝采样微调的区别？**

拒绝采样微调是「自己生成 → 筛选 → 监督学习」，只学对的；Self-play 还会自己出题，形成难度递增的课程，更接近 AlphaZero 的循环。

**Q：Test-time scaling 和 RL 的关系？**

两者都在提升推理能力，但一个花在推理时（采样、搜索、验证），一个花在训练时（更新参数）。实践中常常组合：RL 训一个策略，推理时再用 verifier 重排。

## 阅读清单

- **InstructGPT**（2022）：RLHF 三阶段的标准流程
- **DPO**（2023）：偏好优化的闭式解，必读推导
- **DeepSeekMath**（2024）：GRPO 的出处
- **Let's Verify Step by Step**（2023）：PRM 与过程监督
- **Tulu 3**（2024）：把 RLVR、DPO、PPO 放在一起的工程实践
- **DeepSeek-R1**（2025）：纯 RL 激发推理能力的公开案例
- **Scaling Test-Time Compute**（2024）：推理算力的 scaling law

## 相关

- [手撕代码 · Self-Attention](../../llm-coding/attention.md)：模型结构是理解一切的前提
- [后训练方向](../post-training/index.md)：RL 只是后训练的一部分
