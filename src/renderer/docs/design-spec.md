# FlowMark Reader - 流动墨韵设计规范

## 设计哲学

「流动墨韵」融合东方水墨美学与现代极简主义，打造沉浸式 Markdown 阅读体验。

- **水的流动感** - 呼应 "Flow" 概念，流体动画和渐变
- **墨迹的渲染** - 文本如墨汁在纸上晕开
- **留白艺术** - 大量负空间，让内容呼吸
- **昼夜自然过渡** - 主题如日出日落般平滑变化

---

## 色彩系统

### 浅色主题 - "宣纸白" (Rice Paper)
```
--ink-primary: #2C2C2C        // 松烟墨 - 主文字
--ink-secondary: #5C5C5C      // 淡墨 - 次要文字
--ink-tertiary: #9C9C9C       // 清墨 - 辅助文字

--paper-bg: #FAF8F3           // 宣纸白 - 主背景
--paper-surface: #F5F2EB      // 米纸 - 卡片/浮层
--paper-elevated: #FFFFFF     // 纯白 -  elevated

--accent-cinnabar: #C73E3A    // 朱砂 - 强调色
--accent-indigo: #2E5C8A      // 靛青 - 链接
--accent-bamboo: #5A7A5A      // 竹青 - 成功
```

### 深色主题 - "深夜蓝黑" (Midnight Ink)
```
--ink-primary: #E8E4DF        // 月光白 - 主文字
--ink-secondary: #B8B4AF      // 雾白 - 次要文字
--ink-tertiary: #787470       // 墨灰 - 辅助文字

--paper-bg: #0D1117           // 深夜蓝黑 - 主背景
--paper-surface: #161B22      // 墨蓝 - 卡片/浮层
--paper-elevated: #1C2128     // 浅墨蓝 - elevated

--accent-cinnabar: #E07A78    // 浅朱砂 - 强调色
--accent-indigo: #7AB8E8      // 天青 - 链接
--accent-bamboo: #8AB88A      // 嫩竹 - 成功
```

### 护眼主题 - "羊皮黄" (Parchment)
```
--ink-primary: #4A4035        // 松烟墨
--ink-secondary: #6A6055      // 淡墨
--ink-tertiary: #9A9085       // 清墨

--paper-bg: #F4ECD8           // 羊皮黄
--paper-surface: #EFE6D2      // 浅羊皮
--paper-elevated: #FFF8E8     // 象牙白

--accent-cinnabar: #B84A3E    // 朱砂
--accent-indigo: #4A6A8A      // 靛青
--accent-bamboo: #6A8A6A      // 竹青
```

---

## 字体规范

### 字体栈
```css
/* 标题字体 - 霞鹜文楷 */
--font-display: 'LXGW WenKai', 'STKaiti', 'KaiTi', serif;

/* 正文字体 - 得意黑 */
--font-body: 'Smiley Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;

/* 代码字体 */
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
```

### 字号系统
```
--text-xs: 0.75rem;     /* 12px - 辅助文字 */
--text-sm: 0.875rem;    /* 14px - 小标签 */
--text-base: 1rem;      /* 16px - 正文 */
--text-lg: 1.125rem;    /* 18px - 大正文 */
--text-xl: 1.25rem;     /* 20px - H4 */
--text-2xl: 1.5rem;     /* 24px - H3 */
--text-3xl: 1.875rem;   /* 30px - H2 */
--text-4xl: 2.25rem;    /* 36px - H1 */
```

### 行高
```
--leading-tight: 1.4;   /* 标题 */
--leading-normal: 1.8;  /* 正文 */
--leading-relaxed: 2;   /* 舒适阅读 */
```

---

## 间距系统

基于 4px 网格系统：
```
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### 内容区域
- 最大宽度：720px（黄金阅读宽度）
- 侧边距：移动端 24px，桌面端 48px
- 行宽限制：每行 25-35 个汉字最佳

---

## 动画规范

### 缓动函数
```
--ease-ink: cubic-bezier(0.4, 0, 0.2, 1);       /* 墨迹晕开 */
--ease-flow: cubic-bezier(0.25, 0.1, 0.25, 1);  /* 水流 */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* 弹跳 */
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);  /* 丝滑 */
```

### 时长
```
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-ink: 800ms;      /* 墨迹动画 */
```

### 关键动画

1. **墨迹渲染** - 页面加载时文字如墨迹晕开
```css
@keyframes ink-reveal {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}
```

2. **水波纹** - 按钮点击效果
```css
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

3. **呼吸浮动** - 悬浮效果
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

---

## 组件规范

### 按钮
- 圆角：8px（柔和）或 50px（胶囊）
- 主按钮：朱砂背景 + 白色文字
- 次按钮：透明背景 + 墨框
- 悬停：轻微上浮 + 阴影

### 卡片
- 圆角：16px
- 阴影：0 4px 20px rgba(0,0,0,0.08)
- 边框：1px solid rgba(0,0,0,0.05)

### 输入框
- 圆角：8px
- 聚焦：靛青色边框 + 微光晕
- 下划线风格备选

---

## 响应式断点

```
--breakpoint-sm: 640px;   /* 手机横屏 */
--breakpoint-md: 768px;   /* 平板竖屏 */
--breakpoint-lg: 1024px;  /* 平板横屏/小笔记本 */
--breakpoint-xl: 1280px;  /* 桌面 */
--breakpoint-2xl: 1536px; /* 大屏 */
```

---

## 特殊效果

### 1. 纸张纹理
```css
.paper-texture {
  background-image: url("data:image/svg+xml,..."); /* 噪点纹理 */
  background-blend-mode: multiply;
}
```

### 2. 墨水渐变
```css
.ink-gradient {
  background: linear-gradient(
    135deg,
    var(--paper-bg) 0%,
    var(--paper-surface) 50%,
    var(--paper-bg) 100%
  );
}
```

### 3. 毛玻璃效果
```css
.glass {
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.8);
}
```

---

## 图标规范

- 使用 Lucide React 或 Phosphor Icons
- 线框风格，1.5px 线宽
- 圆角端点

---

## 无障碍设计

- 对比度：正文至少 4.5:1，标题至少 3:1
- 焦点状态：清晰的聚焦环
- 减少动画：支持 prefers-reduced-motion
- 字体缩放：支持 200% 缩放
