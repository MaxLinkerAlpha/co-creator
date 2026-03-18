/**
 * ==========================================
 * Co-creator 应用核心逻辑 v3.0 (终极重构版)
 * ==========================================
 * 严格遵循: 单一数据源 (SSOT), 关注点分离, 防御性编程, DRY原则
 */

// ==========================================
// 1. 工具函数命名空间 (Utils)
// ==========================================
const Utils = {
  isHeading(text) {
    return /^#{1,6}\s+/.test(text.trim());
  },

  // 【新增】去掉标题标记，返回纯文本
  stripHeadingMarkers(text) {
    return text.trim().replace(/^#{1,6}\s+/, '');
  },

  debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  cleanText(text) {
    return text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  },

  // 基础 XSS 防御：对潜在危险字符进行转义
  // 【优化】静态映射表，避免每次调用创建新对象
  _htmlEscapes: {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  },
  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => this._htmlEscapes[tag] || tag);
  },

  buildLangOptions(defaultLang) {
    return SUPPORTED_LANGUAGES.map(lang => 
      `<option value="${lang.code}"${defaultLang === lang.code ? ' selected' : ''}>${lang.label}</option>`
    ).join('');
  },

  buildTutorOptions() {
    const ageLabels = { teen: '少年', young: '青年', adult: '中年' };
    const genderLabels = { male: '男', female: '女' };
    
    return Object.values(TUTORS).map(tutor => {
      const ageLabel = ageLabels[tutor.ageGroup] || '';
      const genderLabel = genderLabels[tutor.gender] || '';
      return `<option value="${tutor.id}">[${tutor.country.toUpperCase()}] ${tutor.name} ${genderLabel} ${ageLabel}</option>`;
    }).join('');
  },

  buildStyleOptions(defaultStyle, presets, defaultPresets) {
    return Object.keys(presets).map(key => {
      const label = defaultPresets[key] ? '[*] ' + key : '[C] ' + key;
      return `<option value="${key}"${defaultStyle === key ? ' selected' : ''}>${label}</option>`;
    }).join('');
  }
};

// ==========================================
// 2. 存储与状态层 (Store)
// ==========================================
const Store = {
  // 封装术语库，避免暴露在 global window
  termsList: [],

  get(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (err) {
      // 【修复】如果解析失败，返回原始字符串（兼容旧数据）
      // 但如果调用方期望对象，后续访问可能报错，需要调用方自行判断
      return value;
    }
  },

  // 【新增】安全获取对象，解析失败时返回默认值
  getObject(key, defaultValue = {}) {
    const result = this.get(key, defaultValue);
    return (typeof result === 'object' && result !== null) ? result : defaultValue;
  },

  set(key, value) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },

  getTheme() { return this.get('pd_theme', DEFAULT_THEME); },
  getTutor() { return this.get('current_tutor', DEFAULT_TUTOR); },
  getCustomPresets() { return this.getObject('pd_custom_presets', {}); },
  getTutorConfig() {
    return this.getObject('tutor_config', {
      mode: 'normal',
      charThreshold: 50,
      cooldownMinutes: 3,
      idleThreshold: 5000
    });
  }
};

// ==========================================
// 3. 模型管理器 (ModelManager)
// ==========================================
const ModelManager = {
  currentModel: null,
  customModelId: null,  // 【新增】存储自定义模型ID

  init() {
    // 优先使用本地存储的模型选择，其次是 CONFIG.MODEL_NAME
    const saved = localStorage.getItem('pd_selected_model');
    const savedCustomModel = localStorage.getItem('pd_custom_model_id');
    
    if (savedCustomModel) {
      this.customModelId = savedCustomModel;
    }
    
    if (saved && AVAILABLE_MODELS && AVAILABLE_MODELS[saved]) {
      this.currentModel = AVAILABLE_MODELS[saved];
    } else if (CONFIG.MODEL_NAME) {
      // 如果 CONFIG 中配置了模型，使用它
      this.currentModel = { id: CONFIG.MODEL_NAME, name: CONFIG.MODEL_NAME };
    } else {
      // 【修改】默认使用最快的 Qwen3.5-4B
      this.currentModel = AVAILABLE_MODELS ? AVAILABLE_MODELS['Qwen3.5-4B'] : { id: 'Qwen/Qwen3.5-4B', name: 'Qwen3.5-4B' };
    }
  },

  switch(modelKey) {
    if (!AVAILABLE_MODELS || !AVAILABLE_MODELS[modelKey]) {
      console.error('未知模型:', modelKey);
      return false;
    }
    this.currentModel = AVAILABLE_MODELS[modelKey];
    localStorage.setItem('pd_selected_model', modelKey);
    
    // 【新增】如果切换到自定义模型，从 localStorage 读取自定义ID
    if (modelKey === 'Custom') {
      const customId = localStorage.getItem('pd_custom_model_id');
      if (customId) {
        this.customModelId = customId;
        console.log('[Model] 已切换到自定义模型:', customId);
      }
    }
    
    console.log('[Model] 已切换到:', this.currentModel.name, '-', this.currentModel.useCase);
    return true;
  },
  
  // 【新增】设置自定义模型ID
  setCustomModelId(modelId) {
    if (!modelId || !modelId.trim()) return false;
    this.customModelId = modelId.trim();
    localStorage.setItem('pd_custom_model_id', this.customModelId);
    console.log('[Model] 自定义模型ID已设置:', this.customModelId);
    return true;
  },

  getCurrentModelId() {
    // 【新增】如果是自定义模型，返回自定义ID
    if (this.currentModel && this.currentModel.id === 'custom' && this.customModelId) {
      return this.customModelId;
    }
    return this.currentModel ? this.currentModel.id : (CONFIG.MODEL_NAME || 'Qwen/Qwen3.5-9B');
  },

  getCurrentModel() {
    return this.currentModel;
  },
  
  // 【新增】检查当前是否为自定义模型
  isCustomModel() {
    return this.currentModel && this.currentModel.id === 'custom';
  }
};

// 4. API 层 (API) - 引入指数退避重试与 AbortController
// ==========================================
const API = {
  // 【修复】简化超时控制，避免复杂的 signal 组合
  async call(text, systemPrompt, temp = 0.2, externalSignal = null, retries = 2) {
    const cleanText = Utils.cleanText(text);
    const cleanPrompt = Utils.cleanText(systemPrompt);

    // 【修复】更严格的 API_KEY 检查
    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (!CONFIG.API_KEY || invalidKeys.some(k => k && CONFIG.API_KEY.toLowerCase().includes(k.toLowerCase()))) {
      throw new Error('API_KEY not configured or invalid');
    }

    const payload = {
      model: ModelManager.getCurrentModelId(),
      messages: [
        { role: 'system', content: cleanPrompt },
        { role: 'user', content: cleanText }
      ],
      temperature: temp,
      max_tokens: 2048  // 【优化】限制最大输出长度，加快响应
    };

    console.log('[API] 准备请求:', {
      url: CONFIG.API_URL,
      model: payload.model,
      textLength: cleanText.length
    });

    // 指数退避重试机制
    for (let i = 0; i <= retries; i++) {
      // 【修复】使用 AbortController.timeout 如果浏览器支持，否则用 setTimeout
      const controller = new AbortController();
      let timeoutId = null;
      
      // 外部 signal 中断处理
      const onExternalAbort = () => {
        console.log('[API] 收到外部中断信号');
        if (timeoutId) clearTimeout(timeoutId);
        controller.abort();
      };
      
      if (externalSignal) {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
      
      // 30秒超时
      timeoutId = setTimeout(() => {
        console.log('[API] 请求超时，自动中断');
        controller.abort();
      }, 30000);
      
      try {
        console.log(`[API] 发送请求 (尝试 ${i + 1}/${retries + 1})...`);
        const startTime = Date.now();
        
        const response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CONFIG.API_KEY
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        
        console.log(`[API] 响应收到: HTTP ${response.status}, 耗时 ${Date.now() - startTime}ms`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[API] HTTP 错误:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[API] 解析成功');
        
        // 【修复】安全检查 API 响应结构
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
          console.error('[API] 响应结构异常:', JSON.stringify(data).slice(0, 200));
          throw new Error('API 响应格式异常');
        }
        
        return data.choices[0].message.content.trim();
      } catch (err) {
        clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        
        // 【修复】正确处理 AbortError
        if (err.name === 'AbortError') {
          // 如果是外部触发的 abort（用户主动中断），直接抛出
          if (externalSignal?.aborted) {
            console.log('[API] 请求被用户中断');
            throw err;
          }
          // 否则是超时导致的 abort
          console.error('[API] 请求超时 (30秒)');
          if (i === retries) throw new Error('请求超时，请检查网络连接');
          // 超时时继续重试
        } else {
          // 其他错误
          console.error(`[API] 请求失败 (尝试 ${i + 1}/${retries + 1}):`, err);
          if (i === retries) throw err;
        }
        
        const delay = 1000 * Math.pow(2, i);
        console.warn(`[API] ${delay/1000}秒后进行第 ${i + 1} 次重试...`);
        await new Promise(r => setTimeout(r, delay)); 
      }
    }
  }
};

// ==========================================
// 4. 同步引擎 (SyncEngine) - 纯逻辑层，零 DOM 依赖
// ==========================================
const SyncEngine = {
  sourceBlocksMemory: [],
  typingTimer: null,
  autoPreviewTimer: null,
  activeRequests: {}, // 追踪所有进行中的 API 请求
  
  // 【新增】共享段落计数器，用于 UI 和 TutorSystem 同步检测
  sharedParagraphCount: 0,
  updateParagraphCount(text) {
    const count = text.split('\n\n').filter(p => p.trim()).length;
    const increased = count > this.sharedParagraphCount;
    if (increased) {
      this.sharedParagraphCount = count;
    }
    return increased;
  },

  buildPrompt(text, targetLang, basePrompt, latinConfig) {
    // 【修复】确保 basePrompt 是有效字符串
    if (!basePrompt || typeof basePrompt !== 'string') {
      console.error('[SyncEngine] buildPrompt: basePrompt 无效', basePrompt);
      basePrompt = 'Translate into {{lang}}. Output ONLY the translation.';
    }
    
    let finalLang = targetLang;
    const rules = [];

    // 【优化】使用数组收集规则，最后一次性拼接
    if (targetLang === 'Latin') {
      finalLang = latinConfig.style;
      rules.push('');
      rules.push('## Latin Specific Rules:');
      rules.push(latinConfig.useMacron
        ? '- MUST use macrons (ā, ē, ī, ō, ū) correctly.'
        : '- DO NOT use any macrons or diacritics.');

      if (latinConfig.style.includes('Spoken')) {
        rules.push('- Use modern Spoken Latin conventions.');
      } else if (latinConfig.style.includes('Vulgar')) {
        rules.push('- Use colloquial vocabulary and simplified grammar.');
      }
    }

    // 【恢复】动态术语匹配机制 - 只匹配文本中实际出现的术语
    const matchedTerms = [];
    for (const term of Store.termsList) {
      if (text.toLowerCase().includes(term.src.toLowerCase()) || 
          text.toLowerCase().includes(term.tgt.toLowerCase())) {
        matchedTerms.push(`- "${term.src}" MUST be translated as "${term.tgt}"`);
      }
    }
    if (matchedTerms.length > 0) {
      rules.push('');
      rules.push('## Mandatory Terminology:');
      rules.push(...matchedTerms);
    }

    return basePrompt.replace(/\{\{lang\}\}/g, finalLang) + rules.join('\n');
  },

  // 接收纯文本数据进行处理
  async execute(fullText, cursorIndex, forceSyncCurrentBlock) {
    const currentBlocks = fullText.split('\n\n');
    const tasks = [];
    const targets = UI.getTargetConfigs(); // 获取目标列的配置数据
    
    // 【修复】检查是否有目标列
    if (!targets || targets.length === 0) {
      console.log('[SyncEngine] 没有目标列，跳过同步');
      return;
    }

    for (let i = 0; i < currentBlocks.length; i++) {
      if (currentBlocks[i] !== this.sourceBlocksMemory[i] && currentBlocks[i].trim() !== '') {
        if (forceSyncCurrentBlock || i !== cursorIndex) {
          const blockContent = currentBlocks[i].trim();

          if (Utils.isHeading(blockContent)) {
            UI.updateStatus('zh-status', '✓ 标题同步');
            // 【修复】标题同步：检测是否是「已翻译内容加#」的情况
            const cleanTitle = Utils.stripHeadingMarkers(blockContent);
            const prevBlock = this.sourceBlocksMemory[i];
            const prevClean = prevBlock ? Utils.stripHeadingMarkers(prevBlock).trim() : '';
            
            // 情况1：内容已翻译过，只是加了 #（prevClean === cleanTitle）
            // 情况2：内容有变化，需要翻译
            if (prevClean === cleanTitle.trim() && UI.getTargetBlockContent(i)) {
              // 内容没变，只是加了 #，直接给目标列加 #
              UI.syncHeadingToAllTargets(i, currentBlocks.length);
            } else {
              // 新内容或已变化，翻译后加 #
              tasks.push(this.translateBlockAsHeading(currentBlocks[i], i, currentBlocks.length, targets));
            }
            this.sourceBlocksMemory[i] = currentBlocks[i];
          } else {
            UI.updateStatus('zh-status', '🔄 流式同步中...');
            this.sourceBlocksMemory[i] = currentBlocks[i];
            tasks.push(this.translateBlock(currentBlocks[i], i, currentBlocks.length, targets));
          }
        }
      }
    }

    if (this.sourceBlocksMemory.length > currentBlocks.length) {
      this.sourceBlocksMemory = this.sourceBlocksMemory.slice(0, currentBlocks.length);
      UI.trimTargetBlocks(currentBlocks.length);
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
      UI.updateStatus('zh-status', '✓');
      setTimeout(() => UI.updateStatus('zh-status', ''), 2000);
    }

    if (forceSyncCurrentBlock) {
      UI.checkAutoPreview();
    }
  },

  // 【新增】翻译区块并在结果上加标题标记
  async translateBlockAsHeading(text, index, totalBlocks, targets) {
    const cleanText = Utils.stripHeadingMarkers(text);
    await this.translateBlock(cleanText, index, totalBlocks, targets, true);
  },

  // 【新增】专门处理段落完成时的同步 - 只翻译完成的那个区块
  async syncCompletedBlock(fullText, blockIndex) {
    const currentBlocks = fullText.split('\n\n');
    const totalBlocks = currentBlocks.length;
    const blockContent = currentBlocks[blockIndex]?.trim();
    
    if (!blockContent) return;
    
    const targets = UI.getTargetConfigs();
    // 【修复】检查是否有目标列
    if (!targets || targets.length === 0) {
      console.log('[SyncEngine] 没有目标列，跳过同步');
      return;
    }
    
    // 更新内存
    this.sourceBlocksMemory[blockIndex] = currentBlocks[blockIndex];
    
    try {
      if (Utils.isHeading(blockContent)) {
        UI.updateStatus('zh-status', '✓ 标题同步');
        const cleanTitle = Utils.stripHeadingMarkers(blockContent);
        const prevBlock = this.sourceBlocksMemory[blockIndex];
        const prevClean = prevBlock ? Utils.stripHeadingMarkers(prevBlock).trim() : '';
        
        if (prevClean === cleanTitle.trim() && UI.getTargetBlockContent(blockIndex)) {
          UI.syncHeadingToAllTargets(blockIndex, totalBlocks);
        } else {
          await this.translateBlockAsHeading(currentBlocks[blockIndex], blockIndex, totalBlocks, targets);
        }
      } else {
        UI.updateStatus('zh-status', '🔄 段落翻译中...');
        await this.translateBlock(blockContent, blockIndex, totalBlocks, targets);
      }
      UI.updateStatus('zh-status', '✓');
      setTimeout(() => UI.checkAutoPreview(), 100);
    } catch (err) {
      UI.updateStatus('zh-status', '⚠️ 错误');
      console.error('段落同步错误:', err);
    }
  },

  async translateBlock(text, index, totalBlocks, targets, asHeading = false) {
    const presets = UI.currentPresets;
    const reqKeyPrefix = `block-${index}`;
    console.log(`[SyncEngine] translateBlock: 段落 ${index + 1}, 目标列数 ${targets.length}`);

    // 【关键修复】使用 Promise.all 并行处理所有目标列
    const translationTasks = targets.map(async (target) => {
      const reqKey = `${target.id}-${reqKeyPrefix}`;
      
      // 【关键修复】先创建新的 controller，再中断旧的，避免竞态
      const newController = new AbortController();
      
      // 安全地中断旧请求
      const oldController = this.activeRequests[reqKey];
      if (oldController) {
        console.log(`[SyncEngine] 中断旧请求: ${reqKey}`);
        oldController.abort();
        // 【关键修复】等待一小段时间确保旧请求完全清理
        await new Promise(r => setTimeout(r, 50));
      }
      
      // 现在才设置新的 controller
      this.activeRequests[reqKey] = newController;

      UI.updateStatus(target.statusId, `🔄 翻译段落 ${index + 1}...`);

      try {
        // 【修复】检查预设是否存在
        const basePrompt = presets[target.style];
        if (!basePrompt) {
          console.error(`[SyncEngine] 预设不存在: ${target.style}`);
          UI.updateStatus(target.statusId, '⚠️ 预设错误');
          return;
        }
        
        const prompt = this.buildPrompt(text, target.lang, basePrompt, target.latinConfig);
        console.log(`[SyncEngine] 开始翻译: ${target.id}`);
        
        let result = await API.call(text, prompt, CONFIG.TEMPERATURE, newController.signal);
        
        console.log(`[SyncEngine] 翻译完成: ${target.id}, 结果长度 ${result.length}`);
        
        // 如果是标题，添加 # 前缀
        if (asHeading && !result.startsWith('#')) {
          result = '# ' + result;
        }
        
        UI.updateTargetBlock(target.id, index, result, totalBlocks);
        UI.updateStatus(target.statusId, '✓');
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log(`[SyncEngine] 请求被中断(正常): ${target.id}`);
        } else {
          UI.updateStatus(target.statusId, '⚠️ 错误');
          console.error(`[SyncEngine] 翻译错误 ${target.id}:`, err);
        }
      } finally {
        // 【关键修复】只删除属于自己这个请求的 controller
        if (this.activeRequests[reqKey] === newController) {
          delete this.activeRequests[reqKey];
        }
      }
    });

    await Promise.allSettled(translationTasks);
    console.log(`[SyncEngine] translateBlock 完成: 段落 ${index + 1}`);
  }
};

// ==========================================
// 5. 助教系统 (TutorSystem) - 彻底剥离重复逻辑
// ==========================================
const TutorSystem = {
  current: Store.getTutor(),
  config: Store.getTutorConfig(),
  lastRoastTime: 0,
  lastTextLength: 0,
  charsSinceLastRoast: 0,  // 【新增】累积字符计数
  slowWriterTimer: null,
  typingTimer: null,

  switch(tutorId) {
    if (!TUTORS || !TUTORS[tutorId]) return;
    this.current = tutorId;
    Store.set('current_tutor', tutorId);
    UI.updateTutorPanel(tutorId);
  },

  updateConfig(mode) {
    const settings = TUTOR_MODE_SETTINGS[mode];
    this.config = { mode, ...settings };
    Store.set('tutor_config', this.config);
  },

  // 接收由 UI 层传入的文本
  handleInput(currentText) {
    if (this.config.mode === 'manual') return;

    const currentLength = currentText.length;
    const now = Date.now();
    const charsAdded = currentLength - this.lastTextLength;
    const minutesSinceLastRoast = (now - this.lastRoastTime) / (1000 * 60);

    // 冷却期检查
    if (minutesSinceLastRoast < this.config.cooldownMinutes) {
      // 冷却期内仍然累加字符数，但不触发
      this.charsSinceLastRoast += Math.max(0, charsAdded);
      this.lastTextLength = currentLength;
      return;
    }

    // 累加字符数
    this.charsSinceLastRoast += Math.max(0, charsAdded);

    // 【修复】五种模式分别实现不同的触发逻辑
    switch (this.config.mode) {
      case 'high':
        // [高频] 紧盯你写每一个字 - 每输入一定量就准备触发
        if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0; // 重置累积计数
          }, this.config.idleThreshold);
        }
        break;

      case 'normal':
        // [正常] 段落结束吐槽
        if (this._detectParagraphEnd(currentText)) {
          this.triggerBriefRoast(currentText);
          this.charsSinceLastRoast = 0;
        } else if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          // 兜底：达到字符阈值也触发
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }, this.config.idleThreshold);
        }
        break;

      case 'low':
        // [低频] 忍无可忍才说 - 只有累积大量输入后才触发
        if (this.charsSinceLastRoast >= this.config.charThreshold && currentLength > 0) {
          clearTimeout(this.typingTimer);
          this.typingTimer = setTimeout(() => {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }, this.config.idleThreshold);
        }
        break;

      case 'slow':
        // [慢写] 吐槽你写得慢 - 停止输入一段时间后触发
        clearTimeout(this.slowWriterTimer);
        this.slowWriterTimer = setTimeout(() => {
          if (currentText.length > 0) {
            this.triggerBriefRoast(currentText);
            this.charsSinceLastRoast = 0;
          }
        }, this.config.slowWriterThreshold || 60000);
        break;
    }

    this.lastTextLength = currentLength;
  },

  // 【修复】使用 SyncEngine 共享计数器检测段落结束
  _detectParagraphEnd(text) {
    return SyncEngine.updateParagraphCount(text);
  },

  // DRY重构: 统一的底层执行逻辑
  async _executeRoast(textToAnalyze, contextPrompt, isBrief) {
    this.lastRoastTime = Date.now();
    this.charsSinceLastRoast = 0; // 触发后重置累积计数
    const tutor = TUTORS[this.current];
    
    try {
      const response = await API.call(textToAnalyze, contextPrompt, 0.8);
      if (isBrief) {
        UI.showTutorBubble(response, 'brief');
      } else {
        UI.renderFullTutorRoast(response, tutor.name);
      }
    } catch (err) {
      if (!isBrief) UI.renderTutorError();
      console.error('Roast error:', err);
    }
  },

  async triggerBriefRoast(text) {
    if (!text || text.length < 5) return;
    const latestParagraph = text.split('\n\n').pop().slice(0, 100);
    const tutor = TUTORS[this.current];
    const prompt = `${tutor.briefPrompt}\n\n用户正在写的内容："${latestParagraph}"`;
    await this._executeRoast(latestParagraph, prompt, true);
  },

  async roastManual(text) {
    const tutor = TUTORS[this.current];
    if (!text) {
      UI.renderFullTutorRoast(tutor.intro, tutor.name, true);
      return;
    }

    UI.setRoastButtonState(true);
    UI.openTutorDrawer();

    const latestParagraphs = text.split('\n\n').slice(-2).join('\n\n');
    let prompt = `${tutor.prompt}\n\n[重要：请针对用户下面的具体写作内容进行点评，引用或关联其中的具体内容。]`;
    
    await this._executeRoast(`请点评这段文字："${latestParagraphs}"`, prompt, false);
    UI.setRoastButtonState(false);
  }
};

// ==========================================
// 6. UI 与视图层 (UI)
// ==========================================
const UI = {
  targetColumns: [],
  columnCounter: 0,
  currentPresets: { ...DEFAULT_PRESETS },
  isPreviewMode: false,
  tutorBubbleTimer: null,

  init() {
    this.currentPresets = { ...DEFAULT_PRESETS, ...Store.getCustomPresets() };
    this.setTheme(Store.getTheme());

    // 初始化模型管理器
    ModelManager.init();
    const modelSelect = document.getElementById('model-select');
    const customInput = document.getElementById('custom-model-input');
    
    if (modelSelect) {
      const savedModel = localStorage.getItem('pd_selected_model');
      if (savedModel && AVAILABLE_MODELS && AVAILABLE_MODELS[savedModel]) {
        modelSelect.value = savedModel;
        // 【新增】如果是自定义模型，显示输入框
        if (savedModel === 'Custom' && customInput) {
          customInput.style.display = 'inline-block';
          const savedCustom = localStorage.getItem('pd_custom_model_id');
          if (savedCustom) customInput.value = savedCustom;
        }
      } else {
        // 【修复】同步下拉框与 ModelManager 的实际默认模型
        const currentModel = ModelManager.getCurrentModel();
        if (currentModel) {
          // 找到对应的 key
          const modelKey = Object.keys(AVAILABLE_MODELS).find(k => AVAILABLE_MODELS[k].id === currentModel.id);
          if (modelKey) modelSelect.value = modelKey;
        }
      }
    }

    // 【修复】更严格的 API_KEY 检查
    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (typeof CONFIG === 'undefined' || !CONFIG.API_KEY || invalidKeys.some(k => k && CONFIG.API_KEY.toLowerCase().includes(k.toLowerCase()))) {
      alert('[Warning] 请先在 config.js 中配置有效的 API_KEY！');
    }

    // 100% 同步初始化，data.js 已加载 TUTORS
    const tutorSelect = document.getElementById('tutor-select');
    if (tutorSelect) {
      tutorSelect.innerHTML = Utils.buildTutorOptions();
      tutorSelect.value = Store.getTutor(); 
    }
    
    const savedTutor = Store.getTutor();
    if (TUTORS[savedTutor]) TutorSystem.switch(savedTutor);
    else TutorSystem.switch(DEFAULT_TUTOR);
    
    document.getElementById('tutor-mode').value = TutorSystem.config.mode;

    this.bindEvents();
    this.addTargetColumn('English', 'game');
  },

  bindEvents() {
    const elZh = document.getElementById('editor-zh');
    // 【修复】使用 SyncEngine 共享计数器，确保 UI 和 Tutor 一致
    this._lastInputTime = 0;
    
    elZh.addEventListener('input', (e) => {
      const text = elZh.value;
      const cursorIndex = text.substring(0, elZh.selectionStart).split('\n\n').length - 1;
      const paragraphs = text.split('\n\n').filter(p => p.trim());
      const currentParagraphCount = paragraphs.length;
      const now = Date.now();
      
      this.updateStatus('zh-status', '⌨️ 输入中...');
      
      // 【并行触发方式1】停止打字防抖触发
      clearTimeout(SyncEngine.typingTimer);
      
      // 【并行触发方式2】实时段落完成触发
      // 使用 SyncEngine 共享计数器检测段落变化
      const isParagraphCompleted = SyncEngine.updateParagraphCount(text);
      
      if (isParagraphCompleted) {
        // 段落完成，立即触发翻译（不等待防抖）
        const completedBlockIndex = SyncEngine.sharedParagraphCount - 2; // 刚完成的段落索引
        if (completedBlockIndex >= 0) {
          this.updateStatus('zh-status', '[段落完成] 立即翻译...');
          // 【修复】直接同步完成的段落，而不是调用 execute 遍历所有区块
          SyncEngine.syncCompletedBlock(text, completedBlockIndex);
          // 【关键修复】段落已完成翻译，不需要再触发防抖
          return;
        }
      }
      
      // 只有段落未完成时才设置防抖定时器
      SyncEngine.typingTimer = setTimeout(() => SyncEngine.execute(text, cursorIndex, true), 1500);
      
      this._lastInputTime = now;
      TutorSystem.handleInput(text);
    });

    document.addEventListener('keydown', (e) => {
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) this.wakeUpEditors();
    });
    document.getElementById('workspace').addEventListener('click', () => this.wakeUpEditors());
    
    document.getElementById('btn-roast')?.addEventListener('click', () => {
      TutorSystem.roastManual(document.getElementById('editor-zh').value.trim());
    });
  },

  // 【修复】完全基于 data-attribute 解耦主题
  setTheme(themeName) {
    const pureThemeName = themeName.replace('theme-', '');
    document.documentElement.setAttribute('data-theme', pureThemeName);
    Store.set('pd_theme', themeName);
  },

  // 【新增】切换模型
  switchModel(modelKey) {
    if (ModelManager.switch(modelKey)) {
      const model = ModelManager.getCurrentModel();
      this.updateStatus('zh-status', `🤖 已切换: ${model.name}`);
      setTimeout(() => this.updateStatus('zh-status', ''), 2000);
    }
  },
  
  // 【新增】处理模型选择变化（包括自定义模型）
  handleModelChange(modelKey) {
    const customInput = document.getElementById('custom-model-input');
    
    if (modelKey === 'Custom') {
      // 显示自定义输入框
      if (customInput) {
        customInput.style.display = 'inline-block';
        const savedCustom = localStorage.getItem('pd_custom_model_id');
        if (savedCustom) {
          customInput.value = savedCustom;
        }
        customInput.focus();
      }
      this.switchModel('Custom');
    } else {
      // 隐藏自定义输入框
      if (customInput) {
        customInput.style.display = 'none';
      }
      this.switchModel(modelKey);
    }
  },
  
  // 【新增】设置自定义模型ID
  setCustomModel(modelId) {
    if (!modelId || !modelId.trim()) {
      alert('请输入有效的模型ID');
      return;
    }
    
    if (ModelManager.setCustomModelId(modelId.trim())) {
      this.updateStatus('zh-status', `🤖 已设置自定义模型: ${modelId.trim()}`);
      setTimeout(() => this.updateStatus('zh-status', ''), 2000);
    }
  },

  // 【修复】将助教主题类名挂载在 root，完美影响全部组件
  updateTutorPanel(tutorId) {
    const tutor = TUTORS[tutorId];
    document.getElementById('tutor-title').textContent = tutor.title;
    document.getElementById('tutor-intro').textContent = tutor.intro;
    document.getElementById('tutor-info').innerHTML = `<h3>${tutor.name}</h3><p>${tutor.desc}</p>`;
    document.getElementById('tutor-avatar-img').src = tutor.avatar;
    document.getElementById('tutor-bubble-avatar').src = tutor.avatar;
    document.getElementById('tutor-showcase-img').src = tutor.avatar;
    
    document.documentElement.setAttribute('data-tutor', tutor.themeClass);
  },

  updateStatus(elementId, text) {
    const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (el) el.textContent = text;
  },

  // 获取目标列的纯数据配置供 SyncEngine 使用
  getTargetConfigs() {
    return this.targetColumns.map(t => ({
      id: t.id,
      lang: t.langSel.value,
      style: t.styleSel.value,
      statusId: t.statusEl,
      latinConfig: {
        style: t.latinStyleSel.value,
        useMacron: t.latinMacronCb.checked
      }
    }));
  },

  addTargetColumn(defaultLang = 'English', defaultStyle = 'game') {
    this.columnCounter++;
    const colId = `target-col-${this.columnCounter}`;
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.id = colId;

    colDiv.innerHTML = `
      <div class="col-header">
        <div class="col-tools">
          <select class="lang-sel" onchange="UI.handleLangChange('${colId}')">
            ${Utils.buildLangOptions(defaultLang)}
          </select>
          <select class="style-sel">
            ${Utils.buildStyleOptions(defaultStyle, this.currentPresets, DEFAULT_PRESETS)}
          </select>
        </div>
        <div>
          <span class="status-text col-status"></span>
          <button onclick="UI.removeTargetColumn('${colId}')" style="border:none;background:transparent;color:red;cursor:pointer;font-size:16px;">[x]</button>
        </div>
      </div>
      <div class="latin-panel" id="latin-panel-${colId}">
        <strong>[SPQR] 拉丁语细分:</strong>
        <select class="latin-style-sel">
          ${LATIN_VARIANTS.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
        </select>
        <label style="cursor:pointer;"><input type="checkbox" class="latin-macron-cb" checked> 长音符号</label>
      </div>
      <textarea class="content-box target-textarea" placeholder="AI 目标输出区域..."></textarea>
      <div class="content-box preview-box target-preview" style="display:none;"></div>
    `;

    document.getElementById('workspace').appendChild(colDiv);

    const target = {
      id: colId,
      langSel: colDiv.querySelector('.lang-sel'),
      styleSel: colDiv.querySelector('.style-sel'),
      latinPanel: colDiv.querySelector(`#latin-panel-${colId}`),
      latinStyleSel: colDiv.querySelector('.latin-style-sel'),
      latinMacronCb: colDiv.querySelector('.latin-macron-cb'),
      textArea: colDiv.querySelector('.target-textarea'),
      previewArea: colDiv.querySelector('.target-preview'),
      statusEl: colDiv.querySelector('.col-status'),
      memoryBlocks: []
    };

    target.textArea.addEventListener('input', Utils.debounce(() => this.handleInverseSync(target), 1500));
    this.targetColumns.push(target);
    this.handleLangChange(colId);
  },

  removeTargetColumn(colId) {
    document.getElementById(colId)?.remove();
    this.targetColumns = this.targetColumns.filter(c => c.id !== colId);
  },

  handleLangChange(colId) {
    const target = this.targetColumns.find(c => c.id === colId);
    if (target) {
      target.latinPanel.style.display = target.langSel.value === 'Latin' ? 'flex' : 'none';
    }
  },

  // 接收外部传来的翻译结果并更新视图
  updateTargetBlock(targetId, index, content, totalLength) {
    const target = this.targetColumns.find(c => c.id === targetId);
    if (!target) return;
    target.memoryBlocks[index] = content;
    target.memoryBlocks = target.memoryBlocks.slice(0, totalLength);
    target.textArea.value = target.memoryBlocks.join('\n\n');
  },

  syncTextToAllTargets(text, index, totalLength) {
    this.targetColumns.forEach(target => {
      this.updateTargetBlock(target.id, index, text, totalLength);
      this.updateStatus(target.statusEl, '[OK]');
      setTimeout(() => this.updateStatus(target.statusEl, ''), 2000);
    });
  },

  // 【新增】获取目标列某区块的内容（用于检测是否已翻译）
  // 【修复】遍历所有列，返回第一个有内容的，避免第一列被删除时出错
  getTargetBlockContent(index) {
    for (const target of this.targetColumns) {
      if (target && target.memoryBlocks[index]) {
        return target.memoryBlocks[index];
      }
    }
    return null;
  },

  // 【新增】给目标列对应位置添加标题标记 #
  syncHeadingToAllTargets(index, totalLength) {
    this.targetColumns.forEach(target => {
      const existing = target.memoryBlocks[index] || '';
      if (existing && !existing.startsWith('#')) {
        this.updateTargetBlock(target.id, index, '# ' + existing, totalLength);
      }
      this.updateStatus(target.statusEl, '✓ 标题');
      setTimeout(() => this.updateStatus(target.statusEl, ''), 2000);
    });
  },

  trimTargetBlocks(newLength) {
    this.targetColumns.forEach(target => {
      target.memoryBlocks = target.memoryBlocks.slice(0, newLength);
      target.textArea.value = target.memoryBlocks.join('\n\n');
    });
  },

  async handleInverseSync(target) {
    this.updateStatus(target.statusEl, '🔄 逆向同步中...');
    this.updateStatus('zh-status', '🔄 被逆向覆盖中...');
    try {
      const prompt = `You are a translator. Translate the following ${target.langSel.value} text back to Simplified Chinese. Output ONLY the translation. Preserve Markdown perfectly.`;
      const result = await API.call(target.textArea.value, prompt, 0.2);

      document.getElementById('editor-zh').value = result;
      SyncEngine.sourceBlocksMemory = result.split('\n\n');
      target.memoryBlocks = target.textArea.value.split('\n\n');

      this.updateStatus(target.statusEl, '✓ 已反推');
      this.updateStatus('zh-status', '✓ 原文已更新');
    } catch (err) {
      this.updateStatus(target.statusEl, '[Error]');
    }
  },

  showTutorBubble(content, mode = 'full') {
    const bubble = document.getElementById('tutor-bubble');
    const contentDiv = document.getElementById('tutor-bubble-content');
    const tutor = TUTORS[TutorSystem.current];
    document.getElementById('tutor-bubble-name').textContent = tutor.name;
    
    if (mode === 'brief') {
      contentDiv.innerHTML = `<span style="font-style:italic;">${Utils.escapeHTML(content)}</span>`;
      bubble.style.maxWidth = '280px';
    } else {
      // XSS防护：先转义HTML，再用marked解析（marked也会处理但双重保险）
      const safeContent = Utils.escapeHTML(content);
      contentDiv.innerHTML = marked.parse(safeContent);
      bubble.style.maxWidth = '380px';
    }
    
    bubble.style.display = 'block';
    bubble.classList.add('show');
    
    clearTimeout(this.tutorBubbleTimer);
    this.tutorBubbleTimer = setTimeout(() => {
      bubble.classList.remove('show');
      setTimeout(() => bubble.style.display = 'none', 300);
    }, mode === 'brief' ? 6000 : 15000);
  },

  closeTutorBubble() {
    const bubble = document.getElementById('tutor-bubble');
    bubble.classList.remove('show');
    setTimeout(() => bubble.style.display = 'none', 300);
  },

  renderFullTutorRoast(htmlContent, tutorName, isPlain = false) {
    // XSS防护：始终对内容进行转义
    const output = isPlain ? `<div style="color:var(--tutor-primary);font-weight:bold;">${Utils.escapeHTML(htmlContent)}</div>` 
                           : marked.parse(Utils.escapeHTML(htmlContent));
    document.getElementById('tutor-chat').innerHTML = `
      <div style="margin-bottom:15px;padding-bottom:15px;border-bottom:1px dashed var(--border-color);">
        <div style="font-size:12px;opacity:0.6;margin-bottom:10px;">${Utils.escapeHTML(tutorName)} 的点评：</div>
        ${output}
      </div>
    `;
  },

  renderTutorError() {
    document.getElementById('tutor-chat').innerHTML = '<div style="color:red;">[Error] 助教暂时无法回应，请稍后再试。</div>';
  },

  setRoastButtonState(isLoading) {
    const btn = document.getElementById('btn-roast');
    btn.textContent = isLoading ? '[...] 思考中...' : '[剑] 吐槽我的文本！';
    btn.disabled = isLoading;
  },

  toggleGlobalPreview() {
    this.isPreviewMode = !this.isPreviewMode;
    this._applyPreviewMode();
  },

  // 【修复】抽离状态应用逻辑，统一处理预览/编辑切换
  _applyPreviewMode() {
    const elZh = document.getElementById('editor-zh');
    const pZh = document.getElementById('preview-zh');

    if (this.isPreviewMode) {
      // 切换到预览模式
      pZh.innerHTML = marked.parse(Utils.escapeHTML(elZh.value));
      elZh.style.display = 'none';
      pZh.style.display = 'block';

      this.targetColumns.forEach(t => {
        t.previewArea.innerHTML = marked.parse(Utils.escapeHTML(t.textArea.value));
        t.textArea.style.display = 'none';
        t.previewArea.style.display = 'block';
      });
      document.getElementById('btn-preview').textContent = '[编辑] 返回编辑';
    } else {
      // 切换到编辑模式
      elZh.style.display = 'block';
      pZh.style.display = 'none';
      this.targetColumns.forEach(t => {
        t.textArea.style.display = 'block';
        t.previewArea.style.display = 'none';
      });
      document.getElementById('btn-preview').textContent = '[预览] 全局排版';
    }
  },

  wakeUpEditors() {
    if (!this.isPreviewMode) return;
    this.isPreviewMode = false;
    this._applyPreviewMode();
  },

  // 【恢复】3秒自动沉浸预览
  checkAutoPreview() {
    if (!document.getElementById('auto-preview-toggle')?.checked) return;
    clearTimeout(SyncEngine.autoPreviewTimer);
    // 如果 3 秒后还没人动键盘，就自动切换到排版预览
    SyncEngine.autoPreviewTimer = setTimeout(() => {
      if (!this.isPreviewMode) this.toggleGlobalPreview();
    }, 3000);
  },

  toggleTutorDrawer() { document.getElementById('tutor-drawer').classList.toggle('open'); },
  openTutorDrawer() { document.getElementById('tutor-drawer').classList.add('open'); },
  
  saveNewPreset() {
    const name = Utils.escapeHTML(document.getElementById('new-preset-name').value.trim());
    const prompt = document.getElementById('new-preset-prompt').value.trim();

    if (!name || !prompt) return alert('名称和提示词不能为空！');
    if (!prompt.includes('{{lang}}')) return alert('提示词中必须包含 {{lang}} 占位符！');

    this.currentPresets[name] = prompt;
    const customOnly = {};
    for (const k in this.currentPresets) {
      if (!DEFAULT_PRESETS[k]) customOnly[k] = this.currentPresets[k];
    }
    Store.set('pd_custom_presets', customOnly);

    this.targetColumns.forEach(target => {
      target.styleSel.innerHTML = Utils.buildStyleOptions(target.styleSel.value, this.currentPresets, DEFAULT_PRESETS);
    });
    document.getElementById('preset-modal').style.display = 'none';
    alert(`预设 "${name}" 添加成功！`);
  },

  importTerms(file) {
    // 【修复】添加文件大小限制（最大 500KB）
    const MAX_FILE_SIZE = 500 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert(`[错误] 文件过大 (${(file.size/1024).toFixed(1)}KB)，请限制在 500KB 以内`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const terms = [];
      const lines = e.target.result.replace(/\r\n/g, '\n').split('\n');
      // 【修复】限制最大行数，防止内存溢出
      const MAX_LINES = 10000;
      const processLines = lines.slice(0, MAX_LINES);
      
      for (const line of processLines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          terms.push({ src: parts[0].trim(), tgt: parts[1].trim() });
        }
      }
      Store.termsList = terms; // 安全存储，不污染 global window
      const warning = lines.length > MAX_LINES ? ` (截断，仅前 ${MAX_LINES} 行)` : '';
      this.updateStatus('term-status', `📚 已挂载 ${terms.length} 术语${warning}`);
    };
    reader.onerror = () => {
      this.updateStatus('term-status', '⚠️ 文件读取失败');
    };
    reader.readAsText(file, 'UTF-8');
  }
};

// ==========================================
// 7. 应用入口
// ==========================================
const App = {
  init() {
    UI.init();
    document.getElementById('csv-upload')?.addEventListener('change', (e) => {
      if (e.target.files[0]) UI.importTerms(e.target.files[0]);
    });
  }
};

// 【修复】页面卸载时清理进行中的请求，避免内存泄漏
window.addEventListener('beforeunload', () => {
  console.log('[App] 页面卸载，清理进行中的请求...');
  Object.values(SyncEngine.activeRequests).forEach(controller => {
    try { controller.abort(); } catch (e) {}
  });
});

document.addEventListener('DOMContentLoaded', () => App.init());