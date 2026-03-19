/**
 * ==========================================
 * 全局变量桥接文件 (globals.js)
 * ==========================================
 * 将 config.js 中的变量桥接到 ES Modules
 * 必须在 app.js 之前加载
 */

if (typeof CONFIG !== 'undefined') {
  window.CONFIG = CONFIG;
}
if (typeof AVAILABLE_MODELS !== 'undefined') {
  window.AVAILABLE_MODELS = AVAILABLE_MODELS;
}

console.log('[Globals] 全局变量桥接完成');
