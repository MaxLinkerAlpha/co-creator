/**
 * ==========================================
 * ⚙️ Co-creator 核心配置示例文件
 * ==========================================
 * 
 * 使用说明：
 * 1. 重命名此文件为 config.js
 * 2. 在 config.js 中填入你的真实 API 密钥（不填也没关系，默认是免费版本模型，不过翻译质量嘛...）
 * 3. 不要提交 config.js 到公共仓库（已在 .gitignore 中配置）
 * 
 * 配置说明：
 * - API_KEY: 你的大语言模型 API 密钥
 * - API_URL: 兼容 OpenAI 格式的 API 端点
 * - MODEL_NAME: 模型名称（如 gpt-4o-mini, gpt-4, claude-3 等）
 * - TEMPERATURE: 温度参数（0.0-1.0）
 *   - 翻译任务建议 0.2（稳定准确）
 *   - 创意写作建议 0.7（更有创造力）
 *   - 助教吐槽建议 0.8（更有娱乐性）

const CONFIG = {
    // [必填] API 密钥 - 替换为你的真实密钥
    // 支持 OpenAI 格式或兼容的 API 提供商
    API_KEY: 'sk-your-api-key-here',
    
    // [必填] API 端点 - 必须包含 /v1/chat/completions
    // 示例 (OpenAI): https://api.openai.com/v1/chat/completions
    // 示例 (SiliconFlow): https://api.siliconflow.cn/v1/chat/completions
    // 示例 (其他中转): https://your-proxy.com/v1/chat/completions
    API_URL: 'https://api.openai.com/v1/chat/completions',
    
    // [可选] 模型名称 - 如果未设置，用户可在界面上选择
    // 推荐选项:
    // - gpt-4o-mini: 性价比高，适合翻译
    // - gpt-4: 质量高，适合复杂内容
    // - gpt-4o: 最新多模态模型
    // - claude-3-haiku: 速度快
    // - claude-3.5-sonnet: 逻辑能力强
    MODEL_NAME: '',
    
    // [可选] 温度参数 (0.0-1.0)
    // 越低越稳定（适合翻译），越高越有创意（适合写作/吐槽）
    // 翻译: 0.2
    // 写作: 0.7
    // 助教吐槽: 0.8
    TEMPERATURE: 0.2
};

// 可选模型列表（用户可在界面切换）
const AVAILABLE_MODELS = {
    'Qwen3.5-4B': {
        id: 'Qwen/Qwen3.5-4B',
        name: 'Qwen3.5-4B',
        desc: '⚡ 极致省钱提速',
        useCase: '纯日常轻量翻译'
    },
    'Qwen3.5-9B': {
        id: 'Qwen/Qwen3.5-9B',
        name: 'Qwen3.5-9B',
        desc: '⚖️ 平衡效果与速度',
        useCase: '绝大多数拉丁语/多语种短文本场景'
    },
    'Qwen3.5-35B-A3B': {
        id: 'Qwen/Qwen3.5-35B-A3B',
        name: 'Qwen3.5-35B-A3B',
        desc: '🎯 专业级翻译',
        useCase: '专业级拉丁语翻译、批量多语种短文本处理'
    }
};
