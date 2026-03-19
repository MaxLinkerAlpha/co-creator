/**
 * ==========================================
 * 全局变量桥接文件 (globals.js)
 * ==========================================
 * 将 config.js 和 data.js 中的变量桥接到 ES Modules
 * 必须在 app.js 之前加载
 */

// 从 config.js 桥接全局变量
if (typeof CONFIG !== 'undefined') {
  window.CONFIG = CONFIG;
}
if (typeof AVAILABLE_MODELS !== 'undefined') {
  window.AVAILABLE_MODELS = AVAILABLE_MODELS;
}

// 从 data.js 桥接全局变量
if (typeof TUTORS !== 'undefined') {
  window.TUTORS = TUTORS;
}
if (typeof DEFAULT_PRESETS !== 'undefined') {
  window.DEFAULT_PRESETS = DEFAULT_PRESETS;
}
if (typeof SUPPORTED_LANGUAGES !== 'undefined') {
  window.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
}
if (typeof LATIN_VARIANTS !== 'undefined') {
  window.LATIN_VARIANTS = LATIN_VARIANTS;
}
if (typeof TUTOR_MODE_SETTINGS !== 'undefined') {
  window.TUTOR_MODE_SETTINGS = TUTOR_MODE_SETTINGS;
}
if (typeof AGE_LABELS !== 'undefined') {
  window.AGE_LABELS = AGE_LABELS;
}
if (typeof GENDER_LABELS !== 'undefined') {
  window.GENDER_LABELS = GENDER_LABELS;
}

console.log('[Globals] 全局变量桥接完成');
