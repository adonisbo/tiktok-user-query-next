// app/api/history/get/route.ts
import { getQueryHistoryFromSupabase } from '@/lib/supabaseService';
import { createApiKeyIdentifier } from '@/lib/helpers';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
    const response = NextResponse.json({}, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function POST(req: Request) {
    try {
        const { jinaApiKey } = await req.json();

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

        if (historyItems !== null) {
            console.log('[API History Get] History items fetched successfully:', historyItems);
            return NextResponse.json({ success: true, data: historyItems }, { status: 200 });
        } else {
            throw new Error('Supabase服务未能成功获取历史记录。');
        }

    } catch (error: unknown) {
        console.error('[API History Get] Error fetching history:', error);
        if (error instanceof Error) {
            console.error(error.stack);
        }

        // 修复: 使用 const 声明 errorMessage 和 errorCode
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = 'SUPABASE_GET_ERROR';

        return NextResponse.json({
            success: false,
            error: {
                code: errorCode,
                message: errorMessage || '获取云端历史记录时发生服务器内部错误。'
            }
        }, { status: 500 });
    }
}