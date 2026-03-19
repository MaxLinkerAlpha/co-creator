/**
 * ==========================================
 * 同步引擎 (SyncEngine)
 * ==========================================
 * 区块级同步引擎，管理翻译任务
 */

import { Utils } from '../core/utils.js';
import { Store } from '../core/store.js';
import { API } from './api.js';
import { eventBus, EVENTS } from '../core/event-bus.js';

export const SyncEngine = {
  sourceBlocksMemory: [],
  typingTimer: null,
  autoPreviewTimer: null,
  activeRequests: {},
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
    if (!basePrompt || typeof basePrompt !== 'string') {
      console.error('[SyncEngine] buildPrompt: basePrompt 无效', basePrompt);
      basePrompt = 'Translate into {{lang}}. Output ONLY the translation.';
    }
    
    let finalLang = targetLang;
    const rules = [];

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

  async execute(fullText, cursorIndex, forceSyncCurrentBlock, getTargetConfigs, uiCallbacks) {
    const currentBlocks = fullText.split('\n\n');
    const tasks = [];
    const targets = getTargetConfigs();
    
    if (!targets || targets.length === 0) {
      uiCallbacks.updateStatus('zh-status', '➕ 请先添加目标语言栏');
      return;
    }

    for (let i = 0; i < currentBlocks.length; i++) {
      if (currentBlocks[i] !== this.sourceBlocksMemory[i] && currentBlocks[i].trim() !== '') {
        if (forceSyncCurrentBlock || i !== cursorIndex) {
          const blockContent = currentBlocks[i].trim();

          if (Utils.isHeading(blockContent)) {
            uiCallbacks.updateStatus('zh-status', '✓ 标题同步');
            const cleanTitle = Utils.stripHeadingMarkers(blockContent);
            const prevBlock = this.sourceBlocksMemory[i];
            const prevClean = prevBlock ? Utils.stripHeadingMarkers(prevBlock).trim() : '';
            
            if (prevClean === cleanTitle.trim() && uiCallbacks.getTargetBlockContent(i)) {
              uiCallbacks.syncHeadingToAllTargets(i, currentBlocks.length);
            } else {
              tasks.push(this.translateBlockAsHeading(currentBlocks[i], i, currentBlocks.length, targets, uiCallbacks));
            }
            this.sourceBlocksMemory[i] = currentBlocks[i];
          } else {
            uiCallbacks.updateStatus('zh-status', '🔄 流式同步中...');
            this.sourceBlocksMemory[i] = currentBlocks[i];
            tasks.push(this.translateBlock(currentBlocks[i], i, currentBlocks.length, targets, uiCallbacks));
          }
        }
      }
    }

    if (this.sourceBlocksMemory.length > currentBlocks.length) {
      this.sourceBlocksMemory = this.sourceBlocksMemory.slice(0, currentBlocks.length);
      uiCallbacks.trimTargetBlocks(currentBlocks.length);
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
      uiCallbacks.updateStatus('zh-status', '✓');
      setTimeout(() => uiCallbacks.updateStatus('zh-status', ''), 2000);
    }

    if (forceSyncCurrentBlock) {
      uiCallbacks.checkAutoPreview();
    }
  },

  async translateBlockAsHeading(text, index, totalBlocks, targets, uiCallbacks) {
    const cleanText = Utils.stripHeadingMarkers(text);
    await this.translateBlock(cleanText, index, totalBlocks, targets, uiCallbacks, true);
  },

  async syncCompletedBlock(fullText, blockIndex, getTargetConfigs, uiCallbacks) {
    const currentBlocks = fullText.split('\n\n');
    const totalBlocks = currentBlocks.length;
    const blockContent = currentBlocks[blockIndex]?.trim();
    
    if (!blockContent) return;
    
    const targets = getTargetConfigs();
    if (!targets || targets.length === 0) {
      uiCallbacks.updateStatus('zh-status', '➕ 请先添加目标语言栏');
      return;
    }
    
    this.sourceBlocksMemory[blockIndex] = currentBlocks[blockIndex];
    
    try {
      if (Utils.isHeading(blockContent)) {
        uiCallbacks.updateStatus('zh-status', '✓ 标题同步');
        const cleanTitle = Utils.stripHeadingMarkers(blockContent);
        const prevBlock = this.sourceBlocksMemory[blockIndex];
        const prevClean = prevBlock ? Utils.stripHeadingMarkers(prevBlock).trim() : '';
        
        if (prevClean === cleanTitle.trim() && uiCallbacks.getTargetBlockContent(blockIndex)) {
          uiCallbacks.syncHeadingToAllTargets(blockIndex, totalBlocks);
        } else {
          await this.translateBlockAsHeading(currentBlocks[blockIndex], blockIndex, totalBlocks, targets, uiCallbacks);
        }
      } else {
        uiCallbacks.updateStatus('zh-status', '🔄 段落翻译中...');
        await this.translateBlock(blockContent, blockIndex, totalBlocks, targets, uiCallbacks);
      }
      
      eventBus.emit(EVENTS.SYNC_PARAGRAPH_COMPLETED, { blockIndex, totalBlocks });
    } catch (err) {
      console.error('[SyncEngine] syncCompletedBlock error:', err);
      eventBus.emit(EVENTS.SYNC_BLOCK_FAILED, { blockIndex, error: err });
    }
  },

  async translateBlock(text, index, totalBlocks, targets, uiCallbacks, asHeading = false) {
    const reqKey = `block-${index}`;
    
    const oldController = this.activeRequests[reqKey];
    if (oldController) {
      oldController.abort();
    }
    
    const newController = new AbortController();
    this.activeRequests[reqKey] = newController;
    
    if (oldController) {
      await new Promise(r => setTimeout(r, 50));
    }

    const tasks = targets.map(async (target) => {
      const prompt = this.buildPrompt(text, target.lang, uiCallbacks.getPreset(target.style), target.latinConfig);
      
      try {
        uiCallbacks.updateStatus(target.statusId, '🔄 翻译中...');
        
        const result = await API.call(text, prompt, 0.2, newController.signal);
        
        if (asHeading) {
          const headingPrefix = text.match(/^(#{1,6}\s+)/)?.[1] || '# ';
          uiCallbacks.updateTargetBlock(target.id, index, headingPrefix + result, totalBlocks);
        } else {
          uiCallbacks.updateTargetBlock(target.id, index, result, totalBlocks);
        }
        
        uiCallbacks.updateStatus(target.statusId, '✓');
        setTimeout(() => uiCallbacks.updateStatus(target.statusId, ''), 2000);
        
        eventBus.emit(EVENTS.SYNC_BLOCK_TRANSLATED, { index, target: target.id, result });
        
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('[SyncEngine] Request aborted for block', index);
        } else {
          console.error('[SyncEngine] Translation error:', err);
          uiCallbacks.updateStatus(target.statusId, '❌ 翻译失败');
          eventBus.emit(EVENTS.SYNC_BLOCK_FAILED, { index, target: target.id, error: err });
        }
      }
    });

    try {
      await Promise.allSettled(tasks);
    } finally {
      if (this.activeRequests[reqKey] === newController) {
        delete this.activeRequests[reqKey];
      }
    }
  }
};
