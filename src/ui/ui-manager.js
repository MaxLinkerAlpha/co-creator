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
import { DEFAULT_PRESETS, SUPPORTED_LANGUAGES, LATIN_VARIANTS } from '../data/constants.js';

export const UI = {
  targetColumns: [],
  columnCounter: 0,
  currentPresets: { ...DEFAULT_PRESETS },
  isPreviewMode: false,
  tutorBubbleTimer: null,

  init() {
    this.currentPresets = { ...DEFAULT_PRESETS, ...Store.getCustomPresets() };
    this.setTheme(Store.getTheme());

    ModelManager.init();
    const modelSelect = document.getElementById('model-select');
    const customInput = document.getElementById('custom-model-input');
    
    if (modelSelect) {
      const savedModel = localStorage.getItem('pd_selected_model');
      if (savedModel && AVAILABLE_MODELS && AVAILABLE_MODELS[savedModel]) {
        modelSelect.value = savedModel;
        if (savedModel === 'Custom' && customInput) {
          customInput.style.display = 'inline-block';
          const savedCustom = localStorage.getItem('pd_custom_model_id');
          if (savedCustom) customInput.value = savedCustom;
        }
      } else {
        const currentModel = ModelManager.getCurrentModel();
        if (currentModel) {
          const modelKey = Object.keys(AVAILABLE_MODELS).find(k => AVAILABLE_MODELS[k].id === currentModel.id);
          if (modelKey) modelSelect.value = modelKey;
        }
      }
    }

    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (typeof CONFIG === 'undefined' || !CONFIG.API_KEY || invalidKeys.some(k => k && CONFIG.API_KEY.toLowerCase().includes(k.toLowerCase()))) {
      alert('[Warning] 请先在 config.js 中配置有效的 API_KEY！');
    }

    const tutorSelect = document.getElementById('tutor-select');
    if (tutorSelect) {
      tutorSelect.innerHTML = Utils.buildTutorOptions(TUTORS);
      tutorSelect.value = Store.getTutor(); 
    }
    
    const savedTutor = Store.getTutor();
    if (TUTORS[savedTutor]) TutorSystem.switch(savedTutor);
    else TutorSystem.switch('marcus');
    
    document.getElementById('tutor-mode').value = TutorSystem.config.mode;

    this.bindEvents();
    this.addTargetColumn('English', 'game');
    this.subscribeToEvents();
  },

  bindEvents() {
    const elZh = document.getElementById('editor-zh');
    this._lastInputTime = 0;
    
    elZh.addEventListener('input', (e) => {
      const text = elZh.value;
      const cursorIndex = text.substring(0, elZh.selectionStart).split('\n\n').length - 1;
      
      this.updateStatus('zh-status', '⌨️ 输入中...');
      
      clearTimeout(SyncEngine.typingTimer);
      
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
            return;
          }
        }
      }
      
      SyncEngine.typingTimer = setTimeout(() => {
        SyncEngine.execute(text, cursorIndex, true, 
          () => this.getTargetConfigs(), 
          this.getUICallbacks()
        );
      }, 1500);
      
      this._lastInputTime = Date.now();
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

  subscribeToEvents() {
    eventBus.on(EVENTS.TUTOR_ROAST, ({ message, tutorId, isBrief, isIntro }) => {
      if (isBrief) {
        this.showTutorBubble(message, 'brief');
      } else {
        const tutor = TUTORS[tutorId];
        this.renderFullTutorRoast(message, tutor.name, isIntro);
      }
    });

    eventBus.on(EVENTS.TUTOR_ERROR, ({ error, isBrief }) => {
      if (!isBrief) this.renderTutorError();
    });
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
  
  handleModelChange(modelKey) {
    const customInput = document.getElementById('custom-model-input');
    
    if (modelKey === 'Custom') {
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
      if (customInput) {
        customInput.style.display = 'none';
      }
      this.switchModel(modelKey);
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

  getUICallbacks() {
    return {
      updateStatus: (id, text) => this.updateStatus(id, text),
      updateTargetBlock: (targetId, index, content, totalBlocks) => this.updateTargetBlock(targetId, index, content, totalBlocks),
      getTargetBlockContent: (index) => this.getTargetBlockContent(index),
      syncHeadingToAllTargets: (index, totalBlocks) => this.syncHeadingToAllTargets(index, totalBlocks),
      trimTargetBlocks: (length) => this.trimTargetBlocks(length),
      checkAutoPreview: () => this.checkAutoPreview(),
      getPreset: (style) => this.currentPresets[style] || DEFAULT_PRESETS.game
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

  checkAutoPreview() {
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    if (autoPreviewToggle && autoPreviewToggle.checked) {
      this.toggleGlobalPreview(true);
    }
  },

  showTutorBubble(message, type = 'brief') {
    const bubble = document.getElementById('tutor-bubble');
    const bubbleText = document.getElementById('tutor-bubble-text');
    
    if (!bubble || !bubbleText) return;
    
    bubbleText.textContent = message;
    bubble.classList.add('show');
    
    clearTimeout(this.tutorBubbleTimer);
    this.tutorBubbleTimer = setTimeout(() => {
      bubble.classList.remove('show');
    }, 5000);
  },

  renderFullTutorRoast(message, tutorName, isIntro = false) {
    const drawer = document.getElementById('tutor-drawer');
    const roastContent = document.getElementById('tutor-roast-content');
    
    if (!drawer || !roastContent) return;
    
    roastContent.innerHTML = `<div class="roast-message">${Utils.escapeHTML(message)}</div>`;
    drawer.classList.add('open');
  },

  renderTutorError() {
    const roastContent = document.getElementById('tutor-roast-content');
    if (roastContent) {
      roastContent.innerHTML = '<div class="roast-error">❌ 吐槽失败，请稍后重试</div>';
    }
  },

  wakeUpEditors() {
    // Placeholder for editor wake-up logic
  },

  addTargetColumn(defaultLang = 'English', defaultStyle = 'game') {
    this.columnCounter++;
    const colId = `target-col-${this.columnCounter}`;
    
    // Implementation for adding target column
    // This would be the full implementation from the original app.js
    console.log('[UI] Adding target column:', colId, defaultLang, defaultStyle);
  },

  toggleGlobalPreview(forceOpen = false) {
    this.isPreviewMode = forceOpen ? true : !this.isPreviewMode;
    
    const previewBtn = document.getElementById('btn-preview');
    if (previewBtn) {
      previewBtn.textContent = this.isPreviewMode ? '📝 编辑模式' : '👁️ 全局排版预览';
    }
    
    // Implementation for preview toggle
    console.log('[UI] Toggle preview:', this.isPreviewMode);
  }
};
