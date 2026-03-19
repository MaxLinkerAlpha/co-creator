# Co-creator - AI Coding Agent 指南

## 项目概述

**Co-creator** 是一款实时多语言协作写作工作台，面向多语言写作者的生产力工具。项目采用 **ES Modules 模块化架构**，零构建工具、零框架依赖，遵循 KISS 原则（Keep It Simple, Stupid）。

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
| 前端 | 纯原生 HTML5 / CSS3 / ES6+ JavaScript (ES Modules) |
| 样式 | 8pt 网格设计系统，CSS 变量主题系统 |
| 字体 | Google Fonts (Cinzel, Noto Serif SC) |
| Markdown | marked.js (CDN) |
| API | 兼容 OpenAI 格式的大语言模型 API |

**无构建工具** - 使用 HTTP 服务器运行（`python3 -m http.server 8001`），无需 npm/webpack/vite 等。

---

## 项目结构

```
co-creator/
├── index.html              # 入口页面
├── themes.css              # 样式系统 + 主题定义
├── config.js               # API 配置（用户自定义，不提交Git）
├── config.example.js       # 配置示例模板
├── data.js                 # 数据桥接文件（全局变量导出）
├── assets/                 # 图片资源（20个头像文件）
│   ├── marcus_portrait.png
│   ├── tutor_latin_female.svg
│   ├── tutor_german_*.svg
│   ├── tutor_spanish_*.svg
│   ├── tutor_japanese_*.svg
│   ├── tutor_english_*.svg
│   └── tutor_french_*.svg
├── src/                    # 模块化源码
│   ├── app.js              # 应用入口（ES Module）
│   ├── globals.js          # 全局变量桥接
│   ├── core/               # 核心模块
│   │   ├── event-bus.js    # 事件总线
│   │   ├── store.js        # 状态管理
│   │   └── utils.js        # 工具函数
│   ├── data/               # 数据模块
│   │   ├── constants.js    # 常量配置
│   │   └── tutors.js       # 20位助教数据
│   ├── features/           # 功能模块
│   │   └── tutor-system.js # 助教系统
│   ├── services/           # 服务模块
│   │   ├── api.js          # API 通信
│   │   ├── model-manager.js# 模型管理
│   │   └── sync-engine.js  # 同步引擎
│   └── ui/                 # UI 模块
│       └── ui-manager.js   # UI 管理
└── modular-backup/         # 备份文件夹（可删除）
```

### 文件加载顺序（index.html 中）

```html
<script src="config.js"></script>           <!-- 1. 配置（全局变量） -->
<script src="data.js"></script>             <!-- 2. 数据桥接（全局变量） -->
<script src="src/globals.js"></script>      <!-- 3. 全局变量桥接到 window -->
<script type="module" src="src/app.js"></script>  <!-- 4. 应用入口（ES Module） -->
```

---

## 架构设计

### 模块化架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │config.js │  │ data.js  │  │globals.js│  │  src/app.js      │ │
│  │ (全局)   │  │ (全局)   │  │ (桥接)   │  │  (ES Module)     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        ▼             ▼             ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Layer (核心层)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  event-bus.js │  │   store.js   │  │   utils.js   │          │
│  │  事件总线     │  │  状态管理    │  │  工具函数    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Services Layer (服务层)                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │    api.js    │  │  model-manager.js │  │   sync-engine.js │  │
│  │  API 通信    │  │  模型管理         │  │  同步引擎        │  │
│  └──────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Features Layer (功能层)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    tutor-system.js                        │  │
│  │                    助教系统                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Layer (视图层)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     ui-manager.js                         │  │
│  │                     UI 管理                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 模块职责

| 模块 | 文件 | 职责 | 行数 |
|------|------|------|------|
| **EventBus** | `core/event-bus.js` | 事件订阅/发布，模块间通信 | ~30行 |
| **Store** | `core/store.js` | localStorage 封装，术语库管理 | ~60行 |
| **Utils** | `core/utils.js` | 工具函数（XSS转义、Markdown检测等） | ~80行 |
| **API** | `services/api.js` | API 通信，指数退避重试，AbortController | ~150行 |
| **ModelManager** | `services/model-manager.js` | 模型切换与管理 | ~50行 |
| **SyncEngine** | `services/sync-engine.js` | 区块级同步引擎，竞态防护 | ~270行 |
| **TutorSystem** | `features/tutor-system.js` | 20位助教系统，5种吐槽模式 | ~180行 |
| **UI** | `ui/ui-manager.js` | 视图更新、主题管理、DOM 操作 | ~450行 |
| **App** | `app.js` | 应用入口，初始化协调 | ~30行 |

### 设计原则

1. **ES Modules**: 所有模块使用 `import/export` 语法，支持 tree-shaking
2. **事件驱动**: 模块间通过 EventBus 解耦通信
3. **单一数据源（SSOT）**: 所有状态通过 `Store` 管理
4. **关注点分离**: 逻辑层与视图层完全解耦
5. **防御性编程**: 指数退避重试、XSS 转义、输入验证

---

## 事件系统

### 事件类型（EVENTS）

```javascript
export const EVENTS = {
  // 同步事件
  SYNC_BLOCK_TRANSLATED: 'sync:block:translated',
  SYNC_BLOCK_FAILED: 'sync:block:failed',
  SYNC_PARAGRAPH_COMPLETED: 'sync:paragraph:completed',
  SYNC_INVERSE_COMPLETED: 'sync:inverse:completed',
  SYNC_INVERSE_FAILED: 'sync:inverse:failed',
  
  // 助教事件
  TUTOR_SWITCHED: 'tutor:switched',
  TUTOR_ROAST: 'tutor:roast',
  TUTOR_ERROR: 'tutor:error',
  
  // UI 事件
  UI_THEME_CHANGED: 'ui:theme:changed',
  UI_MODEL_CHANGED: 'ui:model:changed',
  UI_TARGET_ADDED: 'ui:target:added',
  UI_TARGET_REMOVED: 'ui:target:removed'
};
```

### 事件订阅示例

```javascript
import { eventBus, EVENTS } from './core/event-bus.js';

// 订阅事件
eventBus.on(EVENTS.TUTOR_SWITCHED, ({ tutorId }) => {
  console.log('助教切换为:', tutorId);
});

// 发射事件
eventBus.emit(EVENTS.TUTOR_SWITCHED, { tutorId: 'marcus' });
```

---

## API 调用逻辑

### API 调用入口

所有 API 调用统一通过 `API.call()` 方法：

```javascript
API.call(text, systemPrompt, temperature, signal, retries)
```

### 调用时机（3种场景）

#### 1️⃣ 翻译同步（SyncEngine）

| 触发方式 | 说明 |
|---------|------|
| **防抖触发** | 用户停止输入 1500ms 后自动触发 |
| **段落完成** | 检测到 `\n\n`（双换行）时立即触发已完成段落 |

```javascript
// 双触发机制
elZh.addEventListener('input', (e) => {
  clearTimeout(SyncEngine.typingTimer);
  // 方式1: 防抖触发
  SyncEngine.typingTimer = setTimeout(() => {
    SyncEngine.execute(text, cursorIndex, true, ...);
  }, 1500);
  
  // 方式2: 段落完成触发
  if (SyncEngine.updateParagraphCount(text)) {
    SyncEngine.syncCompletedBlock(text, completedBlockIndex, ...);
  }
});
```

#### 2️⃣ 逆向翻译（SyncEngine）

当用户在目标语言栏编辑时，反向翻译回中文：

```javascript
SyncEngine.executeInverse(text, cursorIndex, sourceLang, targetId, ...)
```

#### 3️⃣ 助教吐槽（TutorSystem）

| 模式 | 触发条件 | 冷却时间 |
|------|---------|---------|
| `high` | 每输入 10 字 + 停止 3 秒 | 1 分钟 |
| `normal` | 段落结束 或 输入 50 字 + 停止 5 秒 | 3 分钟 |
| `low` | 输入 200 字 + 停止 8 秒 | 5 分钟 |
| `slow` | 60 秒无输入 | 2 分钟 |
| `manual` | 仅手动点击触发 | 无 |

### API 请求结构

```javascript
{
  model: "Qwen/Qwen3.5-9B",      // 当前选择的模型
  messages: [
    { role: "system", content: "翻译提示词..." },
    { role: "user", content: "用户文本..." }
  ],
  temperature: 0.2,              // 翻译用 0.2，吐槽用 0.8
  max_tokens: 8192
}
```

### 竞态防护机制

```javascript
// 中断旧请求
if (this.activeRequests[reqKey]) {
  this.activeRequests[reqKey].abort();
}
const controller = new AbortController();
this.activeRequests[reqKey] = controller;

// 请求时传入 signal
await API.call(text, prompt, 0.2, controller.signal);
```

### 错误处理

- **超时**: 60 秒自动中断
- **重试**: 指数退避重试最多 2 次（延迟 1s → 2s）
- **中断**: AbortError 不会重试

### 调用流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户输入事件                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌───────────┐
   │ 防抖触发 │  │段落完成  │  │ 助教检测  │
   │ 1500ms  │  │ \n\n    │  │ 字数/时间 │
   └────┬────┘  └────┬─────┘  └─────┬─────┘
        │            │              │
        └────────────┼──────────────┘
                     ▼
            ┌────────────────┐
            │  SyncEngine    │
            │  TutorSystem   │
            └───────┬────────┘
                    ▼
            ┌────────────────┐
            │   API.call()   │
            │  (带 AbortController) │
            └───────┬────────┘
                    ▼
            ┌────────────────┐
            │   LLM API      │
            │  (OpenAI 格式) │
            └───────┬────────┘
                    ▼
            ┌────────────────┐
            │  更新 UI       │
            │  翻译结果/吐槽 │
            └────────────────┘
```

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

const AVAILABLE_MODELS = {
    'Qwen3.5-4B': 'Qwen/Qwen3.5-4B',
    'Qwen3.5-9B': 'Qwen/Qwen3.5-9B',
    'Qwen3.5-35B-A3B': 'Qwen/Qwen3.5-35B-A3B'
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

### 20 位助教列表

| 国家 | 助教 | 性别 | 年龄 | 特点 |
|------|------|------|------|------|
| **拉丁** | Marcus | 男 | 15 | 《Familia Romana》主角，毒舌 |
| **拉丁** | Marcia | 女 | 16 | Marcus 堂妹，更毒舌，学法学 |
| **德国** | Max | 男 | 17 | 柏林少年，直爽，玩滑板 |
| **德国** | Maxine | 女 | 19 | 慕尼黑工大计算机系，理性 |
| **德国** | Wolfgang | 男 | 14 | 中二少年，沉迷历史演讲体 |
| **德国** | Wilhelmina | 女 | 45 | 历史学教授，知性优雅 |
| **西班牙** | Hugo | 男 | 20 | 马德里青年，半岛口音 |
| **西班牙** | Huguette | 女 | 42 | 巴塞罗那记者，独立女性 |
| **西班牙** | Mateo | 男 | 18 | 墨西哥城少年，跳脱，爱音乐 |
| **西班牙** | Matea | 女 | 23 | 墨西哥艺术家，自由奔放 |
| **日本** | 翔太 | 男 | 17 | 东京少年，极度口语，体育生 |
| **日本** | 翔子 | 女 | 25 | 大阪搞笑艺人，关西腔 |
| **日本** | 飒太 | 男 | 22 | 京都大学生，严格敬语 |
| **日本** | 飒子 | 女 | 38 | 茶道家，优雅端庄 |
| **英国** | Leo | 男 | 17 | 伦敦少年，英式痞气 |
| **英国** | Leona | 女 | 48 | 下议院议员，贵族口音 |
| **美国** | Brad | 男 | 50 | 纽约商人，美式热情 |
| **美国** | Belinda | 女 | 28 | LA 编剧，自由奔放 |
| **法国** | Enzo | 男 | 19 | 巴黎滑板少年，法式抱怨 |
| **法国** | Enza | 女 | 35 | 里昂厨师，热情直率 |

### 助教数据结构

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

### 运行项目

```bash
# 方式1: Python HTTP 服务器
python3 -m http.server 8001

# 方式2: Node.js HTTP 服务器
npx serve .

# 然后访问 http://localhost:8001/index.html
```

**注意**: 由于使用 ES Modules，必须通过 HTTP 服务器运行，不能直接双击 `index.html`（file:// 协议会触发 CORS 错误）。

### 添加新助教

1. 在 `src/data/tutors.js` 的 `TUTORS` 对象中添加新条目
2. 准备头像图片（PNG/SVG）放入 `assets/`
3. 如需要新国家主题，在 `themes.css` 添加 `[data-tutor="theme-xxx"]` 变量
4. 无需修改其他代码，系统会自动加载

### 添加新翻译风格预设

1. 在 `src/data/constants.js` 的 `DEFAULT_PRESETS` 中添加：
   ```javascript
   newstyle: "You are a xxx translator. Translate into {{lang}}..."
   ```
   注意：必须包含 `{{lang}}` 占位符

2. 或在 UI 中通过「新增风格预设」按钮动态添加

### 添加新主题

1. 在 `themes.css` 添加新的 `[data-theme="xxx"]` 块
2. 覆盖必要的 CSS 变量
3. 在 `index.html` 添加主题切换按钮

### 添加新事件

1. 在 `src/core/event-bus.js` 的 `EVENTS` 对象中添加新事件
2. 在相关模块中使用 `eventBus.emit()` 发射事件
3. 在需要响应的模块中使用 `eventBus.on()` 订阅事件

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
import { TutorSystem } from './features/tutor-system.js';
import { ModelManager } from './services/model-manager.js';
import { Store } from './core/store.js';

console.log('Current Tutor:', TutorSystem.current);
console.log('Current Model:', ModelManager.getCurrentModelId());
console.log('Terms List:', Store.termsList);

// 手动触发翻译
import { SyncEngine } from './services/sync-engine.js';
SyncEngine.execute(document.getElementById('editor-zh').value, 0, true, ...);

// 切换助教
TutorSystem.switch('marcus');

// 切换模型
ModelManager.switch('Qwen3.5-35B-A3B');

// 查看事件
import { eventBus, EVENTS } from './core/event-bus.js';
eventBus.on(EVENTS.TUTOR_ROAST, (data) => console.log('吐槽:', data));
```

---

## 常见修改场景

### 修改翻译提示词
编辑 `src/data/constants.js` 中的 `DEFAULT_PRESETS` 对象。

### 修改吐槽频率
编辑 `src/data/constants.js` 中的 `TUTOR_MODE_SETTINGS` 对象。

### 修改防抖延迟
编辑 `src/ui/ui-manager.js` 中的 `bindEvents()` 方法，查找 `setTimeout(..., 1500)` 修改延迟时间。

### 添加新语言支持
1. 编辑 `src/data/constants.js` 的 `SUPPORTED_LANGUAGES` 数组
2. 在 `src/services/sync-engine.js` 的 `buildPrompt()` 中添加语言特定规则（如需要）

---

## 文件统计

| 文件 | 行数 | 作用 |
|------|------|------|
| `index.html` | ~200 | HTML 结构 |
| `themes.css` | ~500 | 样式系统 + 4种主题 |
| `data.js` | ~400 | 数据桥接（全局变量导出） |
| `src/app.js` | ~30 | 应用入口 |
| `src/globals.js` | ~40 | 全局变量桥接 |
| `src/core/event-bus.js` | ~30 | 事件总线 |
| `src/core/store.js` | ~60 | 状态管理 |
| `src/core/utils.js` | ~80 | 工具函数 |
| `src/data/constants.js` | ~100 | 常量配置 |
| `src/data/tutors.js` | ~250 | 20位助教数据 |
| `src/features/tutor-system.js` | ~180 | 助教系统 |
| `src/services/api.js` | ~150 | API 通信 |
| `src/services/model-manager.js` | ~50 | 模型管理 |
| `src/services/sync-engine.js` | ~270 | 同步引擎 |
| `src/ui/ui-manager.js` | ~450 | UI 管理 |
| **总计** | **~2800** | |

---

## 许可证

MIT License

> *"Salvē, amīce! 选择一位助教，开始你的多语言写作之旅。"* — Marcus
