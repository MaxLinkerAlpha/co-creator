/**
 * ==========================================
 * 存储与状态层 (Store)
 * ==========================================
 * 封装 localStorage，提供类型安全的存取
 */

import { DEFAULT_THEME, DEFAULT_TUTOR } from '../data/constants.js';

export const Store = {
  termsList: [],

  get(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (err) {
      return value;
    }
  },

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
  },

  saveCustomPreset(name, prompt) {
    const presets = this.getCustomPresets();
    presets[name] = prompt;
    this.set('pd_custom_presets', presets);
  }
};
