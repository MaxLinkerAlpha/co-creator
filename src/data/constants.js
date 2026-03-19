/**
 * ==========================================
 * 系统常量 (constants.js)
 * ==========================================
 */

export const AGE_LABELS = {
  teen: "少年",
  young: "青年",
  adult: "中年"
};

export const GENDER_LABELS = {
  male: "男",
  female: "女"
};

export const SUPPORTED_LANGUAGES = [
  { code: "English", label: "🇬🇧 英语 (English)" },
  { code: "Japanese", label: "🇯🇵 日语 (日本語)" },
  { code: "Spanish", label: "🇪🇸 西班牙语 (Español)" },
  { code: "French", label: "🇫🇷 法语 (Français)" },
  { code: "German", label: "🇩🇪 德语 (Deutsch)" },
  { code: "Russian", label: "🇷🇺 俄语 (Русский)" },
  { code: "Arabic", label: "🇸🇦 阿拉伯语 (العربية)" }
];

export const LATIN_VARIANTS = [
  { code: "Latin:Classical", label: "🏛️ 古典拉丁语 (Classical)", defaultMacron: true },
  { code: "Latin:Ecclesiastical", label: "⛪ 教会拉丁语 (Ecclesiastical)", defaultMacron: false },
  { code: "Latin:Spoken", label: "💬 现代口语拉丁语 (Spoken)", defaultMacron: false },
  { code: "Latin:Vulgar", label: "📜 通俗拉丁语 (Vulgar)", defaultMacron: false }
];

export const DEFAULT_PRESETS = {
  concise: "You are a minimalist editor. Translate into {{lang}}. Cut all fluff, make it punchy. Output ONLY translation. Preserve Markdown.",
  casual: "Translate casually into {{lang}} as if chatting with a friend. Output ONLY translation. Preserve Markdown.",
  formal: "You are a professional translator. Translate into {{lang}} with formal, polished language suitable for business or academic contexts. Output ONLY translation. Preserve Markdown.",
  literary: "You are a literary translator. Translate into {{lang}} with artistic flair, preserving the beauty and style of the original. Output ONLY translation. Preserve Markdown."
};

export const PRESET_LABELS = {
  concise: "✂️ 精简",
  casual: "💬 口语",
  formal: "📋 正式",
  literary: "🎭 文学"
};

export const TUTOR_MODE_SETTINGS = {
  high: { charThreshold: 10, cooldownMinutes: 1, idleThreshold: 3000 },
  normal: { charThreshold: 50, cooldownMinutes: 3, idleThreshold: 5000 },
  low: { charThreshold: 200, cooldownMinutes: 5, idleThreshold: 8000 },
  slow: { charThreshold: 5, cooldownMinutes: 2, idleThreshold: 5000, slowWriterThreshold: 60000 },
  manual: { charThreshold: Infinity, cooldownMinutes: 0, idleThreshold: Infinity }
};

export const DEFAULT_THEME = 'theme-apple';
export const DEFAULT_TUTOR = 'random';
