// lib/helpers.ts
// import crypto from 'crypto'; // Node.js 内置模块，如果需要使用哈希则取消注释

/**
 * 为Jina AI API Key创建一个简单的标识符。
 * 仅取Key的前4位和后4位。
 * @param {string} apiKey - Jina AI API Key
 * @returns {string} - API Key的标识符
 */
export const createApiKeyIdentifier = (apiKey: string): string => {
  // 简单标识: 取Key的前4位和后4位
  if (typeof apiKey === 'string' && apiKey.length > 8) {
    return `${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`;
  }
  // 如果Key太短或不是字符串，返回一个固定标识或处理错误
  return 'invalid_or_short_api_key';
};

/*
// 如果确实需要哈希，可以使用Node.js的crypto模块
export const createApiKeyHash = (apiKey: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(apiKey);
  return hash.digest('hex').substring(0, 16); // 取哈希值的前16位
};
*/