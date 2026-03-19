/**
 * ==========================================
 * 工具函数模块 (Utils)
 * ==========================================
 * 提供纯函数工具，无副作用
 */

import { PRESET_LABELS, LATIN_VARIANTS } from '../data/constants.js';

export const Utils = {
  isHeading(text) {
    return /^#{1,6}\s+/.test(text.trim());
  },

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

  _htmlEscapes: {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  },
  
  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => this._htmlEscapes[tag] || tag);
  },

  buildLangOptions(defaultLang, supportedLanguages) {
    let options = supportedLanguages.map(lang => 
      `<option value="${lang.code}"${defaultLang === lang.code ? ' selected' : ''}>${lang.label}</option>`
    ).join('');
    
    options += '<optgroup label="🏛️ 拉丁语变体">';
    options += LATIN_VARIANTS.map(lang => 
      `<option value="${lang.code}"${defaultLang === lang.code ? ' selected' : ''}>${lang.label}</option>`
    ).join('');
    options += '</optgroup>';
    
    return options;
  },

  buildTutorOptions(tutors) {
    const ageLabels = { teen: '少年', young: '青年', adult: '中年' };
    const genderLabels = { male: '男', female: '女' };
    const countryEmoji = {
      latin: '🏛️',
      german: '🇩🇪',
      spanish: '🇪🇸',
      japanese: '🇯🇵',
      english: '🇬🇧',
      french: '🇫🇷'
    };
    
    let options = `<option value="random">🎲 随机助教</option>`;
    
    return options + Object.values(tutors).map(tutor => {
      const ageLabel = ageLabels[tutor.ageGroup] || '';
      const genderLabel = genderLabels[tutor.gender] || '';
      const emoji = countryEmoji[tutor.country] || '👤';
      return `<option value="${tutor.id}">${emoji} ${tutor.name} ${genderLabel} ${ageLabel}</option>`;
    }).join('');
  },

  buildStyleOptions(defaultStyle, presets, defaultPresets) {
    const styleNames = {
      concise: 'Concise',
      casual: 'Casual',
      formal: 'Formal',
      literary: 'Literary'
    };
    return Object.keys(presets).map(key => {
      const label = PRESET_LABELS[key] || key;
      const englishName = styleNames[key] || key;
      return `<option value="${key}"${defaultStyle === key ? ' selected' : ''}>${label} (${englishName})</option>`;
    }).join('');
  }
};
