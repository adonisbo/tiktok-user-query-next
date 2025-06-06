// app/page.tsx
'use client';

import { useState, useEffect } from 'react';

// 定义用户统计数据的类型
interface UserStats {
  followingCount: string;
  followersCount: string;
  likesCount: string;
}

// 定义历史记录项的类型 (本地存储用驼峰命名，云端存储用下划线命名)
interface HistoryItemLocal {
  tiktokUserId: string;
  followingCount: string;
  followersCount: string;
  likesCount: string;
  queriedAt: string; // ISO string
}

interface HistoryItemCloud {
  id: string;
  created_at: string;
  jina_api_key_identifier: string;
  tiktok_user_id: string;
  following_count: string;
  followers_count: string;
  likes_count: string;
  queried_at: string;
}

export default function Home() {
  const [tiktokUserId, setTiktokUserId] = useState<string>('');
  const [jinaApiKey, setJinaApiKey] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storageOption, setStorageOption] = useState<'local' | 'cloud'>('local');
  const [localHistory, setLocalHistory] = useState<HistoryItemLocal[]>([]);
  const [cloudHistory, setCloudHistory] = useState<HistoryItemCloud[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);


  const LOCAL_STORAGE_KEY = 'tiktokQueryHistoryLocalNext'; // 新的本地存储Key，避免与旧项目冲突
  const MAX_HISTORY_ITEMS = 20;

  // --- 本地历史记录管理 ---
  useEffect(() => {
    // 在组件挂载时加载本地历史
    const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedHistory) {
      try {
        setLocalHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse local history:", e);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // 清除损坏的数据
      }
    }
  }, []);

  const saveToLocalHistory = (item: HistoryItemLocal) => {
    setLocalHistory(prevHistory => {
      const newHistory = [item, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearLocalHistory = () => {
    if (window.confirm('确定要清空所有本地查询历史吗？')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setLocalHistory([]);
    }
  };

  // --- 云端历史记录管理 ---
  const loadCloudHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    setCloudHistory([]); // 清空现有云端历史显示

    if (!jinaApiKey) {
      setHistoryError('请输入Jina AI API Key以加载云端历史。');
      setLoadingHistory(false);
      return;
    }

    try {
      console.log('[Frontend] Loading cloud history from /api/history/get');
      const response = await fetch('/api/history/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jinaApiKey }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setCloudHistory(result.data || []);
      } else {
        const errorMsg = result.error?.message || '未知错误发生';
        setHistoryError(`加载云端历史失败: ${errorMsg}`);
      }
    } catch (err: unknown) {
      console.error('[Frontend] Fetch cloud history error:', err);
      let errorMessage = '网络或服务器连接错误';
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setHistoryError(`调用云端历史API时出错: ${errorMessage}`);
    } finally {
      setLoadingHistory(false);
    }
  };

  // --- 表单提交处理 ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setUserStats(null);

    if (!tiktokUserId || !jinaApiKey) {
      setError('TikTok用户ID和Jina AI API Key均不能为空！');
      setLoading(false);
      return;
    }

    try {
      console.log('[Frontend] Sending query to /api/handler');
      const response = await fetch('/api/handler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiktokUserId, jinaApiKey }),
      });

      const result = await response.json();
      console.log('[Frontend] API response:', result);

      if (response.ok && result.success) {
        setUserStats(result.data);

        // 根据存储选项保存历史
        const historyItem: HistoryItemLocal = {
          tiktokUserId,
          followingCount: result.data.followingCount,
          followersCount: result.data.followersCount,
          likesCount: result.data.likesCount,
          queriedAt: new Date().toISOString(),
        };

        if (storageOption === 'local') {
          saveToLocalHistory(historyItem);
        } else if (storageOption === 'cloud') {
          console.log('[Frontend] Attempting to save to cloud (Supabase)...');
          try {
            const saveCloudResponse = await fetch('/api/history/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...historyItem, // 包含所有统计数据
                jinaApiKey, // 传递Jina API Key用于后端生成标识符
              }),
            });
            const saveCloudResult = await saveCloudResponse.json();

            if (!saveCloudResponse.ok || !saveCloudResult.success) {
              const errorMsg = saveCloudResult.error?.message || saveCloudResult.error || '保存到云端失败';
              setError(`保存到云端失败: ${errorMsg}`);
            } else {
              console.log('[Frontend] Successfully saved to cloud:', saveCloudResult.data);
              // 如果当前显示的是云端历史，则重新加载以显示最新数据
              if (storageOption === 'cloud') {
                loadCloudHistory();
              }
            }
          } catch (cloudError: unknown) {
            console.error('[Frontend] Error calling save to cloud API:', cloudError);
            let errorMessage = '调用云端保存API时出错';
            if (cloudError instanceof Error) {
              errorMessage += `: ${cloudError.message}`;
            }
            setError(errorMessage);
          }
        }
      } else {
        const errorMessage = result.error?.message || '未知错误发生';
        setError(`查询出错: ${errorMessage}`);
      }
    } catch (err: unknown) {
      console.error('[Frontend] Fetch error:', err);
      let errorMessage = '网络或服务器连接错误';
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-gray-100 text-gray-800">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">TikTok用户信息查询</h1>

      <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center">查询用户信息</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tiktokUserId" className="block text-sm font-medium text-gray-700">
              TikTok用户ID:
            </label>
            <input
              type="text"
              id="tiktokUserId"
              value={tiktokUserId}
              onChange={(e) => setTiktokUserId(e.target.value)}
              placeholder="例如: txunamydiamond"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="jinaApiKey" className="block text-sm font-medium text-gray-700">
              Jina AI API Key:
            </label>
            <input
              type="password"
              id="jinaApiKey"
              value={jinaApiKey}
              onChange={(e) => setJinaApiKey(e.target.value)}
              placeholder="输入您的Jina AI API Key"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '查询中...' : '查询'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {userStats && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-center">查询结果</h3>
            <div className="space-y-2">
              <p><strong>TikTok用户ID:</strong> @{tiktokUserId}</p>
              <p><strong>关注数:</strong> {userStats.followingCount}</p>
              <p><strong>粉丝量:</strong> {userStats.followersCount}</p>
              <p><strong>获赞量:</strong> {userStats.likesCount}</p>
            </div>
          </div>
        )}
      </section>

      {/* 历史记录存储选项 */}
      <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-center">历史记录设置</h2>
        <div className="flex justify-center space-x-4 mb-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="storageOption"
              value="local"
              checked={storageOption === 'local'}
              onChange={() => setStorageOption('local')}
              className="form-radio text-blue-600"
            />
            <span className="ml-2 text-gray-700">保存到本地浏览器</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="storageOption"
              value="cloud"
              checked={storageOption === 'cloud'}
              onChange={() => setStorageOption('cloud')}
              className="form-radio text-blue-600"
            />
            <span className="ml-2 text-gray-700">保存到云端 (Supabase)</span>
          </label>
        </div>

        {/* 本地历史记录区域 */}
        {storageOption === 'local' && (
          <div id="local-history-section" className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold mb-3">本地查询历史</h3>
            {localHistory.length === 0 ? (
              <p className="text-gray-600">暂无本地历史记录。</p>
            ) : (
              <ul id="local-history-list" className="space-y-2 text-sm max-h-60 overflow-y-auto">
                {localHistory.map((item, index) => (
                  <li
                    key={index} // 简单索引作为key，实际应用中应使用唯一ID
                    className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setTiktokUserId(item.tiktokUserId)}
                  >
                    <strong>@{item.tiktokUserId}</strong> (查询于: {new Date(item.queriedAt).toLocaleString()})<br />
                    关注: {item.followingCount}, 粉丝: {item.followersCount}, 获赞: {item.likesCount}
                  </li>
                ))}
              </ul>
            )}
            {localHistory.length > 0 && (
              <button
                onClick={clearLocalHistory}
                className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                清空本地历史
              </button>
            )}
          </div>
        )}

        {/* 云端历史记录区域 */}
        {storageOption === 'cloud' && (
          <div id="cloud-history-section" className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold mb-3">云端查询历史 (Supabase)</h3>
            <button
              onClick={loadCloudHistory}
              disabled={loadingHistory}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loadingHistory ? '加载中...' : '加载云端历史'}
            </button>
            {historyError && (
              <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                <p>{historyError}</p>
              </div>
            )}
            {cloudHistory.length === 0 && !loadingHistory && !historyError ? (
              <p className="text-gray-600">暂无云端历史记录或未加载。请输入Jina AI API Key并点击上方“加载云端历史”按钮。</p>
            ) : (
              <ul id="cloud-history-list" className="space-y-2 text-sm max-h-60 overflow-y-auto">
                {cloudHistory.map((item) => (
                  <li
                    key={item.id} // 使用Supabase返回的唯一ID作为key
                    className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setTiktokUserId(item.tiktok_user_id)}
                  >
                    <strong>@{item.tiktok_user_id}</strong> (查询于: {new Date(item.queried_at).toLocaleString()})<br />
                    关注: {item.following_count || '-'}, 粉丝: {item.followers_count || '-'}, 获赞: {item.likes_count || '-'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}