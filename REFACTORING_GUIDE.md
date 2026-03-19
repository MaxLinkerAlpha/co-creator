# Co-creator 项目拆分建议

## 📋 项目概述

**Co-creator** 是一款实时多语言协作写作工作台，采用纯原生 HTML/CSS/JavaScript 开发，零构建工具依赖。

**当前项目结构**：
```
co-creator/
├── index.html          # HTML 结构（143行）
├── app.js              # 业务逻辑核心（1252行）
├── data.js             # 静态数据（~600行）
├── themes.css          # 样式系统（507行）
├── config.js           # 配置文件（52行）
├── config.example.js   # 配置示例
├── assets/             # 图片资源（20个头像文件）
└── 文档文件（AGENTS.md, README.md 等）
```

---

## 🎯 拆分目标

1. **提升可维护性**：将 1252 行的 `app.js` 拆分为多个模块
2. **关注点分离**：逻辑层、视图层、数据层完全解耦
3. **便于测试**：每个模块可独立测试
4. **团队协作**：多人可并行开发不同模块

---

## 📊 当前代码分析

### app.js 命名空间统计

| 命名空间 | 行数 | 职责 | 耦合度 |
|-----------|------|------|--------|
| Utils | ~65 | 工具函数（防抖、XSS转义、选项构建） | 低 |
| Store | ~40 | localStorage 封装，术语库管理 | 低 |
| ModelManager | ~35 | 模型切换与管理 | 低 |
| API | ~180 | API 通信（指数退避重试、AbortController） | 低 |
| SyncEngine | ~230 | 区块级同步引擎（竞态防护、段落检测） | 中（依赖 UI）|
| TutorSystem | ~180 | 20位助教系统（5种吐槽模式） | 中（依赖 UI）|
| UI | ~480 | 视图更新、主题管理、DOM 操作 | 高（依赖所有模块）|
| App | ~10 | 应用入口 | 低 |

**总计**：~1220 行（不含注释）

### 耦合度分析

**高耦合问题**：
- `SyncEngine` 直接调用 `UI.updateStatus()`、`UI.getTargetConfigs()`
- `TutorSystem` 直接调用 `UI.showTutorBubble()`、`UI.renderFullTutorRoast()`
- `UI` 依赖所有其他模块

**建议**：引入事件总线或观察者模式，解耦逻辑层和视图层

---

## 🏗️ 推荐拆分方案

### 方案一：按功能模块拆分（推荐）

```
src/
├── core/                    # 核心基础设施
│   ├── utils.js            # 工具函数
│   ├── store.js            # 状态管理
│   └── event-bus.js       # 事件总线（新增）
│
├── services/               # 服务层
│   ├── api.js             # API 通信
│   ├── model-manager.js    # 模型管理
│   └── sync-engine.js     # 同步引擎
│
├── features/               # 功能模块
│   ├── tutor/             # 助教系统
│   │   ├── tutor-system.js
│   │   └── tutor-modes.js
│   ├── translation/        # 翻译功能
│   │   ├── translator.js
│   │   └── term-manager.js
│   └── preview/           # 预览功能
│       └── markdown-renderer.js
│
├── ui/                     # 视图层
│   ├── ui-manager.js      # UI 主控制器
│   ├── components/        # 组件
│   │   ├── toolbar.js
│   │   ├── workspace.js
│   │   ├── tutor-drawer.js
│   │   └── modal.js
│   └── themes/           # 主题系统
│       ├── theme-manager.js
│       └── theme-definitions.js
│
├── data/                   # 数据层
│   ├── constants.js       # 常量定义
│   ├── tutors.js          # 助教数据
│   ├── languages.js       # 语言配置
│   └── presets.js        # 预设配置
│
├── config/                 # 配置
│   ├── config.js         # 主配置
│   └── config.example.js # 配置示例
│
└── app.js                  # 应用入口
```

### 方案二：按层次拆分（备选）

```
src/
├── data/                   # 数据层
│   ├── constants.js
│   ├── tutors.js
│   └── models.js
│
├── domain/                 # 领域层
│   ├── sync/
│   │   ├── sync-engine.js
│   │   └── block-detector.js
│   ├── tutor/
│   │   ├── tutor-system.js
│   │   └── roast-strategies.js
│   └── translation/
│       ├── translator.js
│       └── prompt-builder.js
│
├── infrastructure/         # 基础设施
│   ├── api.js
│   ├── storage.js
│   └── event-emitter.js
│
├── presentation/           # 表现层
│   ├── ui.js
│   ├── components/
│   └── themes/
│
└── app.js
```

---

## 📝 详细拆分说明

### 1. 核心基础设施 (core/)

#### 1.1 utils.js
**职责**：提供纯函数工具
**内容**：
- 文本处理（`cleanText`, `stripHeadingMarkers`）
- HTML 转义（`escapeHTML`）
- 防抖函数（`debounce`）
- Markdown 检测（`isHeading`）
- 选项构建（`buildLangOptions`, `buildTutorOptions`, `buildStyleOptions`）

**依赖**：无
**导出**：`Utils` 对象

#### 1.2 store.js
**职责**：封装 localStorage，提供类型安全的存取
**内容**：
- `get(key, defaultValue)`
- `set(key, value)`
- `getObject(key, defaultValue)`
- 术语库管理（`termsList`）
- 预设管理（`getCustomPresets`, `setCustomPresets`）

**依赖**：无
**导出**：`Store` 对象

#### 1.3 event-bus.js（新增）
**职责**：实现发布-订阅模式，解耦模块间通信
**内容**：
```javascript
class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

export const eventBus = new EventBus();
```

**使用示例**：
```javascript
// SyncEngine 发布事件
eventBus.emit('translation:started', { blockIndex, targetLang });

// UI 订阅事件
eventBus.on('translation:started', ({ blockIndex, targetLang }) => {
  ui.updateStatus(`${targetLang}-status`, '🔄 翻译中...');
});
```

---

### 2. 服务层 (services/)

#### 2.1 api.js
**职责**：封装 API 通信，处理重试和超时
**内容**：
- `call(text, systemPrompt, temp, externalSignal, retries)`
- 指数退避重试机制
- AbortController 管理
- 多种响应格式兼容

**依赖**：`Utils`, `ModelManager`
**导出**：`API` 对象

#### 2.2 model-manager.js
**职责**：管理模型切换和自定义模型
**内容**：
- `init()`
- `switch(modelKey)`
- `setCustomModelId(modelId)`
- `getCurrentModelId()`
- `getCurrentModel()`
- `isCustomModel()`

**依赖**：`Store`, `CONFIG`
**导出**：`ModelManager` 对象

#### 2.3 sync-engine.js
**职责**：区块级同步引擎，管理翻译任务
**内容**：
- `execute(fullText, cursorIndex, forceSyncCurrentBlock)`
- `syncCompletedBlock(fullText, blockIndex)`
- `translateBlock(text, index, totalBlocks, targets, asHeading)`
- `buildPrompt(text, targetLang, basePrompt, latinConfig)`
- `updateParagraphCount(text)`
- 请求追踪（`activeRequests`）

**依赖**：`Utils`, `API`, `Store`, `eventBus`
**导出**：`SyncEngine` 对象

**改进点**：
- 通过 `eventBus.emit()` 发布事件，而不是直接调用 UI
- 示例：`eventBus.emit('sync:block-translated', { index, result })`

---

### 3. 功能模块 (features/)

#### 3.1 tutor/tutor-system.js
**职责**：管理助教系统和吐槽逻辑
**内容**：
- `switch(tutorId)`
- `updateConfig(mode)`
- `handleInput(currentText)`
- `triggerBriefRoast(text)`
- `roastManual(text)`
- 5种吐槽模式实现

**依赖**：`Store`, `API`, `eventBus`
**导出**：`TutorSystem` 对象

**改进点**：
- 通过 `eventBus.emit('tutor:roast', { message, tutorId })` 发布事件
- 移除对 UI 的直接依赖

#### 3.2 translation/translator.js
**职责**：翻译核心逻辑
**内容**：
- `translate(text, targetLang, style)`
- `buildPrompt(text, targetLang, style)`
- 术语匹配

**依赖**：`API`, `Store`
**导出**：`Translator` 对象

#### 3.3 translation/term-manager.js
**职责**：术语库管理
**内容**：
- `loadTerms(csvContent)`
- `addTerm(term)`
- `removeTerm(id)`
- `searchTerms(keyword)`
- `exportTerms()`

**依赖**：`Store`
**导出**：`TermManager` 对象

#### 3.4 preview/markdown-renderer.js
**职责**：Markdown 渲染
**内容**：
- `render(markdown)`
- `togglePreview()`
- `checkAutoPreview()`

**依赖**：`marked` (CDN)
**导出**：`MarkdownRenderer` 对象

---

### 4. 视图层 (ui/)

#### 4.1 ui-manager.js
**职责**：UI 主控制器，协调所有组件
**内容**：
- `init()`
- `bindEvents()`
- `updateStatus(statusId, message)`
- `showTutorBubble(message, type)`
- `renderFullTutorRoast(message, tutorName)`
- `renderTutorError()`
- `setTheme(themeName)`
- `handleModelChange(modelKey)`
- `setCustomModel(modelId)`
- `addTargetColumn()`
- `saveNewPreset()`

**依赖**：所有其他模块
**导出**：`UI` 对象

**改进点**：
- 通过 `eventBus.on()` 订阅事件，而不是被其他模块直接调用
- 示例：
```javascript
eventBus.on('sync:block-translated', ({ index, result }) => {
  this.updateTargetBlock(target.id, index, result, totalBlocks);
});
```

#### 4.2 components/
**职责**：独立 UI 组件
**内容**：
- `toolbar.js`：工具栏组件
- `workspace.js`：工作区组件
- `tutor-drawer.js`：助教抽屉组件
- `modal.js`：模态框组件

**依赖**：`eventBus`
**导出**：各组件对象

#### 4.3 themes/theme-manager.js
**职责**：主题管理
**内容**：
- `setTheme(themeName)`
- `getTheme()`
- `applyTheme(theme)`

**依赖**：`Store`, `theme-definitions.js`
**导出**：`ThemeManager` 对象

#### 4.4 themes/theme-definitions.js
**职责**：主题定义
**内容**：
- 所有主题的 CSS 变量定义
- 主题切换逻辑

**依赖**：无
**导出**：主题常量

---

### 5. 数据层 (data/)

#### 5.1 constants.js
**职责**：系统常量
**内容**：
- `AGE_LABELS`
- `GENDER_LABELS`
- `TUTOR_MODE_SETTINGS`
- `LATIN_VARIANTS`
- `DEFAULT_THEME`
- `DEFAULT_TUTOR`

**依赖**：无
**导出**：常量对象

#### 5.2 tutors.js
**职责**：助教数据
**内容**：
- `TUTORS` 对象（20位助教）

**依赖**：无
**导出**：`TUTORS` 对象

#### 5.3 languages.js
**职责**：语言配置
**内容**：
- `SUPPORTED_LANGUAGES` 数组

**依赖**：无
**导出**：`SUPPORTED_LANGUAGES` 数组

#### 5.4 presets.js
**职责**：预设配置
**内容**：
- `DEFAULT_PRESETS` 对象

**依赖**：无
**导出**：`DEFAULT_PRESETS` 对象

---

### 6. 配置 (config/)

#### 6.1 config.js
**职责**：主配置文件
**内容**：
- `CONFIG` 对象（API_KEY, API_URL, MODEL_NAME, TEMPERATURE）
- `AVAILABLE_MODELS` 对象

**依赖**：无
**导出**：`CONFIG`, `AVAILABLE_MODELS`

#### 6.2 config.example.js
**职责**：配置示例
**内容**：同 config.js，但 API_KEY 为占位符

**依赖**：无
**导出**：示例配置

---

### 7. 应用入口 (app.js)

**职责**：应用初始化
**内容**：
```javascript
import { App } from './core/app.js';

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
```

**依赖**：所有模块
**导出**：`App` 对象

---

## 🔄 迁移步骤

### 阶段一：基础设施搭建（1-2天）

1. 创建目录结构
2. 拆分 `Utils` → `core/utils.js`
3. 拆分 `Store` → `core/store.js`
4. 实现 `event-bus.js`
5. 更新 `index.html` 引用新的模块

### 阶段二：服务层拆分（2-3天）

1. 拆分 `API` → `services/api.js`
2. 拆分 `ModelManager` → `services/model-manager.js`
3. 拆分 `SyncEngine` → `services/sync-engine.js`
4. 修改 `SyncEngine` 使用 `eventBus` 替代直接 UI 调用

### 阶段三：功能模块拆分（3-4天）

1. 拆分 `TutorSystem` → `features/tutor/tutor-system.js`
2. 创建 `features/translation/translator.js`
3. 创建 `features/translation/term-manager.js`
4. 创建 `features/preview/markdown-renderer.js`
5. 修改所有功能模块使用 `eventBus`

### 阶段四：视图层拆分（3-4天）

1. 拆分 `UI` → `ui/ui-manager.js`
2. 创建 `ui/components/` 目录
3. 拆分工具栏、工作区、助教抽屉、模态框组件
4. 拆分主题系统 → `ui/themes/`

### 阶段五：数据层拆分（1-2天）

1. 拆分 `data.js` → `data/constants.js`, `data/tutors.js`, `data/languages.js`, `data/presets.js`
2. 更新所有模块的导入路径

### 阶段六：配置和入口（1天）

1. 创建 `config/` 目录
2. 移动 `config.js` 和 `config.example.js`
3. 创建 `app.js` 入口文件
4. 更新 `index.html` 引用

### 阶段七：测试和优化（2-3天）

1. 单元测试（使用 Jest 或 Mocha）
2. 集成测试
3. 性能优化
4. 文档更新

---

## 🎨 CSS 拆分建议

### 当前 themes.css 分析

**行数**：507 行
**结构**：
- CSS 变量定义（~100 行）
- 主题定义（~150 行）
- 基础组件样式（~100 行）
- 助教系统样式（~150 行）
- 响应式适配（~7 行）

### 推荐拆分结构

```
styles/
├── base/                   # 基础样式
│   ├── variables.css       # CSS 变量
│   ├── reset.css          # 重置样式
│   └── typography.css     # 字体和排版
│
├── themes/                 # 主题
│   ├── apple.css         # Apple 极简
│   ├── dark.css          # 暗黑模式
│   ├── eyecare.css       # 护眼模式
│   └── roman.css         # 罗马古典
│
├── components/             # 组件样式
│   ├── toolbar.css
│   ├── workspace.css
│   ├── column.css
│   ├── modal.css
│   └── button.css
│
├── tutor/                 # 助教系统样式
│   ├── tutor-fab.css
│   ├── tutor-bubble.css
│   ├── tutor-drawer.css
│   └── tutor-themes.css
│
└── responsive/             # 响应式
    └── mobile.css
```

### CSS 拆分步骤

1. **提取变量**：将所有 CSS 变量移至 `base/variables.css`
2. **拆分主题**：将各主题样式移至 `themes/` 目录
3. **拆分组件**：将组件样式移至 `components/` 目录
4. **拆分助教**：将助教系统样式移至 `tutor/` 目录
5. **更新 index.html**：使用 `<link>` 标签引入所有 CSS 文件

---

## 📦 构建工具建议

虽然当前项目零构建工具，但拆分后建议引入：

### 方案一：ES Modules（推荐）

使用原生 ES Modules，无需构建工具：

```html
<script type="module" src="app.js"></script>
```

```javascript
// app.js
import { Utils } from './core/utils.js';
import { Store } from './core/store.js';
import { API } from './services/api.js';
// ...
```

**优点**：
- 零配置
- 浏览器原生支持
- 开发体验好

**缺点**：
- 需要 HTTP 服务器（不能用 `file://` 协议）

### 方案二：Vite（备选）

使用 Vite 作为构建工具：

```bash
npm create vite@latest co-creator -- --template vanilla
```

**优点**：
- 快速热更新
- 生产环境优化
- 插件生态丰富

**缺点**：
- 需要配置
- 增加依赖

---

## 🧪 测试建议

### 单元测试

使用 Jest 或 Mocha + Chai：

```javascript
// tests/utils.test.js
import { Utils } from '../src/core/utils.js';

describe('Utils', () => {
  test('escapeHTML should escape special characters', () => {
    expect(Utils.escapeHTML('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
  
  test('isHeading should detect markdown headings', () => {
    expect(Utils.isHeading('# Heading')).toBe(true);
    expect(Utils.isHeading('Not a heading')).toBe(false);
  });
});
```

### 集成测试

使用 Playwright 或 Cypress：

```javascript
// tests/integration/translation.test.js
import { test, expect } from '@playwright/test';

test('should translate text when user types', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  await page.fill('#editor-zh', 'Hello world');
  await page.waitForTimeout(2000);
  
  const translation = await page.textContent('#en-editor');
  expect(translation).toBeTruthy();
});
```

---

## 📚 文档建议

### 1. README.md 更新

添加以下章节：
- 项目结构说明
- 快速开始指南
- 开发环境搭建
- 构建和部署
- 贡献指南

### 2. API 文档

创建 `docs/API.md`：
- `Utils` API 文档
- `Store` API 文档
- `API` 服务文档
- `SyncEngine` 引擎文档
- `TutorSystem` 系统文档
- `UI` 组件文档

### 3. 架构文档

创建 `docs/ARCHITECTURE.md`：
- 整体架构图
- 模块依赖关系
- 数据流向
- 事件流

### 4. 迁移指南

创建 `docs/MIGRATION.md`：
- 从单体到模块化的迁移步骤
- 常见问题和解决方案
- 代码示例

---

## 🎯 总结

### 拆分收益

1. **可维护性提升**：每个文件职责单一，易于理解和修改
2. **可测试性提升**：模块可独立测试，测试覆盖率提高
3. **团队协作提升**：多人可并行开发不同模块
4. **代码复用提升**：模块可在其他项目中复用
5. **性能优化空间**：可按需加载模块，减少初始加载时间

### 拆分成本

1. **时间成本**：约 10-15 个工作日
2. **学习成本**：团队需要熟悉新的模块结构
3. **测试成本**：需要编写和维护测试用例

### 风险评估

1. **低风险**：拆分过程不影响现有功能
2. **中风险**：需要充分测试确保兼容性
3. **高收益**：长期维护成本大幅降低

---

## 📞 后续优化建议

### 短期（1-3个月）

1. 引入 TypeScript，提供类型安全
2. 添加单元测试和集成测试
3. 实现按需加载（Code Splitting）
4. 优化性能（减少重排和重绘）

### 中期（3-6个月）

1. 引入状态管理库（如 Zustand 或 Redux）
2. 实现离线功能（Service Worker）
3. 添加国际化支持（i18n）
4. 优化移动端体验

### 长期（6-12个月）

1. 考虑使用现代框架（React/Vue）
2. 实现插件系统
3. 添加协作功能（WebSocket）
4. 部署到云平台（Vercel/Netlify）

---

## 📝 附录

### A. 模块依赖关系图

```
App
├── UI
│   ├── EventBus
│   ├── ThemeManager
│   └── Components
├── SyncEngine
│   ├── API
│   ├── ModelManager
│   ├── Utils
│   ├── Store
│   └── EventBus
├── TutorSystem
│   ├── API
│   ├── Store
│   └── EventBus
├── API
│   ├── ModelManager
│   └── Utils
├── ModelManager
│   └── Store
├── Store
│   └── Utils
└── Utils (无依赖)
```

### B. 事件总线事件定义

```javascript
// 同步相关事件
'sync:block-translated'     // 区块翻译完成
'sync:block-failed'        // 区块翻译失败
'sync:paragraph-completed' // 段落完成
'sync:heading-synced'     // 标题同步完成

// 助教相关事件
'tutor:roast'            // 吐槽触发
'tutor:error'             // 吐槽错误
'tutor:switched'          // 助教切换

// UI 相关事件
'ui:status-updated'       // 状态更新
'ui:theme-changed'       // 主题切换
'ui:model-changed'        // 模型切换

// 翻译相关事件
'translation:started'     // 翻译开始
'translation:completed'   // 翻译完成
'translation:failed'      // 翻译失败
```

### C. 文件大小估算

| 文件 | 预估行数 | 预估大小 |
|------|-----------|-----------|
| core/utils.js | ~70 | ~2KB |
| core/store.js | ~50 | ~1.5KB |
| core/event-bus.js | ~30 | ~1KB |
| services/api.js | ~200 | ~6KB |
| services/model-manager.js | ~40 | ~1.5KB |
| services/sync-engine.js | ~250 | ~8KB |
| features/tutor/tutor-system.js | ~200 | ~6KB |
| features/translation/translator.js | ~100 | ~3KB |
| features/translation/term-manager.js | ~80 | ~2.5KB |
| features/preview/markdown-renderer.js | ~50 | ~1.5KB |
| ui/ui-manager.js | ~300 | ~10KB |
| ui/components/*.js | ~200 | ~6KB |
| ui/themes/theme-manager.js | ~60 | ~2KB |
| data/constants.js | ~30 | ~1KB |
| data/tutors.js | ~400 | ~12KB |
| data/languages.js | ~10 | ~0.5KB |
| data/presets.js | ~20 | ~0.5KB |
| config/config.js | ~60 | ~2KB |
| app.js | ~20 | ~0.5KB |
| **总计** | **~2160** | **~67KB** |

---

**文档版本**：v1.0  
**创建日期**：2026-03-19  
**作者**：Co-creator Team
