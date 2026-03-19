/**
 * ==========================================
 * UI 管理器 (UI Manager)
 * ==========================================
 * UI 主控制器，协调所有组件
 */

import { Utils } from '../core/utils.js';
import { Store } from '../core/store.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { ModelManager } from '../services/model-manager.js';
import { SyncEngine } from '../services/sync-engine.js';
import { TutorSystem } from '../features/tutor-system.js';
import { TUTORS } from '../data/tutors.js';
import { DEFAULT_PRESETS, SUPPORTED_LANGUAGES } from '../data/constants.js';

export const UI = {
  targetColumns: [],
  columnCounter: 0,
  currentPresets: { ...DEFAULT_PRESETS },
  isPreviewMode: false,
  tutorBubbleTimer: null,
  autoPreviewTimer: null,
  _lastInputTime: 0,

  getAvailableModels() {
    return window.AVAILABLE_MODELS || AVAILABLE_MODELS || {};
  },

  getConfig() {
    return window.CONFIG || CONFIG || {};
  },

  init() {
    this.currentPresets = { ...DEFAULT_PRESETS, ...Store.getCustomPresets() };
    
    const savedTheme = Store.getTheme();
    this.updateThemeSelection(savedTheme);
    this.setTheme(savedTheme);

    ModelManager.init();
    const models = this.getAvailableModels();
    
    const savedModel = localStorage.getItem('pd_selected_model') || 'Qwen2.5-7B';
    this.updateModelSelection(savedModel);

    const config = this.getConfig();
    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (!config.API_KEY || invalidKeys.some(k => k && config.API_KEY.toLowerCase().includes(k.toLowerCase()))) {
      this.showWelcomeTip();
    }

    const tutorSelect = document.getElementById('tutor-select');
    if (tutorSelect) {
      tutorSelect.innerHTML = Utils.buildTutorOptions(TUTORS);
      const savedTutor = Store.getTutor() || 'random';
      tutorSelect.value = savedTutor; 
    }
    
    document.getElementById('tutor-mode').value = TutorSystem.config.mode;

    const previewToggleBtn = document.getElementById('preview-toggle-btn');
    if (previewToggleBtn && Store.getAutoPreview()) {
      previewToggleBtn.classList.add('active');
    }

    this.bindEvents();
    
    const savedColumns = Store.getTargetColumns();
    if (savedColumns.length > 0) {
      savedColumns.forEach(col => {
        this.addTargetColumn(col.lang, col.style, col.content);
      });
    } else {
      this.addTargetColumn('English', 'concise');
    }
    
    const savedSourceText = Store.getSourceText();
    if (savedSourceText) {
      document.getElementById('editor-zh').value = savedSourceText;
    }
    
    this.subscribeToEvents();
    
    const savedTutor = Store.getTutor() || 'random';
    TutorSystem.switch(savedTutor);
  },

  bindEvents() {
    const elZh = document.getElementById('editor-zh');
    const csvUpload = document.getElementById('csv-upload');
    
    if (csvUpload) {
      csvUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const text = event.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            Store.termsList = lines.map(line => {
              const [src, tgt] = line.split(',').map(s => s.trim());
              return { src, tgt };
            }).filter(t => t.src && t.tgt);
            
            const termBtn = document.getElementById('term-btn');
            if (termBtn) {
              termBtn.classList.add('loaded');
            }
            
            this.updateStatus('zh-status', `📖 已加载 ${Store.termsList.length} 条术语`);
            setTimeout(() => this.updateStatus('zh-status', ''), 2000);
          } catch (err) {
            alert('术语库解析失败，请检查CSV格式');
          }
        };
        reader.readAsText(file);
      });
    }
    
    elZh.addEventListener('input', (e) => {
      const text = elZh.value;
      const cursorIndex = text.substring(0, elZh.selectionStart).split('\n\n').length - 1;
      
      this.updateStatus('zh-status', '⌨️ 输入中...');
      
      clearTimeout(SyncEngine.typingTimer);
      clearTimeout(this.autoPreviewTimer);
      
      if (this.isPreviewMode && Store.getAutoPreview()) {
        this.exitPreviewMode();
      }
      
      const isParagraphCompleted = SyncEngine.updateParagraphCount(text);
      
      if (isParagraphCompleted) {
        const completedBlockIndex = SyncEngine.sharedParagraphCount - 2;
        if (completedBlockIndex >= 0) {
          const blocks = text.split('\n\n');
          if (blocks[completedBlockIndex]?.trim()) {
            this.updateStatus('zh-status', '🔄 段落翻译中...');
            SyncEngine.syncCompletedBlock(text, completedBlockIndex, 
              () => this.getTargetConfigs(), 
              this.getUICallbacks()
            );
            this.scheduleAutoPreview();
            this.saveCurrentState();
            return;
          }
        }
      }
      
      SyncEngine.typingTimer = setTimeout(() => {
        SyncEngine.execute(text, cursorIndex, true, 
          () => this.getTargetConfigs(), 
          this.getUICallbacks()
        );
        this.scheduleAutoPreview();
        this.saveCurrentState();
      }, 1500);
      
      this._lastInputTime = Date.now();
      TutorSystem.handleInput(text);
    });

    elZh.addEventListener('click', () => {
      if (this.isPreviewMode) {
        this.exitPreviewMode();
      }
    });

    this.setupEditorKeyboardShortcuts(elZh);

    document.addEventListener('keydown', (e) => {
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) this.wakeUpEditors();
    });
    document.getElementById('workspace').addEventListener('click', () => this.wakeUpEditors());
    
    document.getElementById('btn-roast')?.addEventListener('click', () => {
      TutorSystem.roastManual(document.getElementById('editor-zh').value.trim());
    });
  },

  setupEditorKeyboardShortcuts(textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'a':
            e.stopPropagation();
            return;
          case 'z':
            e.stopPropagation();
            return;
          case 'y':
            e.preventDefault();
            e.stopPropagation();
            document.execCommand('redo');
            return;
        }
      }
    });
  },

  scheduleAutoPreview() {
    if (!Store.getAutoPreview()) return;
    
    clearTimeout(this.autoPreviewTimer);
    this.autoPreviewTimer = setTimeout(() => {
      if (Store.getAutoPreview() && !this.isPreviewMode) {
        this.enterPreviewMode();
      }
    }, 3000);
  },

  enterPreviewMode() {
    this.isPreviewMode = true;
    
    const editors = document.querySelectorAll('.target-textarea, #editor-zh');
    const previews = document.querySelectorAll('.target-preview, #preview-zh');
    
    editors.forEach(editor => {
      editor.classList.add('fade-out');
      setTimeout(() => {
        editor.style.display = 'none';
        editor.classList.remove('fade-out');
      }, 300);
    });
    
    previews.forEach(preview => {
      preview.style.display = 'block';
      preview.classList.add('fade-out');
      preview.style.cursor = 'text';
      const textarea = preview.previousElementSibling;
      if (textarea && textarea.tagName === 'TEXTAREA') {
        preview.innerHTML = marked.parse(textarea.value);
      }
      preview.onclick = () => {
        this.exitPreviewMode();
        const textarea = preview.previousElementSibling;
        if (textarea && textarea.tagName === 'TEXTAREA') {
          textarea.focus();
        }
      };
      setTimeout(() => {
        preview.classList.remove('fade-out');
        preview.classList.add('fade-in');
      }, 50);
    });
    
    const zhEditor = document.getElementById('editor-zh');
    const zhPreview = document.getElementById('preview-zh');
    if (zhEditor && zhPreview) {
      zhPreview.innerHTML = marked.parse(zhEditor.value);
    }
  },

  exitPreviewMode() {
    this.isPreviewMode = false;
    
    const editors = document.querySelectorAll('.target-textarea, #editor-zh');
    const previews = document.querySelectorAll('.target-preview, #preview-zh');
    
    previews.forEach(preview => {
      preview.classList.add('fade-out');
      setTimeout(() => {
        preview.style.display = 'none';
        preview.classList.remove('fade-out', 'fade-in');
        preview.onclick = null;
      }, 300);
    });
    
    editors.forEach(editor => {
      editor.style.display = 'block';
      editor.classList.add('fade-out');
      setTimeout(() => {
        editor.classList.remove('fade-out');
        editor.classList.add('fade-in');
        setTimeout(() => editor.classList.remove('fade-in'), 300);
      }, 50);
    });
  },

  subscribeToEvents() {
    eventBus.on(EVENTS.TUTOR_ROAST, ({ message, tutorId, isBrief, isIntro }) => {
      if (TutorSystem.isRandomMode) {
        this.updateTutorPanel(tutorId);
      }
      
      if (isBrief) {
        this.showTutorBubble(message, 'brief', tutorId);
      } else {
        const tutor = TUTORS[tutorId];
        this.renderFullTutorRoast(message, tutor.name, isIntro, tutorId);
      }
    });

    eventBus.on(EVENTS.TUTOR_ERROR, ({ error, isBrief }) => {
      if (!isBrief) this.renderTutorError();
    });

    eventBus.on(EVENTS.TUTOR_SWITCHED, ({ tutorId }) => {
      this.updateTutorPanel(tutorId);
    });
  },

  getThemeDisplayName(themeKey) {
    const themeNames = {
      'theme-apple': '⬜ Apple极简',
      'theme-dark': '⬛ 暗黑模式',
      'theme-eyecare': '🟩 护眼模式',
      'theme-roman': '🟥 罗马古典'
    };
    return themeNames[themeKey] || themeKey;
  },
  
  selectTheme(element, themeKey) {
    const allOptions = document.querySelectorAll('.theme-option');
    allOptions.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
      themeLabel.textContent = this.getThemeDisplayName(themeKey);
    }
    
    this.setTheme(themeKey);
  },
  
  updateThemeSelection(themeKey) {
    const allOptions = document.querySelectorAll('.theme-option');
    allOptions.forEach(opt => {
      if (opt.dataset.theme === themeKey) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
    
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) {
      themeLabel.textContent = this.getThemeDisplayName(themeKey);
    }
  },
  
  setTheme(themeName) {
    const pureThemeName = themeName.replace('theme-', '');
    document.documentElement.setAttribute('data-theme', pureThemeName);
    Store.set('pd_theme', themeName);
    eventBus.emit(EVENTS.UI_THEME_CHANGED, { theme: themeName });
  },

  switchModel(modelKey) {
    if (ModelManager.switch(modelKey)) {
      const model = ModelManager.getCurrentModel();
      this.updateStatus('zh-status', `🤖 已切换: ${model.name}`);
      setTimeout(() => this.updateStatus('zh-status', ''), 2000);
      eventBus.emit(EVENTS.UI_MODEL_CHANGED, { modelKey, model });
    }
  },
  
  getModelDisplayName(modelKey) {
    const modelNames = {
      'Qwen2.5-7B': '🆓 Qwen2.5-7B',
      'Qwen3.5-4B': '⚡ Qwen3.5-4B',
      'Qwen3.5-9B': '⚖️ Qwen3.5-9B',
      'Qwen3.5-35B-A3B': '🎯 Qwen3.5-35B',
      'Custom': '✏️ 自定模型'
    };
    return modelNames[modelKey] || modelKey;
  },
  
  selectModel(element, modelKey) {
    const allOptions = document.querySelectorAll('.model-option');
    allOptions.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    
    const modelLabel = document.getElementById('model-label');
    if (modelLabel) {
      modelLabel.textContent = this.getModelDisplayName(modelKey);
    }
    
    this.handleModelChange(modelKey);
  },
  
  updateModelSelection(modelKey) {
    const allOptions = document.querySelectorAll('.model-option');
    allOptions.forEach(opt => {
      if (opt.dataset.model === modelKey) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
    
    const modelLabel = document.getElementById('model-label');
    if (modelLabel) {
      if (modelKey === 'Custom') {
        const customModelId = localStorage.getItem('pd_custom_model_id');
        modelLabel.textContent = customModelId ? `✏️ ${customModelId}` : '✏️ 自定模型';
      } else {
        modelLabel.textContent = this.getModelDisplayName(modelKey);
      }
    }
  },
  
  handleModelChange(modelKey) {
    const customConfig = document.getElementById('custom-model-config');
    
    if (modelKey === 'Custom') {
      if (customConfig) {
        customConfig.style.display = 'flex';
        customConfig.style.flexDirection = 'column';
        customConfig.style.gap = 'var(--space-2)';
        
        const savedId = localStorage.getItem('pd_custom_model_id') || '';
        const savedUrl = localStorage.getItem('pd_custom_model_url') || '';
        const savedKey = localStorage.getItem('pd_custom_model_key') || '';
        
        document.getElementById('custom-model-id').value = savedId;
        document.getElementById('custom-model-url').value = savedUrl;
        document.getElementById('custom-model-key').value = savedKey;
        
        document.getElementById('custom-model-id').focus();
      }
      this.switchModel('Custom');
    } else {
      if (customConfig) {
        customConfig.style.display = 'none';
      }
      this.switchModel(modelKey);
    }
  },
  
  saveCustomModelConfig() {
    const modelId = document.getElementById('custom-model-id').value.trim();
    const modelUrl = document.getElementById('custom-model-url').value.trim();
    const modelKey = document.getElementById('custom-model-key').value.trim();
    
    if (!modelId) {
      alert('请输入模型ID');
      return;
    }
    
    localStorage.setItem('pd_custom_model_id', modelId);
    if (modelUrl) localStorage.setItem('pd_custom_model_url', modelUrl);
    if (modelKey) localStorage.setItem('pd_custom_model_key', modelKey);
    
    if (ModelManager.setCustomModelId(modelId)) {
      if (modelUrl) ModelManager.setCustomModelUrl(modelUrl);
      if (modelKey) ModelManager.setCustomModelKey(modelKey);
      
      const modelLabel = document.getElementById('model-label');
      if (modelLabel) {
        modelLabel.textContent = `✏️ ${modelId}`;
      }
      
      this.updateStatus('zh-status', `🤖 已设置自定模型: ${modelId}`);
      setTimeout(() => this.updateStatus('zh-status', ''), 2000);
    }
  },
  
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

  updateTutorPanel(tutorId) {
    const actualTutorId = tutorId === 'random' ? TutorSystem.current : tutorId;
    const tutor = TUTORS[actualTutorId];
    if (!tutor) return;
    
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
    if (!el) return;
    
    const isLoading = text.includes('🔄') || text.includes('翻译中') || text.includes('同步中');
    
    if (isLoading) {
      el.innerHTML = `<span class="status-loading">${text}</span>`;
    } else {
      el.textContent = text;
      el.classList.remove('status-loading');
    }
  },

  getTargetConfigs() {
    return this.targetColumns.map(t => ({
      id: t.id,
      lang: t.langSel.value,
      style: t.styleSel.value,
      statusId: t.statusEl
    }));
  },

  getUICallbacks() {
    return {
      updateStatus: (id, text) => this.updateStatus(id, text),
      updateTargetBlock: (targetId, index, content, totalBlocks) => this.updateTargetBlock(targetId, index, content, totalBlocks),
      getTargetBlockContent: (index) => this.getTargetBlockContent(index),
      syncHeadingToAllTargets: (index, totalBlocks) => this.syncHeadingToAllTargets(index, totalBlocks),
      trimTargetBlocks: (length) => this.trimTargetBlocks(length),
      deleteTargetBlocks: (indices) => this.deleteTargetBlocks(indices),
      checkAutoPreview: () => this.checkAutoPreview(),
      getPreset: (style) => this.currentPresets[style] || DEFAULT_PRESETS.concise
    };
  },

  updateTargetBlock(targetId, index, content, totalBlocks) {
    const col = this.targetColumns.find(c => c.id === targetId);
    if (!col) return;
    
    const blocks = col.editor.value.split('\n\n');
    blocks[index] = content;
    
    while (blocks.length < totalBlocks) {
      blocks.push('');
    }
    
    col.editor.value = blocks.join('\n\n');
  },

  getTargetBlockContent(index) {
    const results = [];
    for (const col of this.targetColumns) {
      const blocks = col.editor.value.split('\n\n');
      results.push(blocks[index] || '');
    }
    return results;
  },

  syncHeadingToAllTargets(index, totalBlocks) {
    const zhEditor = document.getElementById('editor-zh');
    const zhBlocks = zhEditor.value.split('\n\n');
    const headingPrefix = zhBlocks[index]?.match(/^(#{1,6}\s+)/)?.[1] || '# ';
    
    for (const col of this.targetColumns) {
      const blocks = col.editor.value.split('\n\n');
      if (blocks[index] && !blocks[index].startsWith('#')) {
        blocks[index] = headingPrefix + blocks[index];
        col.editor.value = blocks.join('\n\n');
      }
    }
  },

  trimTargetBlocks(length) {
    for (const col of this.targetColumns) {
      const blocks = col.editor.value.split('\n\n');
      if (blocks.length > length) {
        col.editor.value = blocks.slice(0, length).join('\n\n');
      }
    }
  },

  deleteTargetBlocks(indices) {
    if (!indices || indices.length === 0) return;
    
    for (const col of this.targetColumns) {
      const blocks = col.editor.value.split('\n\n');
      const newBlocks = blocks.filter((_, i) => !indices.includes(i));
      col.editor.value = newBlocks.join('\n\n');
    }
    
    for (const idx of indices.sort((a, b) => a - b)) {
      if (idx < SyncEngine.sourceBlocksMemory.length) {
        SyncEngine.sourceBlocksMemory.splice(idx, 1);
      }
    }
  },

  checkAutoPreview() {
    if (Store.getAutoPreview() && !this.isPreviewMode) {
      this.enterPreviewMode();
    }
  },

  showWelcomeTip() {
    const savedKey = localStorage.getItem('pd_custom_api_key') || '';
    const savedUrl = localStorage.getItem('pd_custom_api_url') || 'https://api.siliconflow.cn/v1/chat/completions';
    
    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    const hasValidKey = savedKey && !invalidKeys.some(k => k && savedKey.toLowerCase().includes(k.toLowerCase()));
    
    if (hasValidKey) return;
    
    const tip = document.createElement('div');
    tip.id = 'welcome-tip';
    tip.innerHTML = `
      <div class="welcome-tip-content" style="max-width: 420px;">
        <div class="welcome-tip-header">
          <span>👋 欢迎使用 Co-creator</span>
          <button class="welcome-tip-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="welcome-tip-body">
          <p>使用前需要配置 <strong>API Key</strong>。</p>
          <p>推荐 <a href="https://cloud.siliconflow.cn" target="_blank" style="color: var(--accent-color);">SiliconFlow</a>，注册即送免费额度。</p>
          <div style="margin-top: 12px;">
            <label style="font-size: 12px; opacity: 0.8; display: block; margin-bottom: 4px;">API Key</label>
            <input type="text" id="welcome-api-key" value="${savedKey}" placeholder="sk-..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); font-size: 13px; box-sizing: border-box;">
          </div>
          <div style="margin-top: 10px;">
            <label style="font-size: 12px; opacity: 0.8; display: block; margin-bottom: 4px;">API URL</label>
            <input type="text" id="welcome-api-url" value="${savedUrl}" placeholder="https://api.siliconflow.cn/v1/chat/completions" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); font-size: 13px; box-sizing: border-box;">
          </div>
        </div>
        <div class="welcome-tip-footer">
          <button class="welcome-tip-btn secondary" onclick="this.parentElement.parentElement.parentElement.remove();">稍后配置</button>
          <button class="welcome-tip-btn primary" onclick="UI.saveWelcomeConfig();">保存并开始</button>
        </div>
      </div>
    `;
    document.body.appendChild(tip);
  },
  
  saveWelcomeConfig() {
    const apiKey = document.getElementById('welcome-api-key')?.value?.trim();
    const apiUrl = document.getElementById('welcome-api-url')?.value?.trim();
    
    if (apiKey) {
      localStorage.setItem('pd_custom_api_key', apiKey);
    }
    if (apiUrl) {
      localStorage.setItem('pd_custom_api_url', apiUrl);
    }
    
    const tip = document.getElementById('welcome-tip');
    if (tip) {
      tip.remove();
    }
    
    const modelBtn = document.getElementById('model-btn');
    if (modelBtn) {
      modelBtn.textContent = 'Qwen2.5-7B';
    }
  },

  toggleAutoPreview() {
    const isActive = !Store.getAutoPreview();
    Store.saveAutoPreview(isActive);
    
    const btn = document.getElementById('preview-toggle-btn');
    if (btn) {
      if (isActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
        if (this.isPreviewMode) {
          this.exitPreviewMode();
        }
      }
    }
  },

  showTutorBubble(content, mode = 'full', tutorId = null) {
    const bubble = document.getElementById('tutor-bubble');
    const contentDiv = document.getElementById('tutor-bubble-content');
    const actualTutorId = tutorId || TutorSystem.current;
    const tutor = TUTORS[actualTutorId];
    
    document.getElementById('tutor-bubble-name').textContent = tutor.name;
    const bubbleAvatar = document.getElementById('tutor-bubble-avatar');
    if (bubbleAvatar) {
      bubbleAvatar.src = tutor.avatar;
    }
    
    if (mode === 'brief') {
      contentDiv.innerHTML = `<span style="font-style:italic;">${Utils.escapeHTML(content)}</span>`;
      bubble.style.maxWidth = '280px';
    } else {
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
    }, 5000);
  },

  closeTutorBubble() {
    const bubble = document.getElementById('tutor-bubble');
    bubble.classList.remove('show');
    setTimeout(() => bubble.style.display = 'none', 300);
  },

  renderFullTutorRoast(htmlContent, tutorName, isPlain = false, tutorId = null) {
    const output = isPlain ? `<div style="color:var(--tutor-primary);font-weight:bold;">${Utils.escapeHTML(htmlContent)}</div>` 
                           : marked.parse(Utils.escapeHTML(htmlContent));
    document.getElementById('tutor-chat').innerHTML = `
      <div style="margin-bottom:15px;padding-bottom:15px;border-bottom:1px dashed var(--border-color);">
        <div style="font-size:12px;opacity:0.6;margin-bottom:10px;">${Utils.escapeHTML(tutorName)} 的点评：</div>
        ${output}
      </div>
    `;
    
    if (tutorId) {
      const tutor = TUTORS[tutorId];
      const showcaseImg = document.getElementById('tutor-showcase-img');
      if (showcaseImg && tutor) {
        showcaseImg.src = tutor.avatar;
      }
    }
  },

  renderTutorError() {
    document.getElementById('tutor-chat').innerHTML = '<div style="color:red;">[Error] 助教暂时无法回应，请稍后再试。</div>';
  },

  wakeUpEditors() {
    // Placeholder for editor wake-up logic
  },

  addTargetColumn(defaultLang = 'English', defaultStyle = 'concise', savedContent = '') {
    this.columnCounter++;
    const colId = `target-col-${this.columnCounter}`;
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.id = colId;
    colDiv.draggable = true;
    colDiv.dataset.colId = colId;

    colDiv.innerHTML = `
      <div class="col-header">
        <div class="col-tools">
          <span class="drag-handle">⋮⋮</span>
          <select class="col-select lang-sel">
            ${Utils.buildLangOptions(defaultLang, SUPPORTED_LANGUAGES)}
          </select>
          <select class="col-select style-sel">
            ${Utils.buildStyleOptions(defaultStyle, this.currentPresets, DEFAULT_PRESETS)}
          </select>
        </div>
        <button class="col-close-btn" title="关闭目标栏">✕</button>
        <span class="col-status-placeholder"></span>
      </div>
      <textarea class="content-box target-textarea" placeholder="AI 目标输出区域...">${savedContent}</textarea>
      <div class="content-box preview-box target-preview" style="display:none;"></div>
    `;

    document.getElementById('workspace').appendChild(colDiv);

    const target = {
      id: colId,
      langSel: colDiv.querySelector('.lang-sel'),
      styleSel: colDiv.querySelector('.style-sel'),
      editor: colDiv.querySelector('.target-textarea'),
      previewArea: colDiv.querySelector('.target-preview'),
      statusEl: colDiv.querySelector('.col-status'),
      memoryBlocks: []
    };

    target.langSel.addEventListener('change', () => this.saveCurrentState());
    target.styleSel.addEventListener('change', () => this.saveCurrentState());
    colDiv.querySelector('.col-close-btn').addEventListener('click', () => this.removeTargetColumn(colId));
    target.editor.addEventListener('input', Utils.debounce(() => {
      this.handleInverseSync(target);
      this.saveCurrentState();
    }, 1500));
    
    target.editor.addEventListener('click', () => {
      if (this.isPreviewMode) {
        this.exitPreviewMode();
      }
    });
    
    this.setupEditorKeyboardShortcuts(target.editor);
    this.setupColumnDragDrop(colDiv);
    
    this.targetColumns.push(target);
    this.saveCurrentState();
  },

  setupColumnDragDrop(colDiv) {
    colDiv.addEventListener('dragstart', (e) => {
      colDiv.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', colDiv.id);
    });
    
    colDiv.addEventListener('dragend', () => {
      colDiv.classList.remove('dragging');
      document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
      });
      this.syncColumnOrder();
    });
    
    colDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragging = document.querySelector('.dragging');
      if (dragging && dragging !== colDiv) {
        colDiv.classList.add('drag-over');
      }
    });
    
    colDiv.addEventListener('dragleave', () => {
      colDiv.classList.remove('drag-over');
    });
    
    colDiv.addEventListener('drop', (e) => {
      e.preventDefault();
      colDiv.classList.remove('drag-over');
      
      const draggingId = e.dataTransfer.getData('text/plain');
      const draggingEl = document.getElementById(draggingId);
      
      if (draggingEl && draggingEl !== colDiv) {
        const workspace = document.getElementById('workspace');
        const allColumns = [...workspace.querySelectorAll('.column')];
        const draggingIndex = allColumns.indexOf(draggingEl);
        const targetIndex = allColumns.indexOf(colDiv);
        
        if (draggingIndex < targetIndex) {
          colDiv.after(draggingEl);
        } else {
          colDiv.before(draggingEl);
        }
        
        this.syncColumnOrder();
      }
    });
  },

  syncColumnOrder() {
    const workspace = document.getElementById('workspace');
    const columnEls = [...workspace.querySelectorAll('.column')];
    const newOrder = [];
    
    columnEls.forEach(el => {
      const colId = el.id;
      const col = this.targetColumns.find(c => c.id === colId);
      if (col) {
        newOrder.push(col);
      }
    });
    
    this.targetColumns = newOrder;
    this.saveCurrentState();
  },

  removeTargetColumn(colId) {
    document.getElementById(colId)?.remove();
    this.targetColumns = this.targetColumns.filter(c => c.id !== colId);
    this.saveCurrentState();
  },

  saveCurrentState() {
    const columns = this.targetColumns.map(col => ({
      lang: col.langSel.value,
      style: col.styleSel.value,
      content: col.editor.value
    }));
    Store.saveTargetColumns(columns);
    Store.saveSourceText(document.getElementById('editor-zh')?.value || '');
  },

  handleInverseSync(target) {
    const text = target.editor.value;
    const blocks = text.split('\n\n');
    const cursorIndex = text.substring(0, target.editor.selectionStart).split('\n\n').length - 1;
    
    if (blocks[cursorIndex]?.trim()) {
      SyncEngine.executeInverse(text, cursorIndex, target.langSel.value, target.id,
        () => this.getTargetConfigs(),
        this.getUICallbacks()
      );
    }
  },

  toggleGlobalPreview(forceOpen = false) {
    this.isPreviewMode = forceOpen ? true : !this.isPreviewMode;
    
    const previewBtn = document.getElementById('btn-preview');
    if (previewBtn) {
      previewBtn.textContent = this.isPreviewMode ? '📝 编辑模式' : '👁️ 全局排版预览';
    }
    
    // 切换预览模式
    const editors = document.querySelectorAll('.target-textarea, .editor');
    const previews = document.querySelectorAll('.target-preview');
    
    editors.forEach(editor => {
      editor.style.display = this.isPreviewMode ? 'none' : 'block';
    });
    
    previews.forEach(preview => {
      preview.style.display = this.isPreviewMode ? 'block' : 'none';
      if (this.isPreviewMode) {
        const textarea = preview.previousElementSibling;
        if (textarea) {
          preview.innerHTML = marked.parse(textarea.value);
        }
      }
    });
  },

  toggleTutorDrawer() {
    document.getElementById('tutor-drawer').classList.toggle('open');
  },

  openTutorDrawer() {
    document.getElementById('tutor-drawer').classList.add('open');
  },

  closeTutorDrawer() {
    document.getElementById('tutor-drawer').classList.remove('open');
  },

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
  },

  _menuCloseTimers: new Map(),

  scheduleCloseMenu(element) {
    if (this._menuCloseTimers.has(element)) {
      clearTimeout(this._menuCloseTimers.get(element));
    }
    const timer = setTimeout(() => {
      element.classList.remove('expanded');
      this._menuCloseTimers.delete(element);
    }, 500);
    this._menuCloseTimers.set(element, timer);
  },

  cancelCloseMenu(element) {
    if (this._menuCloseTimers.has(element)) {
      clearTimeout(this._menuCloseTimers.get(element));
      this._menuCloseTimers.delete(element);
    }
  }
};
