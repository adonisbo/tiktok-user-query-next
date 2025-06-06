// lib/jinaService.ts
import axios from 'axios';

const JINA_SIMPLE_READER_URL = 'https://r.jina.ai/';

/**
 * 使用Jina AI Reader API获取TikTok用户个人资料页面的Markdown内容。
 * @param {string} tiktokUserId - TikTok用户的唯一ID（例如，用户名）
 * @param {string} jinaApiKey - 用户的Jina AI API Key
 * @returns {Promise<string>} - 返回TikTok用户页面的Markdown内容
 * @throws {Error} - 如果获取失败或API返回错误
 */
export const fetchTikTokUserProfile = async (tiktokUserId: string, jinaApiKey: string): Promise<string> => {
  console.log(`[jinaService] Attempting to fetch profile for: ${tiktokUserId} using Jina Key (last 4 chars): ...${jinaApiKey.slice(-4)}`);

  try {
    if (!tiktokUserId || !jinaApiKey) {
      throw new Error('TikTok用户ID和Jina AI API Key是必填项');
    }

    const tiktokUrl = encodeURI(`https://www.tiktok.com/@${tiktokUserId}`);
    console.log(`[jinaService] Constructed TikTok URL: ${tiktokUrl}`);

    const headers = {
      'Authorization': `Bearer ${jinaApiKey}`,
      'X-Return-Format': 'markdown',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    console.log('[jinaService] Request Headers for Jina:', JSON.stringify(headers, null, 2));

    const requestBody = {
      url: tiktokUrl
    };
    console.log('[jinaService] Request Body for Jina:', JSON.stringify(requestBody, null, 2));

    const axiosConfig = {
      headers,
      timeout: 45000, // 45秒超时
      validateStatus: (status: number) => status >= 200 && status < 300 // 只接受2xx状态码为成功
    };

    const response = await axios.post(JINA_SIMPLE_READER_URL, requestBody, axiosConfig);

    console.log('[jinaService] Jina API Response Status:', response.status);
    // console.log('[jinaService] Full Jina API Response Data:', JSON.stringify(response.data, null, 2)); // 可用于调试

    if (!response?.data?.data?.content) { // 确保检查 response.data.data.content
      console.error('[jinaService] Invalid or empty content in Jina AI Reader API response. Full response data:', response?.data);
      throw new Error('从Jina AI Reader API返回的Markdown内容为空或无效 (期望 response.data.data.content 包含Markdown)');
    }

    console.log('[jinaService] Successfully fetched and received markdown content.');
    return response.data.data.content;

  } catch (error: unknown) { // 修复: 'any' 替换为 'unknown'
    let errorMessage = `获取TikTok用户资料失败: ${error instanceof Error ? error.message : String(error)}`; // 修复: 安全地访问 error.message
    if (axios.isAxiosError(error)) {
      console.error('[jinaService] Axios Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        request_url: error.config?.url,
        request_method: error.config?.method,
      });
      if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
        errorMessage = '连接超时 - Jina AI Reader API 未响应';
      } else if (error.response) {
        const jinaError = error.response.data?.error || error.response.data?.detail || error.response.data?.message || JSON.stringify(error.response.data);
        errorMessage = `Jina API 错误: ${error.response.status} - ${jinaError}`;
        if (error.response.status === 401) errorMessage = 'Jina API 错误: 401 - 未授权。请检查您的Jina API Key是否正确或有效。';
        else if (error.response.status === 403) errorMessage = 'Jina API 错误: 403 - 禁止访问。可能是API Key权限不足或访问被拒。';
        else if (error.response.status === 429) errorMessage = 'Jina API 错误: 429 - 请求过于频繁。请稍后再试。';
      } else if (error.request) {
        errorMessage = '未收到 Jina AI Reader API 的响应 - 请检查您的网络连接或Jina服务状态';
      }
    } else {
      console.error('[jinaService] Non-Axios Error:', error);
    }
    throw new Error(errorMessage);
  }
};