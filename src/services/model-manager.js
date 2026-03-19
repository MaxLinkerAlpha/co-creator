/**
 * ==========================================
 * 模型管理器 (ModelManager)
 * ==========================================
 * 管理模型切换和自定义模型
 */

export const ModelManager = {
  currentModel: null,
  customModelId: null,
  customModelUrl: null,
  customModelKey: null,

  getAvailableModels() {
    return window.AVAILABLE_MODELS || AVAILABLE_MODELS || {};
  },

  getConfig() {
    return window.CONFIG || CONFIG || {};
  },

  init() {
    const saved = localStorage.getItem('pd_selected_model');
    const savedCustomModel = localStorage.getItem('pd_custom_model_id');
    const savedCustomUrl = localStorage.getItem('pd_custom_model_url');
    const savedCustomKey = localStorage.getItem('pd_custom_model_key');
    const models = this.getAvailableModels();
    const config = this.getConfig();
    
    if (savedCustomModel) {
      this.customModelId = savedCustomModel;
    }
    if (savedCustomUrl) {
      this.customModelUrl = savedCustomUrl;
    }
    if (savedCustomKey) {
      this.customModelKey = savedCustomKey;
    }
    
    if (saved && models && models[saved]) {
      this.currentModel = models[saved];
    } else if (config.MODEL_NAME) {
      this.currentModel = { id: config.MODEL_NAME, name: config.MODEL_NAME };
    } else {
      this.currentModel = models['Qwen3.5-4B'];
      localStorage.setItem('pd_selected_model', 'Qwen3.5-4B');
    }
  },

  switch(modelKey) {
    const models = this.getAvailableModels();
    if (!models || !models[modelKey]) {
      console.error('[ModelManager] 未知模型:', modelKey, 'AVAILABLE_MODELS:', Object.keys(models || {}));
      return false;
    }
    this.currentModel = models[modelKey];
    localStorage.setItem('pd_selected_model', modelKey);
    console.log('[ModelManager] 切换模型:', modelKey, '->', this.currentModel);
    
    return true;
  },
  
  setCustomModelId(modelId) {
    if (!modelId || !modelId.trim()) return false;
    this.customModelId = modelId.trim();
    localStorage.setItem('pd_custom_model_id', this.customModelId);
    return true;
  },

  setCustomModelUrl(url) {
    if (!url || !url.trim()) return false;
    this.customModelUrl = url.trim();
    localStorage.setItem('pd_custom_model_url', this.customModelUrl);
    return true;
  },

  setCustomModelKey(key) {
    if (!key || !key.trim()) return false;
    this.customModelKey = key.trim();
    localStorage.setItem('pd_custom_model_key', this.customModelKey);
    return true;
  },

  getCustomModelUrl() {
    return this.customModelUrl || null;
  },

  getCustomModelKey() {
    return this.customModelKey || null;
  },

  getCurrentModelId() {
    if (this.currentModel && this.currentModel.id.toLowerCase() === 'custom' && this.customModelId) {
      console.log('[ModelManager] 使用自定义模型:', this.customModelId);
      return this.customModelId;
    }
    const config = this.getConfig();
    const modelId = this.currentModel ? this.currentModel.id : (config.MODEL_NAME || 'Qwen/Qwen3.5-4B');
    console.log('[ModelManager] 当前模型 ID:', modelId, 'currentModel:', this.currentModel);
    return modelId;
  },

  getCurrentModel() {
    return this.currentModel;
  },
  
  isCustomModel() {
    return this.currentModel && this.currentModel.id.toLowerCase() === 'custom';
  }
};
