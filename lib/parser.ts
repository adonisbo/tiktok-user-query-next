// lib/parser.ts

/**
 * 从Jina AI Reader API返回的Markdown内容中提取TikTok用户统计数据。
 * @param {string} markdown - Jina AI Reader API返回的Markdown字符串
 * @returns {{ followingCount: string, followersCount: string, likesCount: string }} - 提取到的统计数据
 */
export const extractUserStats = (markdown: string): { followingCount: string, followersCount: string, likesCount: string } => {
  try {
    console.log('[parser.ts] Parsing markdown (first 500 chars):', markdown ? markdown.substring(0, 500) + '...' : 'Markdown is null/undefined'); 
    
    if (!markdown || typeof markdown !== 'string') {
        console.warn('[parser.ts] Markdown content is invalid or empty. Returning default stats.');
        return { followingCount: '-', followersCount: '-', likesCount: '-' };
    }

    let followingCount = '-'; 
    let followersCount = '-'; 
    let likesCount = '-';     
    
    // 尝试匹配多种语言和格式的关注数、粉丝数、获赞数
    const followingPattern1 = /([\d.,]+\s*[KkMmBbTt]?)\s*[*\s]*(?:Following|关注)/i;
    const followingPattern2 = /(?:Following|关注)[*\s]*([\d.,]+\s*[KkMmBbTt]?)/i;
    let followingMatch = markdown.match(followingPattern1) || markdown.match(followingPattern2);
    if (followingMatch && followingMatch[1]) {
      followingCount = followingMatch[1].trim().replace(/,/g, '');
    }
    
    const followersPattern1 = /([\d.,]+\s*[KkMmBbTt]?)\s*[*\s]*(?:Followers|粉丝)/i;
    const followersPattern2 = /(?:Followers|粉丝)[*\s]*([\d.,]+\s*[KkMmBbTt]?)/i;
    let followersMatch = markdown.match(followersPattern1) || markdown.match(followersPattern2);
    if (followersMatch && followersMatch[1]) {
      followersCount = followersMatch[1].trim().replace(/,/g, '');
    }
    
    const likesPattern1 = /([\d.,]+\s*[KkMmBbTt]?)\s*[*\s]*(?:Likes|获赞|喜欢)/i;
    const likesPattern2 = /(?:Likes|获赞|喜欢)[*\s]*([\d.,]+\s*[KkMmBbTt]?)/i;
    let likesMatch = markdown.match(likesPattern1) || markdown.match(likesPattern2);
    if (likesMatch && likesMatch[1]) {
      likesCount = likesMatch[1].trim().replace(/,/g, '');
    }
    
    const extractedStats = {
      followingCount,
      followersCount,
      likesCount
    };

    console.log('[parser.ts] Extracted stats with new regex:', extractedStats);
    return extractedStats;

  } catch (error: any) { // 捕获任何类型的错误
    console.error('[parser.ts] Error parsing markdown:', error.message);
    return { followingCount: '-', followersCount: '-', likesCount: '-' };
  }
};