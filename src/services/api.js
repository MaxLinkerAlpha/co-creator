/**
 * ==========================================
 * API 通信模块 (api.js)
 * ==========================================
 * 封装 API 通信，处理重试和超时
 */

import { Utils } from '../core/utils.js';
import { ModelManager } from './model-manager.js';

export const API = {
  getConfig() {
    return window.CONFIG || CONFIG || {};
  },

  async call(text, systemPrompt, temp = 0.2, externalSignal = null, retries = 2) {
    const cleanText = Utils.cleanText(text);
    const cleanPrompt = Utils.cleanText(systemPrompt);
    const config = this.getConfig();

    let apiUrl = config.API_URL;
    let apiKey = config.API_KEY;

    if (ModelManager.isCustomModel()) {
      const customUrl = ModelManager.getCustomModelUrl();
      const customKey = ModelManager.getCustomModelKey();
      if (customUrl) apiUrl = customUrl;
      if (customKey) apiKey = customKey;
    }

    const invalidKeys = ['sk-your-real-api-key-here', 'sk-your-api-key-here', 'sk-test', 'your-api-key'];
    if (!apiKey || invalidKeys.some(k => k && apiKey.toLowerCase().includes(k.toLowerCase()))) {
      throw new Error('API_KEY not configured or invalid');
    }

    const payload = {
      model: ModelManager.getCurrentModelId(),
      messages: [
        { role: 'system', content: cleanPrompt },
        { role: 'user', content: cleanText }
      ],
      temperature: temp,
      max_tokens: 2048,
      enable_thinking: false
    };

    console.log('[API] 准备请求:', { 
      model: payload.model, 
      url: apiUrl,
      textLength: cleanText.length 
    });

    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      let timeoutId = null;
      
      const onExternalAbort = () => {
        if (timeoutId) clearTimeout(timeoutId);
        controller.abort();
      };
      
      if (externalSignal) {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
      
      const startTime = Date.now();
      const timeoutMs = 60000;
      timeoutId = setTimeout(() => {
        console.error('[API] 超时触发:', {
          model: payload.model,
          elapsed: Date.now() - startTime + 'ms',
          timeout: timeoutMs + 'ms'
        });
        controller.abort();
      }, timeoutMs);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('[API] 请求成功:', {
          model: payload.model,
          elapsed: Date.now() - startTime + 'ms',
          status: response.status
        });
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[API] HTTP 错误:', response.status, errorText);
          console.error('[API] 请求详情:', {
            url: apiUrl,
            model: payload.model,
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        console.log('[API] 响应数据:', data);
        
        let content = null;
        
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          content = data.choices[0].message.content;
        }
        else if (data.output) {
          content = data.output;
        }
        else if (data.text) {
          content = data.text;
        }
        else if (data.result) {
          content = data.result;
        }
        else if (data.data && data.data[0] && data.data[0].content) {
          content = data.data[0].content;
        }
        
        if (!content) {
          console.error('[API] 响应结构异常，实际返回:', JSON.stringify(data, null, 2));
          throw new Error('API 响应格式异常');
        }
        
        return content.trim();
      } catch (err) {
        clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
        
        if (err.name === 'AbortError') {
          if (externalSignal?.aborted) {
            console.log('[API] 请求被用户中断');
            throw err;
          }
          console.log('[API] 请求超时 (60秒)');
        }
        
        if (i < retries) {
          const delay = Math.pow(2, i) * 1000;
          console.log(`[API] 请求错误 (重试 ${i + 1} / ${retries}):`, err);
          await new Promise(r => setTimeout(r, delay));
        } else {
          console.error('[API] 最终错误:', '翻译失败', '原始错误:', err.message);
          throw new Error('翻译失败');
        }
      }
    }
  }
};
