# Co-creator - AI Coding Agent 指南

## 项目概述

**Co-creator** 是一款实时多语言协作写作工作台，面向多语言写作者的生产力工具。项目采用 **ES Modules 模块化架构**，零构建工具、零框架依赖，遵循 KISS 原则（Keep It Simple, Stupid）。

**核心功能**:
- 多语言并发翻译（英/日/法/德/俄/阿/拉丁等 8 种语言）
- 20 位多元化 AI 助教（10男10女，老青少三代，不同文化背景）
- **随机助教模式** - 默认启用，助教随机出没吐槽
- 双触发同步机制（段落完成立即触发 + 停止打字防抖触发）
- 双向同步（源文本→目标文本；目标文本→源文本逆向反推）
- Markdown 标题智能识别
- 动态术语库匹配
- 沉浸式自动预览（3秒后自动渲染Markdown）

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
| **Store** | `core/store.js` | localStorage 封装，术语库管理，用户状态记忆 | ~80行 |
| **Utils** | `core/utils.js` | 工具函数（XSS转义、Markdown检测等） | ~60行 |
| **API** | `services/api.js` | API 通信，指数退避重试，AbortController | ~150行 |
| **ModelManager** | `services/model-manager.js` | 模型切换与管理 | ~50行 |
| **SyncEngine** | `services/sync-engine.js` | 区块级同步引擎，竞态防护，段落删除同步 | ~300行 |
| **TutorSystem** | `features/tutor-system.js` | 20位助教系统，随机模式，5种吐槽模式 | ~200行 |
| **UI** | `ui/ui-manager.js` | 视图更新、主题管理、DOM 操作、沉浸式预览 | ~500行 |
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

eventBus.on(EVENTS.TUTOR_SWITCHED, ({ tutorId }) => {
  console.log('助教切换为:', tutorId);
});

eventBus.emit(EVENTS.TUTOR_SWITCHED, { tutorId: 'marcus' });
```

---

## API 调用逻辑

### API 调用入口

所有 API 调用统一通过 `API.call()` 方法：

```javascript
API.call(text, systemPrompt, temperature, signal, retries)
```

### API 请求参数（已优化）

```javascript
const payload = {
  model: ModelManager.getCurrentModelId(),
  messages: [
    { role: 'system', content: cleanPrompt },
    { role: 'user', content: cleanText }
  ],
  temperature: temp,
  max_tokens: 2048,          // 优化：从8192减少到2048
  enable_thinking: false     // 优化：关闭推理模式加速响应
};
```

### 调用时机（3种场景）

#### 1️⃣ 翻译同步（SyncEngine）

| 触发方式 | 说明 |
|---------|------|
| **防抖触发** | 用户停止输入 1500ms 后自动触发 |
| **段落完成** | 检测到 `\n\n`（双换行）时立即触发已完成段落 |

#### 2️⃣ 逆向翻译（SyncEngine）

当用户在目标语言栏编辑时，反向翻译回中文。

#### 3️⃣ 助教吐槽（TutorSystem）

| 模式 | 触发条件 | 冷却时间 |
|------|---------|---------|
| `high` | 每输入 10 字 + 停止 3 秒 | 1 分钟 |
| `normal` | 段落结束 或 输入 50 字 + 停止 5 秒 | 3 分钟 |
| `low` | 输入 200 字 + 停止 8 秒 | 5 分钟 |
| `slow` | 60 秒无输入 | 2 分钟 |
| `manual` | 仅手动点击触发 | 无 |

### 竞态防护机制

```javascript
if (this.activeRequests[reqKey]) {
  this.activeRequests[reqKey].abort();
}
const controller = new AbortController();
this.activeRequests[reqKey] = controller;

await API.call(text, prompt, 0.2, controller.signal);
```

### 错误处理

- **超时**: 60 秒自动中断
- **重试**: 指数退避重试最多 2 次（延迟 1s → 2s）
- **中断**: AbortError 不会重试

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
if (this.activeRequests[reqKey]) {
  this.activeRequests[reqKey].abort();
}
const controller = new AbortController();
this.activeRequests[reqKey] = controller;
await API.call(text, prompt, temp, controller.signal);
```

### 3. 段落删除同步

当源文本中删除某段时，目标栏同步删除对应段落：

```javascript
if (this.sourceBlocksMemory.length > 0) {
  const deletedIndices = [];
  for (let i = 0; i < this.sourceBlocksMemory.length; i++) {
    const prevBlock = this.sourceBlocksMemory[i]?.trim();
    const currBlock = currentBlocks[i]?.trim();
    if (prevBlock && !currBlock && i < currentBlocks.length) {
      deletedIndices.push(i);
    }
  }
  if (deletedIndices.length > 0) {
    uiCallbacks.deleteTargetBlocks(deletedIndices);
  }
}
```

### 4. 用户状态记忆

系统会记住用户上次的选择：

```javascript
// 保存状态
Store.saveTargetColumns(columns);
Store.saveSourceText(text);
Store.set('current_tutor', tutorId);

// 恢复状态
const savedColumns = Store.getTargetColumns();
const savedSourceText = Store.getSourceText();
const savedTutor = Store.getTutor();
```

### 5. 沉浸式自动预览

停止输入 3 秒后自动进入 Markdown 渲染预览：

```javascript
scheduleAutoPreview() {
  clearTimeout(this.autoPreviewTimer);
  this.autoPreviewTimer = setTimeout(() => {
    if (autoPreviewToggle.checked && !this.isPreviewMode) {
      this.enterPreviewMode();
    }
  }, 3000);
}
```

### 6. XSS 防护

所有 `innerHTML` 操作前经过 `Utils.escapeHTML()` 转义。

---

## 助教系统

### 随机助教模式（默认启用）

```javascript
// TutorSystem 核心逻辑
export const TutorSystem = {
  current: 'marcus',
  isRandomMode: true,  // 默认随机模式
  
  _getRandomTutor() {
    const tutorIds = Object.keys(TUTORS);
    return tutorIds[Math.floor(Math.random() * tutorIds.length)];
  },
  
  _getCurrentTutor() {
    if (this.isRandomMode) {
      return this._getRandomTutor();  // 每次吐槽随机选择
    }
    return this.current;
  },
  
  switch(tutorId) {
    if (tutorId === 'random') {
      this.isRandomMode = true;
      // 每次吐槽时随机选择助教
    } else {
      this.isRandomMode = false;
      this.current = tutorId;
    }
  }
};
```

### 助教提示词优化（自然习得 + 人物互动）

每位助教的提示词包含：

1. **性格风格** - 独特的说话方式和性格特点
2. **自然表达来源** - 具体的文化载体（电影、音乐、文学等）
3. **引用习惯** - 常用词汇和表达方式
4. **互动规则** - 基于关系亲密度的互动概率
5. **回复规则** - 简洁明确的回应方式

**示例（Max - 柏林少年）**：

```javascript
{
  prompt: `你是 Max，17岁柏林少年，住在 Kreuzberg 区。

【性格风格】
- 直爽、语速快、不拐弯抹角
- 喜欢滑板、街头文化、德国说唱（Capital Bra, Nura）
- 对弟弟Wolfgang的中二病极度无奈

【自然表达来源】
- 街头对话：Späti便利店、U-Bahn、滑板场
- 说唱歌词：Capital Bra的"Berlin lebt"、Nura的"Chaya"
- 家庭日常：弟弟的中二演讲（你很尴尬）

【引用习惯】
- 同意：「Alles klar」「Passt」
- 惊讶：「Echt jetzt?」「Quatsch?」
- 吐槽：「Scheiße」「Krass」

【互动规则】
- 40%概率打断弟弟Wolfgang或吐槽他中二病
- 15%概率提到表姐Maxine（吐槽她太nerd）
- 5%概率提到姑妈Wilhelmina（无奈叹气）

【回复规则】
1. 直接引用用户写作内容
2. 用街头口语回应（80字内）
3. 自然插入德语表达（像母语者一样）
4. 不要教语法，要像朋友聊天`,
  
  briefPrompt: `你是17岁柏林少年Max。用街头口语回应（15-25字）。
    必须：引用用户内容 + 自然插入德语词 + 40%概率吐槽弟弟Wolfgang。`
}
```

### 互动概率矩阵

关系越紧密，互动概率越高：

| 助教 | 互动对象 | 关系 | 概率 |
|------|---------|------|------|
| Max | Wolfgang | 兄弟 | 40% |
| Max | Maxine | 表姐弟 | 15% |
| Max | Wilhelmina | 侄姑 | 5% |
| Hugo | Mateo | 双胞胎兄弟 | 40% |
| 翔太 | 翔子 | 姐弟 | 40% |
| 飒太 | 翔太 | 继兄弟 | 40% |
| 飒子 | 飒太 | 母子 | 30% |
| Marcus | Marcia | 堂兄妹 | 40% |

### 20 位助教列表

| 国家 | 助教 | 性别 | 年龄 | 特点 |
|------|------|------|------|------|
| **拉丁** | Marcus | 男 | 12 | 《Familia Romana》主角，毒舌 |
| **拉丁** | Marcia | 女 | 16 | Marcus 堂妹，更毒舌，学法学 |
| **德国** | Max | 男 | 17 | 柏林少年，直爽，玩滑板 |
| **德国** | Maxine | 女 | 19 | 慕尼黑工大计算机系，理性 |
| **德国** | Wolfgang | 男 | 14 | 中二少年，沉迷历史演讲体 |
| **德国** | Wilhelmina | 女 | 45 | 历史学教授，知性优雅 |
| **西班牙** | Hugo | 男 | 20 | 马德里青年，半岛口音(C/Z发θ) |
| **西班牙** | Huguette | 女 | 42 | 巴塞罗那记者，独立女性 |
| **西班牙** | Mateo | 男 | 18 | 墨西哥城少年，跳脱，爱Reggaetón |
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
  gender: "male",
  age: 12,
  ageGroup: "teen",
  country: "latin",
  title: "S.P.Q.R. - Marcus 助教",
  avatar: "assets/marcus_portrait.png",
  avatarType: "photo",
  intro: "\"Salvē, amīce! 我是 Marcus...\"",
  desc: "《Familia Romana》主角，12岁古罗马少年...",
  themeClass: "theme-marcus",
  prompt: "...",      // 完整提示词
  briefPrompt: "..."  // 简短提示词（气泡用）
}
```

---

## 配置说明

### config.js（用户自定义，不提交 Git）

```javascript
const CONFIG = {
    API_KEY: 'sk-your-api-key-here',
    API_URL: 'https://api.xxx.com/v1/chat/completions',
    MODEL_NAME: 'Qwen/Qwen3.5-9B',
    TEMPERATURE: 0.2
};

const AVAILABLE_MODELS = {
    'Qwen3.5-4B': 'Qwen/Qwen3.5-4B',
    'Qwen3.5-9B': 'Qwen/Qwen3.5-9B',
    'Qwen3.5-35B-A3B': 'Qwen/Qwen3.5-35B-A3B'
};
```

### 支持的语言（SUPPORTED_LANGUAGES）

```javascript
export const SUPPORTED_LANGUAGES = [
  { code: "English", label: "🇬🇧 英语 (English)" },
  { code: "Japanese", label: "🇯🇵 日语 (日本語)" },
  { code: "Spanish", label: "🇪🇸 西班牙语 (Español)" },
  { code: "French", label: "🇫🇷 法语 (Français)" },
  { code: "German", label: "🇩🇪 德语 (Deutsch)" },
  { code: "Russian", label: "🇷🇺 俄语 (Русский)" },
  { code: "Arabic", label: "🇸🇦 阿拉伯语 (العربية)" },
  { code: "Latin", label: "🏛️ 拉丁语 (Latina)" }
];
```

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
  --bg-color: #f5f5f7;
  --surface-color: rgba(255, 255, 255, 0.85);
  --text-color: #1d1d1f;
  --accent-color: #0071e3;
  
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
}
```

---

## 开发指南

### 本地运行

```bash
# 启动 HTTP 服务器
python3 -m http.server 8001

# 访问
open http://localhost:8001
```

### 添加新助教

1. 在 `src/data/tutors.js` 中添加助教对象
2. 在 `assets/` 中添加头像文件
3. 更新 `intro`、`desc`、`prompt`、`briefPrompt`

### 添加新语言

1. 在 `src/data/constants.js` 的 `SUPPORTED_LANGUAGES` 中添加
2. 格式：`{ code: "LanguageName", label: "🇫🇷 语言名 (Native)" }`

---

## 版本历史

### v1.1.0 (GitHub Pages 在线使用版)
- 🌐 支持 GitHub Pages 直接在线使用
- ✨ 欢迎弹窗引导用户（免费模型 / 配置 API）
- ✨ 默认配置文件，无需本地配置
- ✨ 工具栏 UI 统一优化（模型/主题下拉菜单、实时预览按钮、术语库导入按钮）
- 📝 更新 README 添加在线访问地址

### v1.0.0 (首个正式稳定版)
- ✨ 工具栏 UI 统一优化
- ✨ 模型/主题选择下拉菜单（显示当前选中）
- ✨ 实时预览一键切换按钮
- ✨ 术语库导入按钮（成功后显示 ✓）
- ✨ 四个工具栏按钮宽度统一
- ✨ 模块化架构重构
- ✨ 助教系统随机模式
- ✨ 沉浸式自动预览
- ✨ 用户状态记忆
- ✨ 拖拽排序目标栏
- ✨ 拉丁语变体支持

### v3.2.0
- ✨ 新增随机助教模式（默认启用）
- ✨ 助教提示词优化（自然习得 + 人物互动）
- ✨ 语言选项添加国旗 emoji
- ✨ 沉浸式自动预览（3秒后渲染Markdown）
- ✨ 段落删除同步
- ✨ 用户状态记忆
- 🐛 修复 Marcus 年龄（15→12岁）
- 🐛 修复按钮乱码符号
- 🔧 移除繁体中文选项
- ⚡ API 优化：max_tokens 2048，关闭推理模式

### v3.1.0
- 模块化架构重构
- 20位助教系统
- 双触发同步机制

---

> *"Salvē, amīce! 选择一位助教，开始你的多语言写作之旅。"* — Marcus
