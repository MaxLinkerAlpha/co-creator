/**
 * ==========================================
 * 模型管理器 (ModelManager)
 * ==========================================
 * 管理模型切换和自定义模型
 */

export const ModelManager = {
  currentModel: null,
  customModelId: null,

  init() {
    const saved = localStorage.getItem('pd_selected_model');
    const savedCustomModel = localStorage.getItem('pd_custom_model_id');
    
    if (savedCustomModel) {
      this.customModelId = savedCustomModel;
    }
    
    if (saved && AVAILABLE_MODELS && AVAILABLE_MODELS[saved]) {
      this.currentModel = AVAILABLE_MODELS[saved];
    } else if (CONFIG.MODEL_NAME) {
      this.currentModel = { id: CONFIG.MODEL_NAME, name: CONFIG.MODEL_NAME };
    } else {
      this.currentModel = AVAILABLE_MODELS['Qwen3.5-4B'];
      localStorage.setItem('pd_selected_model', 'Qwen3.5-4B');
    }
  },

  switch(modelKey) {
    if (!AVAILABLE_MODELS || !AVAILABLE_MODELS[modelKey]) {
      console.error('[ModelManager] 未知模型:', modelKey, 'AVAILABLE_MODELS:', Object.keys(AVAILABLE_MODELS || {}));
      return false;
    }
    this.currentModel = AVAILABLE_MODELS[modelKey];
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

  getCurrentModelId() {
    if (this.currentModel && this.currentModel.id.toLowerCase() === 'custom' && this.customModelId) {
      console.log('[ModelManager] 使用自定义模型:', this.customModelId);
      return this.customModelId;
    }
    const modelId = this.currentModel ? this.currentModel.id : (CONFIG.MODEL_NAME || 'Qwen/Qwen3.5-4B');
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
