# Co-creator - AI Coding Agent 指南

## 项目概述

**Co-creator** 是一款实时多语言协作写作工作台，面向多语言写作者的生产力工具。项目采用纯原生 HTML/CSS/JavaScript 开发，零构建工具、零框架依赖，遵循 KISS 原则（Keep It Simple, Stupid）。

**核心功能**:
- 多语言并发翻译（英/日/法/德/俄/阿/拉丁等 9 种语言）
- 20 位多元化 AI 助教（10男10女，老青少三代，不同文化背景）
- 双触发同步机制（段落完成立即触发 + 停止打字防抖触发）
- 双向同步（源文本→目标文本；目标文本→源文本逆向反推）
- Markdown 标题智能识别
- 动态术语库匹配

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 纯原生 HTML5 / CSS3 / ES6+ JavaScript |
| 样式 | 8pt 网格设计系统，CSS 变量主题系统 |
| 字体 | Google Fonts (Cinzel, Noto Serif SC) |
| Markdown | marked.js (CDN) |
| API | 兼容 OpenAI 格式的大语言模型 API |

**无构建工具** - 双击 `index.html` 即可运行，无需 npm/webpack/vite 等。

---

## 项目结构

```
co-creator/
├── index.html          # HTML 结构（~138行）
├── app.js              # 业务逻辑核心（~984行）
├── data.js             # 纯静态数据（20位助教 + 配置常量）
├── themes.css          # 样式系统 + 主题定义（~507行）
├── config.js           # API 配置（用户自定义，不提交Git）
├── config.example.js   # 配置示例模板
├── assets/             # 图片资源（PNG/SVG 头像）
└── AGENTS.md           # 本文件
```

### 文件加载顺序（index.html 中）

```html
<script src="config.js"></script>      <!-- 1. 配置 -->
<script src="data.js"></script>        <!-- 2. 静态数据 -->
<script src="app.js" defer></script>   <!-- 3. 业务逻辑 -->
```

---

## 架构设计

### 命名空间职责

| 命名空间 | 职责 | 代码行数 |
|---------|------|---------|
| `Utils` | 工具函数（防抖、XSS转义、Markdown检测、选项构建） | ~65行 |
| `Store` | localStorage 封装，术语库管理 | ~40行 |
| `ModelManager` | 模型切换与管理 | ~35行 |
| `API` | API 通信（指数退避重试 2 次，AbortController 支持） | ~48行 |
| `SyncEngine` | 区块级同步引擎（竞态防护、段落检测） | ~195行 |
| `TutorSystem` | 20位助教系统（5种吐槽模式） | ~145行 |
| `UI` | 视图更新、主题管理、DOM 操作 | ~420行 |
| `App` | 应用入口 | ~10行 |

### 设计原则

1. **单一数据源（SSOT）**: 所有状态通过 `Store` 管理
2. **关注点分离**: 逻辑层（SyncEngine）与视图层（UI）完全解耦
3. **防御性编程**: 指数退避重试、XSS 转义、输入验证
4. **DRY 原则**: 工具函数复用，主题通过 CSS 变量统一管理

---

## 核心机制详解

### 1. 双触发同步机制

```javascript
// 方式1：停止打字防抖触发（1500ms）
elZh.addEventListener('input', (e) => {
  clearTimeout(SyncEngine.typingTimer);
  SyncEngine.typingTimer = setTimeout(() => SyncEngine.execute(text, cursorIndex, true), 1500);
});

// 方式2：段落完成实时触发（检测到 \n\n）
if (SyncEngine.updateParagraphCount(text)) {
  const completedBlockIndex = SyncEngine.sharedParagraphCount - 2;
  SyncEngine.syncCompletedBlock(text, completedBlockIndex);
}
```

### 2. 竞态防护（AbortController）

```javascript
// 中断该区块旧的 API 请求
if (this.activeRequests[reqKey]) {
  this.activeRequests[reqKey].abort();
}
const controller = new AbortController();
this.activeRequests[reqKey] = controller;

// 请求时使用 signal
await API.call(text, prompt, temp, controller.signal);
```

### 3. 动态术语匹配

运行时扫描文本，只将实际出现的术语加入 Prompt：

```javascript
const matchedTerms = [];
for (const term of Store.termsList) {
  if (text.toLowerCase().includes(term.src.toLowerCase())) {
    matchedTerms.push(`- "${term.src}" MUST be translated as "${term.tgt}"`);
  }
}
```

### 4. XSS 防护

所有 `innerHTML` 操作前经过 `Utils.escapeHTML()` 转义：

```javascript
_htmlEscapes: {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
},
escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => this._htmlEscapes[tag] || tag);
}
```

---

## 配置说明

### config.js（用户自定义，不提交 Git）

```javascript
const CONFIG = {
    API_KEY: 'sk-your-api-key-here',        // LLM API 密钥
    API_URL: 'https://api.xxx.com/v1/chat/completions',  // API 端点
    MODEL_NAME: 'Qwen/Qwen3.5-9B',          // 默认模型
    TEMPERATURE: 0.2                         // 翻译温度
};
```

**获取方式**: 复制 `config.example.js` → `config.js` → 填入真实密钥

### 支持的模型（AVAILABLE_MODELS）

| 键名 | 模型 ID | 用途 |
|------|---------|------|
| Qwen3.5-4B | Qwen/Qwen3.5-4B | 极致省钱 |
| Qwen3.5-9B | Qwen/Qwen3.5-9B | 平衡之选 |
| Qwen3.5-35B-A3B | Qwen/Qwen3.5-35B-A3B | 专业级 |

---

## 主题系统

### 4 种内置主题

| 主题 | data-theme | 特点 |
|------|-----------|------|
| Apple 极简 | `apple` | 默认主题，浅色毛玻璃效果 |
| 暗黑模式 | `dark` | 深色背景，适合夜间 |
| 护眼模式 | `eyecare` | 绿色调背景 (#c7edcc) |
| 罗马古典 | `roman` | 羊皮纸质感，衬线字体 |

### CSS 变量架构

```css
:root {
  /* 核心 Token */
  --bg-color: #f5f5f7;
  --surface-color: rgba(255, 255, 255, 0.85);
  --text-color: #1d1d1f;
  --accent-color: #0071e3;
  
  /* 8pt 间距系统 */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  
  /* 组件级 Token */
  --toolbar-bg: var(--surface-color);
  --btn-radius: var(--radius);
}
```

### 助教主题

通过 `data-tutor` 属性注入各国主题色：

```css
[data-tutor="theme-marcus"] {
  --tutor-primary: #8b4513;
  --tutor-secondary: #d4af37;
  --tutor-bubble-text: #3d2914;
}
```

---

## 助教系统

### 20 位助教数据结构（data.js）

每位助教包含以下字段：

```javascript
{
  id: "marcus",
  name: "Marcus",
  gender: "male",           // male | female
  age: 15,
  ageGroup: "teen",         // teen | young | adult
  country: "latin",         // latin | german | spanish | japanese | english | french
  title: "S.P.Q.R. - Marcus 助教",
  avatar: "assets/marcus_portrait.png",
  avatarType: "photo",      // photo | svg
  intro: "\"Salvē, amīce! 我是 Marcus...\"",
  desc: "15岁古罗马少年，毒舌助教...",
  themeClass: "theme-marcus",
  prompt: "你是 Marcus Iulius...",      // 完整系统提示词
  briefPrompt: "你是《Familia Romana》..."  // 简短吐槽提示词
}
```

### 5 种吐槽模式（TUTOR_MODE_SETTINGS）

| 模式 | charThreshold | cooldownMinutes | 说明 |
|------|--------------|-----------------|------|
| high | 10 | 1 | 高频：紧盯你写每一个字 |
| normal | 50 | 3 | 正常：段落结束吐槽 |
| low | 200 | 5 | 低频：忍无可忍才说 |
| slow | 5 | 2 | 慢写：60秒无输入触发 |
| manual | Infinity | 0 | 手动：只有点击才吐槽 |

---

## 开发指南

### 添加新助教

1. 在 `data.js` 的 `TUTORS` 对象中添加新条目
2. 准备头像图片（PNG/SVG）放入 `assets/`
3. 如需要新国家主题，在 `themes.css` 添加 `[data-tutor="theme-xxx"]` 变量
4. 无需修改其他代码，系统会自动加载

### 添加新翻译风格预设

1. 在 `data.js` 的 `DEFAULT_PRESETS` 中添加：
   ```javascript
   newstyle: "You are a xxx translator. Translate into {{lang}}..."
   ```
   注意：必须包含 `{{lang}}` 占位符

2. 或在 UI 中通过「新增风格预设」按钮动态添加

### 添加新主题

1. 在 `themes.css` 添加新的 `[data-theme="xxx"]` 块
2. 覆盖必要的 CSS 变量
3. 在 `index.html` 添加主题切换按钮

---

## 安全注意事项

1. **API 密钥**: `config.js` 已加入 `.gitignore`，不会意外提交
2. **XSS 防护**: 所有用户输入和 API 返回都经过 `Utils.escapeHTML()` 转义
3. **文件上传限制**: CSV 术语库限制 500KB，最大 10000 行
4. **API 安全**: 使用 HTTPS，支持 AbortController 中断过期请求

---

## 调试技巧

```javascript
// 查看当前状态
console.log('Current Tutor:', TutorSystem.current);
console.log('Current Model:', ModelManager.getCurrentModel());
console.log('Target Columns:', UI.targetColumns);
console.log('Terms List:', Store.termsList);

// 手动触发翻译
SyncEngine.execute(document.getElementById('editor-zh').value, 0, true);

// 切换助教
TutorSystem.switch('marcus');

// 切换模型
ModelManager.switch('Qwen3.5-35B-A3B');
```

---

## 常见修改场景

### 修改翻译提示词
编辑 `data.js` 中的 `DEFAULT_PRESETS` 对象。

### 修改吐槽频率
编辑 `data.js` 中的 `TUTOR_MODE_SETTINGS` 对象。

### 修改防抖延迟
编辑 `app.js` 中的 `bindEvents()` 方法，查找 `setTimeout(() => SyncEngine.execute(...), 1500)` 修改延迟时间。

### 添加新语言支持
1. 编辑 `data.js` 的 `SUPPORTED_LANGUAGES` 数组
2. 在 `app.js` 的 `SyncEngine.buildPrompt()` 中添加语言特定规则（如需要）

---

## 许可证

MIT License

> *"Salvē, amīce! 选择一位助教，开始你的多语言写作之旅。"* — Marcus
