import Image from 'next/image';
import Link from 'next/link';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 p-1.5 shadow-sm shadow-slate-950/15">
                <Image src="/images/logo.png" alt="都梁痛安 Logo" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" />
              </div>
              <h2 className="-ml-0.5 text-sm font-bold tracking-tight text-primary dark:text-white md:text-base">
                都梁痛安·疼痛管理智能辅助平台
              </h2>
            </div>
            <PrimaryTabsNav className="hidden md:flex" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="h-10 w-64 rounded-full border-slate-200 bg-slate-100 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="搜索病例、药物或指南..."
                type="text"
              />
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link href="/login">
              <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold cursor-pointer">
                W
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-12 text-white">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                系统运行良好 · 毫秒级云同步已开启
              </div>
              <h1 className="mb-4 text-4xl font-black md:text-5xl leading-tight">欢迎使用都梁痛安平台</h1>
              <p className="text-lg text-slate-300">
                基于 OC × 百川 三阶辩论引擎，整合 ClinPGx 药物基因组学数据库、OpeFDA 药物相互作用数据、CPIC 临床指南及 331 例真实镇痛病历，提供结构化镇痛处方辅助决策（CDSS），接入电子病历系统，自动匹配最新医学指南，并提供危急值预警。
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/clinical">
                  <button className="rounded-xl bg-accent px-8 py-4 font-bold text-primary transition-transform hover:scale-105">
                    立即开始智能诊断
                  </button>
                </Link>
                <Link href="/doctor">
                  <button className="rounded-xl border border-white/20 bg-white/10 px-8 py-4 font-bold backdrop-blur-sm transition-colors hover:bg-white/20">
                    查看系统报表
                  </button>
                </Link>
                <span className="rounded bg-emerald-400/20 px-3 py-2 text-xs font-bold text-emerald-300">实时接入</span>
                <span className="rounded bg-blue-400/20 px-3 py-2 text-xs font-bold text-blue-300">符合 HIPAA</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/5">
                <p className="text-xs text-slate-400">知识技能库</p>
                <p className="text-2xl font-bold">5 项</p>
                <p className="text-xs text-accent">ClinPGx · FDA · ENT</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/5">
                <p className="text-xs text-slate-400">双模型辩论</p>
                <p className="text-2xl font-bold">3 阶段</p>
                <p className="text-xs text-accent">MiniMax × 百川</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">核心功能模块</h2>
            <p className="text-slate-500">快速进入专业医疗工作台</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Virtual Training Card */}
          <Link href="/training">
            <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">school</span>
              </div>
              <h3 className="mb-3 text-2xl font-bold">虚拟疼痛病例训练场</h3>
              <p className="mb-6 text-slate-500 dark:text-slate-400">
                基于大语言模型的标准化疼痛病人模拟系统，支持多轮问诊、体检开单及预后推演训练。
              </p>
              <div className="absolute right-8 bottom-8">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Real Assistance Card */}
          <Link href="/clinical">
            <div className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">medical_services</span>
              </div>
              <h3 className="mb-3 text-2xl font-bold">多模态AI辅助评估疼痛系统</h3>
              <p className="mb-6 text-slate-500 dark:text-slate-400">
                多模态AI辅助评估疼痛系统（AI-Pain-Asses），接入镇痛类药物辅助决策系统（CDSS），自动导入患者疼痛评估结果
              </p>
              <div className="absolute right-8 bottom-8">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
