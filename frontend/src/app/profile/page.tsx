'use client';

import PrimaryTabsNav from '@/components/PrimaryTabsNav';
import PsychProfilePanel from '@/components/PsychProfilePanel';

const NOTES = [
  '画像会结合历史画像、近期虚拟训练、临床辅助决策和 MDT 讨论记录进行增量更新。',
  '它描述的是学习风格、决策风格、风险偏好和协作倾向，不做疾病诊断或人格定性。',
  '当样本不足时，系统会主动降低可信度，避免把短期行为误判为稳定特征。',
] as const;

const SOURCES = [
  { title: '虚拟训练证据', desc: '读取训练完成次数、评分、问诊对话和病例复盘。' },
  { title: '临床决策证据', desc: '读取临床病例、AI 共识、风险提示和处方决策轨迹。' },
  { title: '连续迭代逻辑', desc: '保留上一版画像，在新证据进入后做连续更新而不是重新清零。' },
] as const;

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/80">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <PrimaryTabsNav />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Personalized Profile</p>
            <h1 className="mt-3 text-4xl font-black text-slate-900 dark:text-white">个性化心理画像</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              这里单独汇总账号在虚拟训练、临床辅助决策和 MDT 协作中的行为证据，形成持续更新的动态画像。
              页面只展示画像内容，不再挤占训练、临床和医生后台的主流程空间。
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">使用说明</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {NOTES.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </div>
        </div>

        <PsychProfilePanel title="账号级个性化心理画像" className="mt-6" />

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {SOURCES.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.desc}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
