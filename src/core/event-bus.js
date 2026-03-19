/**
 * ==========================================
 * 事件总线 (EventBus)
 * ==========================================
 * 实现发布-订阅模式，解耦模块间通信
 */

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
  
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

export const eventBus = new EventBus();

// 事件常量定义
export const EVENTS = {
  // 同步相关事件
  SYNC_BLOCK_TRANSLATED: 'sync:block-translated',
  SYNC_BLOCK_FAILED: 'sync:block-failed',
  SYNC_PARAGRAPH_COMPLETED: 'sync:paragraph-completed',
  SYNC_HEADING_SYNCED: 'sync:heading-synced',
  
  // 助教相关事件
  TUTOR_ROAST: 'tutor:roast',
  TUTOR_ERROR: 'tutor:error',
  TUTOR_SWITCHED: 'tutor:switched',
  
  // UI 相关事件
  UI_STATUS_UPDATED: 'ui:status-updated',
  UI_THEME_CHANGED: 'ui:theme-changed',
  UI_MODEL_CHANGED: 'ui:model-changed',
  
  // 翻译相关事件
  TRANSLATION_STARTED: 'translation:started',
  TRANSLATION_COMPLETED: 'translation:completed',
  TRANSLATION_FAILED: 'translation:failed'
};
