const CONFIG = {
    API_KEY: '填入你的api',
    API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
    MODEL_NAME: 'Qwen/Qwen2.5-7B-Instruct',
    TEMPERATURE: 0.2
};

const AVAILABLE_MODELS = {
    'Qwen2.5-7B': {
        id: 'Qwen/Qwen2.5-7B-Instruct',
        name: 'Qwen2.5-7B',
        desc: '免费稳定',
        useCase: '免费使用，无需配置'
    },
    'Qwen3.5-4B': {
        id: 'Qwen/Qwen3.5-4B',
        name: 'Qwen3.5-4B',
        desc: '最快响应',
        useCase: '纯日常轻量翻译'
    },
    'Qwen3.5-9B': {
        id: 'Qwen/Qwen3.5-9B',
        name: 'Qwen3.5-9B',
        desc: '平衡之选',
        useCase: '绝大多数场景'
    },
    'Qwen3.5-35B-A3B': {
        id: 'Qwen/Qwen3.5-35B-A3B',
        name: 'Qwen3.5-35B',
        desc: '专业级',
        useCase: '专业级翻译'
    }
};
