// app/api/handler/route.ts
import { fetchTikTokUserProfile } from '@/lib/jinaService'; // 使用 @ 别名
import { extractUserStats } from '@/lib/parser';       // 使用 @ 别名
import { NextResponse } from 'next/server'; // Next.js 13+ App Router 的新响应对象

// 处理 OPTIONS 请求，用于 CORS 预检
export async function OPTIONS() {
  const response = NextResponse.json({}, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// 处理 POST 请求
export async function POST(req: Request) {
  try {
    const { tiktokUserId, jinaApiKey } = await req.json(); 
    console.log('[API Handler] Received POST request with body:', { tiktokUserId, jinaApiKey: jinaApiKey ? `...${jinaApiKey.slice(-4)}` : 'N/A' });

    // --- 参数校验 ---
    if (!tiktokUserId || !jinaApiKey) {
      console.log('[API Handler] Missing tiktokUserId or jinaApiKey');
      return NextResponse.json({ 
        success: false, 
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'TikTok用户ID和Jina AI API Key是必填项' 
        }
      }, { status: 400 });
    }

    // --- 调用Jina AI服务获取Markdown内容 ---
    console.log(`[API Handler] Calling Jina AI service for ${tiktokUserId}`);
    const markdownContentFromJina = await fetchTikTokUserProfile(tiktokUserId, jinaApiKey);
    console.log('[API Handler] Markdown content received from Jina:', markdownContentFromJina ? markdownContentFromJina.substring(0, 200) + '...' : 'No markdown content from Jina');
    
    // --- 检查Jina返回内容 ---
    if (!markdownContentFromJina) {
      console.warn('[API Handler] Jina AI returned empty or null markdown content.');
      return NextResponse.json({ 
          success: false,
          error: {
              code: 'JINA_EMPTY_RESPONSE',
              message: '无法从目标用户页面获取有效内容，请稍后再试或检查用户ID是否正确。'
          }
      }, { status: 502 }); // 502 Bad Gateway 或 500 Internal Server Error
    }
    
    // --- 解析用户统计数据 ---
    const stats = extractUserStats(markdownContentFromJina);
    console.log('[API Handler] Stats processed/parsed:', stats);

    // --- 检查解析结果 ---
    if (stats.followingCount === '-' && stats.followersCount === '-' && stats.likesCount === '-') {
      console.warn('[API Handler] Failed to parse key stats from markdown. Markdown might have an unexpected format or be incomplete.');
      return NextResponse.json({ 
          success: false, 
          error: { 
              code: 'PARSING_FAILED',
              message: '成功获取页面内容，但未能解析出关注、粉丝或获赞数据。页面结构可能已更改或内容不完整。'
          },
          data: stats // 仍然返回部分解析结果，供调试或前端显示
      }, { status: 200 }); // 200 OK，但 success: false 表示业务逻辑失败
    }

    // --- 成功响应 ---
    return NextResponse.json({ success: true, data: stats }, { status: 200 });

  } catch (error: any) {
    console.error('[API Handler] Error processing POST request:', error.message);
    console.error(error.stack); 
    
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = error.message || '服务器内部错误处理请求失败';

    // 根据JinaService抛出的错误信息，细化错误码
    if (errorMessage.includes('Jina API 错误: 401')) {
      errorCode = 'JINA_UNAUTHORIZED';
    } else if (errorMessage.includes('Jina API 错误: 403')) {
      errorCode = 'JINA_FORBIDDEN';
    } else if (errorMessage.includes('Jina API 错误: 429')) {
      errorCode = 'JINA_RATE_LIMITED';
    } else if (errorMessage.includes('连接超时')) {
      errorCode = 'JINA_TIMEOUT';
    } else if (errorMessage.includes('Markdown内容为空或无效')) { 
      errorCode = 'JINA_INVALID_RESPONSE_CONTENT';
    } else if (errorMessage.includes('无法从目标用户页面获取有效内容')) { 
      errorCode = 'JINA_EMPTY_RESPONSE'; // 对应JinaService中的错误
    }

    return NextResponse.json({ 
      success: false, 
      error: {
        code: errorCode,
        message: errorMessage
      }
    }, { status: 500 });
  }
}