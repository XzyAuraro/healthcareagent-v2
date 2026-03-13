'use client';

import { useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

type DebateResponse = {
  oc_answer: string;
  baichuan_review: string;
  consensus: string;
  risk_warning: string; // "red" | "green"
  mme_warning: string;  // "" | warning text
};

const REFERENCE_ITEMS = [
  {
    title: 'CPIC 阿片类药物药物基因组学指南（CYP2D6/OPRM1）2023',
    source: 'CPIC Guidelines',
    date: '2023-06-15',
  },
  {
    title: 'WHO 癌痛规范化治疗指南 2022',
    source: 'WHO',
    date: '2022-03-01',
  },
  {
    title: 'NCCN 肿瘤姑息治疗指南 v2.2024',
    source: 'NCCN',
    date: '2024-01-10',
  },
  {
    title: '中华疼痛学会：阿片类药物临床应用指导原则 2021',
    source: '中华疼痛学会',
    date: '2021-11-20',
  },
];

export default function ClinicalPage() {
  // 患者基础信息
  const [age, setAge] = useState('62');
  const [gender, setGender] = useState('女');
  const [diagnosis, setDiagnosis] = useState('肺癌骨转移（T4N2M1b），继发性骨痛');
  const [department, setDepartment] = useState('疼痛科');
  // 疼痛评估
  const [painScore, setPainScore] = useState('7');
  const [painType, setPainType] = useState('癌性疼痛');
  // 当前用药
  const [currentOpioid, setCurrentOpioid] = useState('无');
  const [currentDose, setCurrentDose] = useState('0');
  const [currentFreq, setCurrentFreq] = useState('无');
  // 拟开具药物
  const [planDrug, setPlanDrug] = useState('吗啡缓释片');
  const [planDose, setPlanDose] = useState('30');
  const [planFreq, setPlanFreq] = useState('2');
  const [mmeDay, setMmeDay] = useState('60');
  // 风险因素
  const [ortScore, setOrtScore] = useState('3');
  const [ortLevel, setOrtLevel] = useState('低风险');
  const [comorbidities, setComorbidities] = useState('2型糖尿病，高血压');
  const [allergies, setAllergies] = useState('可待因（恶心呕吐）');
  const [adverseHist, setAdverseHist] = useState('无');
  // 补充
  const [extraNotes, setExtraNotes] = useState('');
  // UI 状态
  const [chatInput, setChatInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DebateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const canAnalyze = diagnosis.trim().length > 0 && age.trim().length > 0;

  const handleAnalyze = async () => {
    setErrorMessage('');
    if (!canAnalyze) return;
    setAnalyzing(true);
    try {
      const response = await fetch('/api/clinical/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: Number.parseInt(age, 10) || 50,
          gender,
          diagnosis,
          department,
          pain_score: Number.parseInt(painScore, 10) || 5,
          pain_type: painType,
          current_opioid: currentOpioid || '无',
          current_dose: Number.parseFloat(currentDose) || 0,
          current_freq: currentFreq || '无',
          plan_drug: planDrug || '无',
          plan_dose: Number.parseFloat(planDose) || 0,
          plan_freq: Number.parseInt(planFreq, 10) || 2,
          mme_day: Number.parseFloat(mmeDay) || 0,
          ort_score: Number.parseInt(ortScore, 10) || 0,
          ort_level: ortLevel,
          comorbidities: comorbidities || '无',
          allergies: allergies || '无',
          adverse_hist: adverseHist || '无',
          extra_notes: extraNotes || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as DebateResponse;
      setResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`分析失败，请检查后端服务。${message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const riskLabel =
    result?.risk_warning === 'red'
      ? { text: '高风险', className: 'text-red-600 bg-red-50 border-red-100' }
      : result?.risk_warning === 'green'
        ? { text: '低风险', className: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
        : { text: '待评估', className: 'text-slate-600 bg-slate-50 border-slate-200' };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light font-display text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-1.5 text-white">
              <span className="material-symbols-outlined text-xl">medical_services</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">临床决策辅助系统</h2>
          </div>
          <PrimaryTabsNav className="hidden md:flex" />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="h-10 w-64 rounded-full border-none bg-slate-100 pl-10 text-sm focus:ring-2 focus:ring-primary/50 dark:bg-slate-800"
              placeholder="搜索药品、指南、文献..."
            />
          </div>
          <button className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
            W
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* ── 左侧：病例录入 ── */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              病例录入工作台
            </h3>
          </div>

          <div className="space-y-5 p-5">
            {/* 患者基础信息 */}
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                患者基础信息
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">年龄</label>
                  <input
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">性别</label>
                  <select
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option>男</option>
                    <option>女</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">科室</label>
                <input
                  className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">初步诊断</label>
                <textarea
                  className="min-h-[72px] w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                  placeholder="请输入诊断与主诉..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
            </section>

            {/* 疼痛评估 */}
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                疼痛评估
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">疼痛评分（NRS）</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={painScore}
                    onChange={(e) => setPainScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">疼痛类型</label>
                  <select
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={painType}
                    onChange={(e) => setPainType(e.target.value)}
                  >
                    <option>非癌性慢性疼痛</option>
                    <option>癌性疼痛</option>
                    <option>急性疼痛</option>
                    <option>神经病理性疼痛</option>
                  </select>
                </div>
              </div>
            </section>

            {/* 用药信息 */}
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                用药信息
              </h4>
              <div className="space-y-2 text-xs text-slate-500">
                <p className="font-medium">当前阿片类药物</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label>药品</label>
                    <input
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={currentOpioid}
                      onChange={(e) => setCurrentOpioid(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>剂量(mg)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={currentDose}
                      onChange={(e) => setCurrentDose(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>频次</label>
                    <input
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={currentFreq}
                      onChange={(e) => setCurrentFreq(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs text-slate-500">
                <p className="font-medium">拟开具药物</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label>药品</label>
                    <input
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={planDrug}
                      onChange={(e) => setPlanDrug(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>剂量(mg)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={planDose}
                      onChange={(e) => setPlanDose(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>频次(/天)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={planFreq}
                      onChange={(e) => setPlanFreq(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label>MME/day</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      value={mmeDay}
                      onChange={(e) => setMmeDay(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 风险因素 */}
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                风险因素
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">ORT 评分</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={ortScore}
                    onChange={(e) => setOrtScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">ORT 风险等级</label>
                  <select
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={ortLevel}
                    onChange={(e) => setOrtLevel(e.target.value)}
                  >
                    <option>低风险</option>
                    <option>中风险</option>
                    <option>高风险</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">合并症</label>
                <input
                  className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={comorbidities}
                  onChange={(e) => setComorbidities(e.target.value)}
                />
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">过敏史</label>
                <input
                  className="w-full rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                />
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">既往不良反应</label>
                <input
                  className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={adverseHist}
                  onChange={(e) => setAdverseHist(e.target.value)}
                />
              </div>
            </section>

            {/* 补充说明 */}
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                补充说明
              </h4>
              <textarea
                className="min-h-[60px] w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="其他临床信息、病历摘要..."
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </section>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">analytics</span>
              {analyzing ? 'AI 联合会诊中...' : '触发 AI 联合会诊'}
            </button>
            {errorMessage && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>
            )}
          </div>
        </aside>

        {/* ── 中央：分析结果 ── */}
        <section className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-background-dark">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* 状态栏 */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div
                    className={`absolute inset-0 rounded-full border-4 border-primary border-t-transparent ${
                      analyzing ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '2s' }}
                  />
                  <span className="material-symbols-outlined text-primary">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold">OC × 百川 三阶联合会诊引擎</h3>
                  <p className="text-xs text-slate-500">
                    MiniMax-M2.5（病例库）× Baichuan4-Turbo（医学专家审阅）双模型辩论共识
                  </p>
                </div>
              </div>
              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${riskLabel.className}`}
              >
                {riskLabel.text}
              </span>
            </div>

            {/* MME 警戒条 */}
            {result?.mme_warning && (
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  result.mme_warning.includes('红线')
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <span className="material-symbols-outlined shrink-0">
                  {result.mme_warning.includes('红线') ? 'emergency' : 'warning'}
                </span>
                <p>{result.mme_warning}</p>
              </div>
            )}

            {/* 无结果时的占位 */}
            {!result && !analyzing && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <span className="material-symbols-outlined mb-3 text-5xl text-slate-300">
                  biotech
                </span>
                <p className="font-medium text-slate-400">填写左侧病例信息后</p>
                <p className="text-sm text-slate-400">点击「触发 AI 联合会诊」启动三阶辩论分析</p>
              </div>
            )}

            {/* 综合共识（主要结果） */}
            {result && (
              <>
                <article
                  className={`rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 ${
                    result.risk_warning === 'red'
                      ? 'border-red-200 dark:border-red-900/40'
                      : 'border-emerald-200 dark:border-emerald-900/40'
                  }`}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className={`material-symbols-outlined ${
                        result.risk_warning === 'red' ? 'text-red-500' : 'text-emerald-500'
                      }`}
                    >
                      verified
                    </span>
                    <h4 className="font-bold">AI 综合会诊共识</h4>
                    <span className="ml-auto text-xs text-slate-400">Step 3 — 最终建议</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {result.consensus || '（暂无共识内容）'}
                  </p>
                </article>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* OC 初步答案 */}
                  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">database</span>
                      <h4 className="font-bold text-sm">病例库初步分析</h4>
                      <span className="ml-auto text-xs text-slate-400">Step 1 — OC</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {result.oc_answer || '（暂无内容）'}
                    </p>
                  </article>

                  {/* 百川审阅 */}
                  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500">
                        rate_review
                      </span>
                      <h4 className="font-bold text-sm">百川医疗专家审阅</h4>
                      <span className="ml-auto text-xs text-slate-400">Step 2 — 百川</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {result.baichuan_review || '（暂无审阅意见）'}
                    </p>
                  </article>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── 右侧：循证溯源 + 会诊讨论区 ── */}
        <aside className="hidden w-96 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              循证溯源专区
            </h3>
            <div className="space-y-4">
              {REFERENCE_ITEMS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="group flex w-full items-start gap-3 text-left transition"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-background-light dark:bg-background-dark">
                    <span className="material-symbols-outlined text-primary">link</span>
                  </div>
                  <div>
                    <h5 className="line-clamp-2 text-xs font-bold group-hover:text-primary">
                      {item.title}
                    </h5>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {item.date} · {item.source}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between p-5">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-primary">forum</span>
                MDT 会诊讨论区
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                3 位在线
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 text-xs">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                  李
                </div>
                <div className="rounded-xl rounded-tl-none bg-slate-50 p-3 dark:bg-slate-800">
                  建议滴定起始剂量控制在 MME 30mg/day，1 周后按 25%~50% 梯度上调。
                </div>
              </div>
              <div className="flex flex-row-reverse gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  我
                </div>
                <div className="rounded-xl rounded-tr-none bg-primary p-3 text-white">
                  患者有可待因过敏史，吗啡代谢通路是否需要基因检测？
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="relative flex items-center">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full rounded-xl border-slate-200 py-3 pl-4 pr-12 text-sm focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  placeholder="输入临床疑问..."
                />
                <button className="absolute right-2 rounded-lg bg-primary p-1.5 text-white hover:bg-primary/90">
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
