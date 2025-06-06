// app/page.tsx
'use client'; // 标记为客户端组件，以便使用useState和useEffect等Hooks

import { useState } from 'react';

// 定义用户统计数据的类型
interface UserStats {
  followingCount: string;
  followersCount: string;
  likesCount: string;
}

// 定义API错误响应的类型
interface ApiResponseError {
  code: string;
  message: string;
}

export default function Home() {
  const [tiktokUserId, setTiktokUserId] = useState<string>('');
  const [jinaApiKey, setJinaApiKey] = useState<string>('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 阻止表单默认提交行为

    setLoading(true);
    setError(null);
    setUserStats(null); // 清空上次结果

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
      } else {
        // 处理后端返回的结构化错误
        const errorMessage = result.error?.message || '未知错误发生';
        setError(`查询出错: ${errorMessage}`);
      }
    } catch (err: any) {
      console.error('[Frontend] Fetch error:', err);
      setError(`网络或服务器连接错误: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold mb-8 text-center">TikTok用户信息查询</h1>

      <section className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">查询用户信息</h2>
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
    </main>
  );
}