'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

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

export default function TrainingPage() {
  const [difficulty, setDifficulty] = useState('intermediate');
  const [department, setDepartment] = useState('cardiology');
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  const handleStartTraining = () => {
    setStarting(true);
    const params = new URLSearchParams({ difficulty, department });
    router.push(`/training/session?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <PrimaryTabsNav />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">虚拟病例训练系统</h1>
          <p className="text-slate-500 text-lg">基于 AI 构建的 50,000+ 标准化病人，支持多轮问诊、体检开单及预后推演</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8">
          {/* Difficulty Selection */}
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span>训练难度
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'beginner', label: '初级', desc: '基础病例，适合实习医生' },
                { value: 'intermediate', label: '中级', desc: '复杂病例，适合住院医师' },
                { value: 'advanced', label: '高级', desc: '疑难杂症，适合主治以上' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDifficulty(item.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    difficulty === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <p className="font-bold text-sm">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">local_hospital</span>选择科室
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'cardiology', label: '心内科', icon: 'cardiology' },
                { value: 'neurology', label: '神经内科', icon: 'neurology' },
                { value: 'oncology', label: '肿瘤科', icon: 'oncology' },
                { value: 'emergency', label: '急诊科', icon: 'emergency' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDepartment(item.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    department === item.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl text-primary mb-2">{item.icon}</span>
                  <p className="font-bold text-sm">{item.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartTraining}
            disabled={starting}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {starting ? '正在进入训练会话...' : '开始训练'}
          </button>
          <p className="text-center text-sm text-slate-500">
            当前选择：{DIFFICULTY_LABELS[difficulty]} · {DEPARTMENT_LABELS[department]}，点击后将进入训练会话页。
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-3xl font-black text-primary">128</p>
            <p className="text-sm text-slate-500 mt-1">已完成训练</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-3xl font-black text-success">92%</p>
            <p className="text-sm text-slate-500 mt-1">平均正确率</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-3xl font-black text-info">Top 15%</p>
            <p className="text-sm text-slate-500 mt-1">全国排名</p>
          </div>
        </div>
      </main>
    </div>
  );
}
