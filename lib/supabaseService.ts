// lib/supabaseService.ts
import { createClient } from '@supabase/supabase-js';

// Supabase 连接信息将从环境变量中读取
// 在本地开发时，它们来自 .env.local 文件
// 在Vercel线上部署时，它们来自Vercel项目配置的环境变量
const supabaseUrl = process.env.SUPABASE_URL; // 修复: 移除 NEXT_PUBLIC_ 前缀
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service Role Key，不带 NEXT_PUBLIC_

if (!supabaseUrl || !supabaseKey) {
    console.error('[SupabaseService] Supabase URL or Service Key is missing. Please check environment variables.');
    // 在生产环境中，如果缺少关键环境变量，应该抛出错误或阻止应用启动
    // 但为了开发调试，我们暂时只打印错误并让 supabase 客户端为 null
}

// 只有在URL和Key都存在时才创建客户端实例
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const HISTORY_TABLE_NAME = 'query_history'; // 我们将在Supabase中创建的表名

/**
 * 保存查询历史到Supabase
 * @param {string} jinaApiKeyIdentifier - Jina API Key的标识符 (例如哈希值或部分字符串)
 * @param {string} tiktokUserId - TikTok用户ID
 * @param {string} followingCount - 关注数
 * @param {string} followersCount - 粉丝数
 * @param {string} likesCount - 获赞数
 * @returns {Promise<object|null>} - 保存的记录或在出错时返回null
 */
export const saveQueryToSupabase = async (
    jinaApiKeyIdentifier: string,
    tiktokUserId: string,
    followingCount: string,
    followersCount: string,
    likesCount: string
): Promise<object | null> => {
    if (!supabase) {
        console.error('[SupabaseService] Supabase client is not initialized. Cannot save history.');
        return null;
    }
    console.log(`[SupabaseService] Attempting to save history for ${tiktokUserId} under key ID: ${jinaApiKeyIdentifier}`);
    try {
        const { data, error } = await supabase
            .from(HISTORY_TABLE_NAME)
            .insert([
                {
                    jina_api_key_identifier: jinaApiKeyIdentifier,
                    tiktok_user_id: tiktokUserId,
                    following_count: followingCount,
                    followers_count: followersCount,
                    likes_count: likesCount,
                    queried_at: new Date().toISOString() // Supabase会自动处理时间戳，但我们也可以手动插入
                }
            ])
            .select(); // .select() 会返回插入的记录

        if (error) {
            console.error('[SupabaseService] Error saving history to Supabase:', error);
            throw error; // 向上抛出错误，让调用者处理
        }
        console.log('[SupabaseService] History saved successfully to Supabase:', data);
        return data ? data[0] : null; // insert().select() 返回一个数组
    } catch (err: unknown) {
        console.error('[SupabaseService] Exception when saving history:', err instanceof Error ? err.message : String(err));
        return null;
    }
};

/**
 * 从Supabase获取指定Jina API Key标识符的查询历史
 * @param {string} jinaApiKeyIdentifier - Jina API Key的标识符
 * @returns {Promise<Array<object>|null>} - 查询历史记录数组或在出错时返回null
 */
export const getQueryHistoryFromSupabase = async (jinaApiKeyIdentifier: string): Promise<Array<object> | null> => {
    if (!supabase) {
        console.error('[SupabaseService] Supabase client is not initialized. Cannot get history.');
        return null;
    }
    console.log(`[SupabaseService] Attempting to fetch history for key ID: ${jinaApiKeyIdentifier}`);
    try {
        const { data, error } = await supabase
            .from(HISTORY_TABLE_NAME)
            .select('*')
            .eq('jina_api_key_identifier', jinaApiKeyIdentifier)
            .order('queried_at', { ascending: false }) // 按查询时间降序排列
            .limit(20); // 最多获取最近20条

        if (error) {
            console.error('[SupabaseService] Error fetching history from Supabase:', error);
            throw error;
        }
        console.log('[SupabaseService] History fetched successfully from Supabase:', data);
        return data;
    } catch (err: unknown) {
        console.error('[SupabaseService] Exception when fetching history:', err instanceof Error ? err.message : String(err));
        return null;
    }
};