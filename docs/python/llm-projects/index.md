---
title: LLM 项目
description: 几个值得读、值得跑、值得改的 Python 项目
hide:
  - toc
---

看别人的项目是最快的学法，但**读什么、怎么读**有讲究：先跑通最小可用的版本，再顺着一条调用链往下读，最后改一处看效果。

这个部分按「从玩具到生产」的顺序整理。

<div class="panel" markdown>

<p class="panel__title">🧪 项目清单</p>

- [nanoGPT](https://github.com/karpathy/nanoGPT) <span>几百行训练 GPT-2，最好的起点，先跑通再逐行读</span>
- [minGPT](https://github.com/karpathy/minGPT) <span>比 nanoGPT 更偏教学，模型结构写得很清楚</span>
- [llm.c](https://github.com/karpathy/llm.c) <span>纯 C/CUDA 训练 GPT-2，用来理解「PyTorch 帮你做了什么」</span>
- [litgpt](https://github.com/Lightning-AI/litgpt) <span>工程化程度高，适合看训练和微调的完整流程</span>
- [vLLM](https://github.com/vllm-project/vllm) <span>推理侧的事实标准，PagedAttention 和调度器值得读</span>
- [SGLang](https://github.com/sgl-project/sglang) <span>另一个推理框架，看它和 vLLM 的设计差异</span>

</div>

## 读项目的顺序

1. **跑通**：按 README 跑一遍推理，记下每个参数
2. **画调用链**：从 `main()` 到模型 forward，把经过的模块画出来
3. **改一处**：换激活函数、改学习率策略、加一个 metric——改完能解释结果
4. **读实现**：只读你画过的那条链，其余跳过

## 计划中

- 从零写一个 BPE tokenizer（不依赖 `tokenizers`）
- 复现 nanoGPT 的最小训练脚本，并在小语料上跑通
- 用 LoRA 微调一个小模型，对比全参微调的显存和效果
- 给一个模型接入评测：从数据集到指标
