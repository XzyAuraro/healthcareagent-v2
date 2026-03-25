'use client';

import { useEffect, useState } from 'react';

import { authApi, type PsychProfile } from '@/lib/api';

type PsychProfilePanelProps = {
  compact?: boolean;
  className?: string;
  title?: string;
};

function formatTime(value?: string | null): string {
  if (!value) return '未生成';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN', { hour12: false });
}

export default function PsychProfilePanel({
  compact = false,
  className = '',
  title = '医生心理画像',
}: PsychProfilePanelProps) {
  const [profile, setProfile] = useState<PsychProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setError('');
        const result = await authApi.getProfile();
        if (active) {
          setProfile(result);
        }
      } catch (loadError) {
        if (!active) return;
        if (typeof loadError === 'object' && loadError !== null) {
          const response = (loadError as { response?: { data?: { detail?: string } } }).response;
          setError(response?.data?.detail || '心理画像读取失败');
        } else {
          setError('心理画像读取失败');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const refreshProfile = async () => {
    try {
      setRefreshing(true);
      setError('');
      const result = await authApi.refreshProfile();
      setProfile(result);
    } catch (refreshError) {
      if (typeof refreshError === 'object' && refreshError !== null) {
        const response = (refreshError as { response?: { data?: { detail?: string } } }).response;
        setError(response?.data?.detail || '心理画像刷新失败');
      } else {
        setError('心理画像刷新失败');
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <p className="text-sm text-slate-500">心理画像生成中...</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">当前暂无可用画像。</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            disabled={refreshing}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {refreshing ? '生成中...' : '生成画像'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Profile</p>
          <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{profile.headline}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshProfile()}
          disabled={refreshing}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-cyan-500 hover:text-cyan-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
        >
          {refreshing ? '刷新中...' : '刷新画像'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-700">可信度 {profile.confidence}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">版本 {profile.version}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          更新于 {formatTime(profile.updated_at)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.traits.map((trait) => (
          <span key={trait} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {trait}
          </span>
        ))}
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">优势</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {profile.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">关注点</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {profile.watchouts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        {!compact && (
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {profile.coaching.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-[1.3fr_0.9fr]'}`}>
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">变化说明</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.evolution}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">证据摘要</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="text-xs text-slate-400">训练完成</p>
              <p className="mt-1 font-semibold">{profile.evidence.completed_trainings}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">平均分</p>
              <p className="mt-1 font-semibold">{profile.evidence.average_score.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">临床案例</p>
              <p className="mt-1 font-semibold">{profile.evidence.recent_clinical_cases}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">训练样本</p>
              <p className="mt-1 font-semibold">{profile.evidence.recent_training_samples}</p>
            </div>
          </div>
        </div>
      </div>

      {compact && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {profile.coaching.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </section>
  );
}
