// app/api/history/save/route.ts
import { saveQueryToSupabase } from '@/lib/supabaseService';
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
        const {
            jinaApiKey,
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
            String(followingCount),
            String(followersCount),
            String(likesCount)
        );

        if (savedItem) {
            console.log('[API History Save] History item saved successfully:', savedItem);
            return NextResponse.json({ success: true, data: savedItem }, { status: 201 });
        } else {
            throw new Error('Supabase服务未能成功保存历史记录。');
        }

    } catch (error: unknown) {
        console.error('[API History Save] Error saving history:', error);
        if (error instanceof Error) {
            console.error(error.stack);
        }

        // 修复: 使用 const 声明 errorMessage 和 errorCode
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = 'SUPABASE_SAVE_ERROR';

        return NextResponse.json({
            success: false,
            error: {
                code: errorCode,
                message: errorMessage || '保存历史记录到云端时发生服务器内部错误。'
            }
        }, { status: 500 });
    }
}