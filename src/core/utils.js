/**
 * ==========================================
 * 工具函数模块 (Utils)
 * ==========================================
 * 提供纯函数工具，无副作用
 */

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
    return supportedLanguages.map(lang => 
      `<option value="${lang.code}"${defaultLang === lang.code ? ' selected' : ''}>${lang.label}</option>`
    ).join('');
  },

  buildTutorOptions(tutors) {
    const ageLabels = { teen: '少年', young: '青年', adult: '中年' };
    const genderLabels = { male: '男', female: '女' };
    
    let options = `<option value="random">🎲 [随机] 助教随机出没</option>`;
    
    return options + Object.values(tutors).map(tutor => {
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
