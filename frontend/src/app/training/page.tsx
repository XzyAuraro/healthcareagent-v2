'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  cardiology: '心内科',
  neurology: '神经内科',
  oncology: '肿瘤科',
  emergency: '急诊科',
};

type TrainingStats = {
  completed_trainings: number;
  simulation_completed_trainings: number;
  case_analysis_completed_trainings: number;
  average_score: number;
};

export default function TrainingPage() {
  const [mode, setMode] = useState<'case' | 'simulation'>('simulation');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [department, setDepartment] = useState('cardiology');
  const [starting, setStarting] = useState(false);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        setStatsError('');
        const response = await fetch('/api/training/stats', {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        setStats((await response.json()) as TrainingStats);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setStatsError(error instanceof Error ? error.message : String(error));
      }
    }

    loadStats();
    return () => controller.abort();
  }, []);

  const handleStart = () => {
    setStarting(true);
    const params = new URLSearchParams({ difficulty, department });
    router.push(
      mode === 'case'
        ? `/training/case?${params.toString()}`
        : `/training/session?${params.toString()}`
    );
  };

  return (
    <div className="min-h-screen bg-background-light font-display dark:bg-background-dark">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/80">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <PrimaryTabsNav />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-black text-slate-900 dark:text-white">
            虚拟疼痛病例训练场
          </h1>
          <p className="text-slate-500">
            基于 OC 与百川模型的标准化医学训练平台，支持病例分析与模拟问诊。
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">auto_stories</span>
              训练模式
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={() => setMode('case')}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  mode === 'case'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      mode === 'case'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">description</span>
                  </div>
                  <span className="font-bold text-sm">模式一·病例分析</span>
                  <span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    传统
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  阅读完整病例摘要，在限定时间内完成诊断与用药方案，AI 按评分标准输出反馈。
                </p>
              </button>

              <button
                onClick={() => setMode('simulation')}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  mode === 'simulation'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      mode === 'simulation'
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">forum</span>
                  </div>
                  <span className="font-bold text-sm">模式二·模拟问诊</span>
                  <span className="ml-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    推荐
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  AI 扮演患者，通过多轮问诊采集病史与检查信息，对问诊过程与诊疗思路综合评分。
                </p>
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">tune</span>
              训练难度
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { value: 'beginner', label: '初级', desc: '基础病例，适合实习医生' },
                { value: 'intermediate', label: '中级', desc: '复杂病例，适合住院医师' },
                { value: 'advanced', label: '高级', desc: '疑难杂症，适合主治及以上' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDifficulty(item.value)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    difficulty === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                  }`}
                >
                  <p className="text-sm font-bold">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">local_hospital</span>
              选择科室
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { value: 'cardiology', label: '心内科', icon: 'cardiology' },
                { value: 'neurology', label: '神经内科', icon: 'neurology' },
                { value: 'oncology', label: '肿瘤科', icon: 'oncology' },
                { value: 'emergency', label: '急诊科', icon: 'emergency' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDepartment(item.value)}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    department === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined mb-2 block text-2xl text-primary">
                    {item.icon}
                  </span>
                  <p className="text-sm font-bold">{item.label}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {starting ? '正在进入训练…' : `开始训练 · ${mode === 'case' ? '病例分析' : '模拟问诊'}`}
          </button>

          <p className="text-center text-sm text-slate-500">
            {mode === 'case'
              ? `病例分析模式 · ${DIFFICULTY_LABELS[difficulty]} · ${DEPARTMENT_LABELS[department]} · 限时 ${
                  difficulty === 'beginner' ? '15' : difficulty === 'intermediate' ? '10' : '8'
                } 分钟`
              : `模拟问诊模式 · ${DIFFICULTY_LABELS[difficulty]} · ${DEPARTMENT_LABELS[department]} · AI 扮演患者`}
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-3xl font-black text-primary">
                {stats ? stats.completed_trainings : '--'}
              </p>
              <p className="mt-1 text-sm text-slate-500">已完成训练</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-3xl font-black text-emerald-600">
                {stats ? `${stats.average_score.toFixed(1)}分` : '--'}
              </p>
              <p className="mt-1 text-sm text-slate-500">平均得分</p>
            </div>
          </div>

          {stats && (
            <p className="text-center text-sm text-slate-500">
              模拟问诊 {stats.simulation_completed_trainings} 次，病例分析 {stats.case_analysis_completed_trainings} 次
            </p>
          )}

          {statsError && (
            <p className="text-center text-xs text-red-500">
              训练统计读取失败：{statsError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
