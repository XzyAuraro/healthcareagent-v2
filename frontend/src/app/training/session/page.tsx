import Link from 'next/link';
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

type SessionPageProps = {
  searchParams?: {
    difficulty?: string | string[];
    department?: string | string[];
  };
};

function readParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

export default function TrainingSessionPage({ searchParams }: SessionPageProps) {
  const difficulty = readParam(searchParams?.difficulty, 'intermediate');
  const department = readParam(searchParams?.department, 'cardiology');

  const configSummary = {
    difficulty: DIFFICULTY_LABELS[difficulty] ?? '中级',
    department: DEPARTMENT_LABELS[department] ?? '心内科',
  };

  return (
    <main className="min-h-screen bg-background-light font-display dark:bg-background-dark">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/80">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <PrimaryTabsNav />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined">school</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">虚拟病例训练会话</h1>
              <p className="text-sm text-slate-500">已完成配置，等待训练 Agent 生成病例</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500">训练难度</p>
              <p className="mt-1 text-lg font-bold">{configSummary.difficulty}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500">训练科室</p>
              <p className="mt-1 text-lg font-bold">{configSummary.department}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-slate-600 dark:text-slate-300">
            当前为前端占位流程。你后续接入 Agent 后，可在此页面触发“生成虚拟病例 → 进入多轮问诊”。
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/training"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
            >
              返回重选配置
            </Link>
            <button
              type="button"
              disabled
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white opacity-70"
            >
              等待 Agent 接入
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
