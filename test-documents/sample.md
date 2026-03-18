---
title: FlowMark Reader 测试文档
author: 测试作者
date: 2024-03-11
tags: [markdown, test, demo]
---

# FlowMark Reader 功能测试

这是一个用于测试 **FlowMark Reader** 功能的示例 Markdown 文档。

## 基础格式测试

### 文本样式

- **粗体文本** - 使用双星号
- *斜体文本* - 使用单星号
- ~~删除线~~ - 使用波浪线
- `行内代码` - 使用反引号

### 列表演示

有序列表：
1. 第一项
2. 第二项
3. 第三项

无序列表：
- 项目 A
- 项目 B
- 项目 C
  - 子项目 C1
  - 子项目 C2

任务列表：
- [x] 已完成任务
- [ ] 待办任务

## 代码块测试

### JavaScript 代码

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Welcome to FlowMark Reader`;
}

greet('User');
```

### Python 代码

```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# 测试函数
for i in range(10):
    print(f"F({i}) = {calculate_fibonacci(i)}")
```

## 表格测试

| 功能 | 状态 | 优先级 |
|------|------|--------|
| 文件导入 | 已完成 | P0 |
| 代码高亮 | 已完成 | P0 |
| 主题切换 | 已完成 | P1 |
| 导出功能 | 开发中 | P2 |

## 引用块测试

> 阅读应当如流水般顺畅
> — FlowMark Reader 核心理念

嵌套引用：
> 第一层引用
>> 第二层引用
>>> 第三层引用

## 数学公式

行内公式：$E = mc^2$

块级公式：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## 链接和图片

[FlowMark Reader GitHub](https://github.com)

---

**文档结束** - 感谢测试 FlowMark Reader！