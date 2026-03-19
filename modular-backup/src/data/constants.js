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
  { code: "English", label: "[EN] 英语 (English)" },
  { code: "Japanese", label: "[JP] 日语 (日本語)" },
  { code: "Traditional Chinese", label: "[HK] 繁体中文" },
  { code: "Spanish", label: "[ES] 西班牙语 (Español)" },
  { code: "French", label: "[FR] 法语 (Français)" },
  { code: "German", label: "[DE] 德语 (Deutsch)" },
  { code: "Russian", label: "[RU] 俄语 (Русский)" },
  { code: "Arabic", label: "[SA] 阿拉伯语 (العربية)" },
  { code: "Latin", label: "[SPQR] 拉丁语 (Latina)" }
];

export const DEFAULT_PRESETS = {
  game: "You are a gaming localizer. Output ONLY the translated content into {{lang}}. Preserve paragraph formats and Markdown.",
  concise: "You are a minimalist editor. Translate into {{lang}}. Cut all fluff, make it punchy. Output ONLY translation. Preserve Markdown.",
  casual: "Translate casually into {{lang}} as if chatting with a friend. Output ONLY translation. Preserve Markdown."
};

export const TUTOR_MODE_SETTINGS = {
  high: { charThreshold: 10, cooldownMinutes: 1, idleThreshold: 3000 },
  normal: { charThreshold: 50, cooldownMinutes: 3, idleThreshold: 5000 },
  low: { charThreshold: 200, cooldownMinutes: 5, idleThreshold: 8000 },
  slow: { charThreshold: 5, cooldownMinutes: 2, idleThreshold: 5000, slowWriterThreshold: 60000 },
  manual: { charThreshold: Infinity, cooldownMinutes: 0, idleThreshold: Infinity }
};

export const LATIN_VARIANTS = [
  { code: "Classical Latin", label: "古典拉丁语 (Classical)" },
  { code: "Ecclesiastical Latin", label: "教会拉丁语 (Ecclesiastical)" },
  { code: "Spoken Latin", label: "现代口语拉丁语 (Spoken)" },
  { code: "Vulgar Latin", label: "通俗拉丁语 (Vulgar)" }
];

export const DEFAULT_THEME = 'theme-apple';
export const DEFAULT_TUTOR = 'marcus';
