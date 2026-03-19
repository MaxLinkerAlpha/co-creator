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
    this.setTheme(Store.getTheme());

    ModelManager.init();
    const modelSelect = document.getElementById('model-select');
    const customInput = document.getElementById('custom-model-input');
    const models = this.getAvailableModels();
    
    if (modelSelect) {
      const savedModel = localStorage.getItem('pd_selected_model');
      if (savedModel && models && models[savedModel]) {
        modelSelect.value = savedModel;
        if (savedModel === 'Custom' && customInput) {
          customInput.style.display = 'inline-block';
          const savedCustom = localStorage.getItem('pd_custom_model_id');
          if (savedCustom) customInput.value = savedCustom;
        }
      } else {
        const currentModel = ModelManager.getCurrentModel();
        if (currentModel) {
          const modelKey = Object.keys(models).find(k => models[k].id === currentModel.id);
          if (modelKey) modelSelect.value = modelKey;
        }
      }
    }

    const config = this.getConfig();
    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (!config.API_KEY || invalidKeys.some(k => k && config.API_KEY.toLowerCase().includes(k.toLowerCase()))) {
      alert('[Warning] 请先在 config.js 中配置有效的 API_KEY！');
    }

    const tutorSelect = document.getElementById('tutor-select');
    if (tutorSelect) {
      tutorSelect.innerHTML = Utils.buildTutorOptions(TUTORS);
      const savedTutor = Store.getTutor() || 'random';
      tutorSelect.value = savedTutor; 
    }
    
    document.getElementById('tutor-mode').value = TutorSystem.config.mode;

    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    if (autoPreviewToggle) {
      autoPreviewToggle.checked = Store.getAutoPreview();
    }

    this.bindEvents();
    
    const savedColumns = Store.getTargetColumns();
    if (savedColumns.length > 0) {
      savedColumns.forEach(col => {
        this.addTargetColumn(col.lang, col.style, col.latinStyle, col.useMacron, col.content);
      });
    } else {
      this.addTargetColumn('English', 'game');
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
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    
    if (autoPreviewToggle) {
      autoPreviewToggle.addEventListener('change', () => {
        Store.saveAutoPreview(autoPreviewToggle.checked);
      });
    }
    
    elZh.addEventListener('input', (e) => {
      const text = elZh.value;
      const cursorIndex = text.substring(0, elZh.selectionStart).split('\n\n').length - 1;
      
      this.updateStatus('zh-status', '⌨️ 输入中...');
      
      clearTimeout(SyncEngine.typingTimer);
      clearTimeout(this.autoPreviewTimer);
      
      if (this.isPreviewMode && autoPreviewToggle?.checked) {
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

    document.addEventListener('keydown', (e) => {
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) this.wakeUpEditors();
    });
    document.getElementById('workspace').addEventListener('click', () => this.wakeUpEditors());
    
    document.getElementById('btn-roast')?.addEventListener('click', () => {
      TutorSystem.roastManual(document.getElementById('editor-zh').value.trim());
    });
  },

  scheduleAutoPreview() {
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    if (!autoPreviewToggle?.checked) return;
    
    clearTimeout(this.autoPreviewTimer);
    this.autoPreviewTimer = setTimeout(() => {
      if (autoPreviewToggle.checked && !this.isPreviewMode) {
        this.enterPreviewMode();
      }
    }, 3000);
  },

  enterPreviewMode() {
    this.isPreviewMode = true;
    
    const editors = document.querySelectorAll('.target-textarea, #editor-zh');
    const previews = document.querySelectorAll('.target-preview, #preview-zh');
    
    editors.forEach(editor => {
      editor.style.display = 'none';
    });
    
    previews.forEach(preview => {
      preview.style.display = 'block';
      const textarea = preview.previousElementSibling;
      if (textarea && textarea.tagName === 'TEXTAREA') {
        preview.innerHTML = marked.parse(textarea.value);
      }
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
    
    editors.forEach(editor => {
      editor.style.display = 'block';
    });
    
    previews.forEach(preview => {
      preview.style.display = 'none';
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

    eventBus.on(EVENTS.TUTOR_SWITCHED, ({ tutorId }) => {
      this.updateTutorPanel(tutorId);
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
      deleteTargetBlocks: (indices) => this.deleteTargetBlocks(indices),
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
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    if (autoPreviewToggle && autoPreviewToggle.checked && !this.isPreviewMode) {
      this.enterPreviewMode();
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

  renderFullTutorRoast(htmlContent, tutorName, isPlain = false) {
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

  wakeUpEditors() {
    // Placeholder for editor wake-up logic
  },

  addTargetColumn(defaultLang = 'English', defaultStyle = 'game', latinStyle = null, useMacron = true, savedContent = '') {
    this.columnCounter++;
    const colId = `target-col-${this.columnCounter}`;
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.id = colId;

    colDiv.innerHTML = `
      <div class="col-header">
        <div class="col-tools">
          <select class="lang-sel">
            ${Utils.buildLangOptions(defaultLang, SUPPORTED_LANGUAGES)}
          </select>
          <select class="style-sel">
            ${Utils.buildStyleOptions(defaultStyle, this.currentPresets, DEFAULT_PRESETS)}
          </select>
        </div>
        <div>
          <span class="status-text col-status"></span>
          <button style="border:none;background:transparent;color:red;cursor:pointer;font-size:16px;">[x]</button>
        </div>
      </div>
      <div class="latin-panel" id="latin-panel-${colId}">
        <strong>[SPQR] 拉丁语细分:</strong>
        <select class="latin-style-sel">
          ${LATIN_VARIANTS.map(v => `<option value="${v.value}">${v.label}</option>`).join('')}
        </select>
        <label style="cursor:pointer;"><input type="checkbox" class="latin-macron-cb" ${useMacron ? 'checked' : ''}> 长音符号</label>
      </div>
      <textarea class="content-box target-textarea" placeholder="AI 目标输出区域...">${savedContent}</textarea>
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
      editor: colDiv.querySelector('.target-textarea'),
      previewArea: colDiv.querySelector('.target-preview'),
      statusEl: colDiv.querySelector('.col-status'),
      memoryBlocks: []
    };

    if (latinStyle && target.latinStyleSel) {
      target.latinStyleSel.value = latinStyle;
    }

    target.langSel.addEventListener('change', () => {
      this.handleLangChange(colId);
      this.saveCurrentState();
    });
    target.styleSel.addEventListener('change', () => this.saveCurrentState());
    target.latinStyleSel?.addEventListener('change', () => this.saveCurrentState());
    target.latinMacronCb?.addEventListener('change', () => this.saveCurrentState());
    colDiv.querySelector('button').addEventListener('click', () => this.removeTargetColumn(colId));
    target.editor.addEventListener('input', Utils.debounce(() => {
      this.handleInverseSync(target);
      this.saveCurrentState();
    }, 1500));
    
    this.targetColumns.push(target);
    this.handleLangChange(colId);
    this.saveCurrentState();
  },

  removeTargetColumn(colId) {
    document.getElementById(colId)?.remove();
    this.targetColumns = this.targetColumns.filter(c => c.id !== colId);
    this.saveCurrentState();
  },

  handleLangChange(colId) {
    const target = this.targetColumns.find(c => c.id === colId);
    if (target) {
      target.latinPanel.style.display = target.langSel.value === 'Latin' ? 'flex' : 'none';
    }
  },

  saveCurrentState() {
    const columns = this.targetColumns.map(col => ({
      lang: col.langSel.value,
      style: col.styleSel.value,
      latinStyle: col.latinStyleSel?.value || null,
      useMacron: col.latinMacronCb?.checked ?? true,
      content: col.editor.value
    }));
    Store.saveTargetColumns(columns);
    Store.saveSourceText(document.getElementById('editor-zh')?.value || '');
    
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    if (autoPreviewToggle) {
      Store.saveAutoPreview(autoPreviewToggle.checked);
    }
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
  }
};
