// app/api/history/get/route.ts
import { getQueryHistoryFromSupabase } from '@/lib/supabaseService'; // 使用 @ 别名
import { createApiKeyIdentifier } from '@/lib/helpers';   // 使用 @ 别名
import { NextResponse } from 'next/server';

// 处理 OPTIONS 请求，用于 CORS 预检
export async function OPTIONS() {
    const response = NextResponse.json({}, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

// 处理 POST 请求
export async function POST(req: Request) { // 改为POST以接收jinaApiKey
    try {
        const { jinaApiKey } = await req.json(); // 从请求体中获取jinaApiKey

        console.log('[API History Get] Received request with body:', { jinaApiKey: jinaApiKey ? `...${jinaApiKey.slice(-4)}` : 'N/A' });

        if (!jinaApiKey) {
            console.log('[API History Get] Missing jinaApiKey parameter.');
            return NextResponse.json({
                success: false,
                error: {
                    code: 'MISSING_JINA_API_KEY',
                    message: '获取云端历史记录需要提供Jina AI API Key。'
                }
            }, { status: 400 });
        }

        const jinaApiKeyIdentifier = createApiKeyIdentifier(jinaApiKey);

        const historyItems = await getQueryHistoryFromSupabase(jinaApiKeyIdentifier);

        if (historyItems !== null) { // getQueryHistoryFromSupabase 在出错时返回 null
            console.log('[API History Get] History items fetched successfully:', historyItems);
            return NextResponse.json({ success: true, data: historyItems }, { status: 200 });
        } else {
            throw new Error('Supabase服务未能成功获取历史记录。');
        }

    } catch (error: unknown) { // 修复: 'any' 替换为 'unknown'
        console.error('[API History Get] Error fetching history:', error); // 记录原始错误
        if (error instanceof Error) {
            console.error(error.stack); // 打印堆栈信息
        }

        let errorMessage = error instanceof Error ? error.message : String(error); // 修复: 安全地访问 error.message
        let errorCode = 'SUPABASE_GET_ERROR';

        return NextResponse.json({
            success: false,
            error: {
                code: errorCode,
                message: errorMessage || '获取云端历史记录时发生服务器内部错误。'
            }
        }, { status: 500 });
    }
}