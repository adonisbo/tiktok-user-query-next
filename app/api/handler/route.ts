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
      }, { status: 502 });
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
          data: stats
      }, { status: 200 });
    }

    // --- 成功响应 ---
    return NextResponse.json({ success: true, data: stats }, { status: 200 });

  } catch (error: unknown) { // 修复: 'any' 替换为 'unknown'
    console.error('[API Handler] Error processing POST request:', error); // 记录原始错误

    // 使用IIFE来确定errorCode和errorMessage，以满足prefer-const规则
    const { errorCode, errorMessage } = (() => {
        let currentErrorMessage: string = '服务器内部错误处理请求失败';
        let currentErrorCode: string = 'INTERNAL_SERVER_ERROR';

        if (error instanceof Error) { // 修复: 安全地访问 error.message
            console.error(error.stack); // 打印堆栈信息
            currentErrorMessage = error.message;

            // 根据JinaService抛出的错误信息，细化错误码
            if (currentErrorMessage.includes('Jina API 错误: 401')) {
                currentErrorCode = 'JINA_UNAUTHORIZED';
            } else if (currentErrorMessage.includes('Jina API 错误: 403')) {
                currentErrorCode = 'JINA_FORBIDDEN';
            } else if (currentErrorMessage.includes('Jina API 错误: 429')) {
                currentErrorCode = 'JINA_RATE_LIMITED';
            } else if (currentErrorMessage.includes('连接超时')) {
                currentErrorCode = 'JINA_TIMEOUT';
            } else if (currentErrorMessage.includes('Markdown内容为空或无效')) {
                currentErrorCode = 'JINA_INVALID_RESPONSE_CONTENT';
            } else if (currentErrorMessage.includes('无法从目标用户页面获取有效内容')) {
                currentErrorCode = 'JINA_EMPTY_RESPONSE';
            }
        }
        return { errorCode: currentErrorCode, errorMessage: currentErrorMessage };
    })(); // 立即执行函数

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    }, { status: 500 });
  }
}