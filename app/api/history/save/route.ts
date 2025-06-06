// app/api/history/save/route.ts
import { saveQueryToSupabase } from '@/lib/supabaseService'; // 使用 @ 别名
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
export async function POST(req: Request) {
    try {
        const {
            jinaApiKey, // 需要Jina API Key来生成标识符
            tiktokUserId,
            followingCount,
            followersCount,
            likesCount,
        } = await req.json();

        console.log('[API History Save] Received request with body:', { tiktokUserId, jinaApiKey: jinaApiKey ? `...${jinaApiKey.slice(-4)}` : 'N/A' });

        if (!jinaApiKey || !tiktokUserId || followingCount === undefined || followersCount === undefined || likesCount === undefined) {
            console.log('[API History Save] Missing required parameters.');
            return NextResponse.json({
                success: false,
                error: {
                    code: 'MISSING_HISTORY_SAVE_PARAMETERS',
                    message: '保存历史记录所需参数不完整 (需要jinaApiKey, tiktokUserId, followingCount, followersCount, likesCount)。'
                }
            }, { status: 400 });
        }

        const jinaApiKeyIdentifier = createApiKeyIdentifier(jinaApiKey);

        const savedItem = await saveQueryToSupabase(
            jinaApiKeyIdentifier,
            tiktokUserId,
            String(followingCount), // 确保是字符串
            String(followersCount),
            String(likesCount)
        );

        if (savedItem) {
            console.log('[API History Save] History item saved successfully:', savedItem);
            return NextResponse.json({ success: true, data: savedItem }, { status: 201 }); // 201 Created
        } else {
            throw new Error('Supabase服务未能成功保存历史记录。');
        }

    } catch (error: unknown) { // 修复: 'any' 替换为 'unknown'
        console.error('[API History Save] Error saving history:', error); // 记录原始错误
        if (error instanceof Error) {
            console.error(error.stack); // 打印堆栈信息
        }

        let errorMessage = error instanceof Error ? error.message : String(error); // 修复: 安全地访问 error.message
        let errorCode = 'SUPABASE_SAVE_ERROR';

        // 可以根据 Supabase 错误对象进一步细化错误码，但通常通用错误已足够
        // if (errorMessage.includes('Supabase specific error message')) {
        //     errorCode = 'SPECIFIC_SUPABASE_ERROR';
        // }

        return NextResponse.json({
            success: false,
            error: {
                code: errorCode,
                message: errorMessage || '保存历史记录到云端时发生服务器内部错误。'
            }
        }, { status: 500 });
    }
}