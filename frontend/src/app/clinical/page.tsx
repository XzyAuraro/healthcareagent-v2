'use client';

import { useMemo, useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

type RecommendationObject = {
  drug_name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  category?: string;
  risk_level?: string;
  warnings?: string[];
};

type ClinicalPathwayStep = {
  step?: number;
  title?: string;
  description?: string;
};

type RecommendationItem = string | RecommendationObject;

type AnalysisResult = {
  diagnosis?: string;
  recommendations?: RecommendationItem[];
  risk_level?: string;
  warnings?: string[];
  clinical_pathway?: ClinicalPathwayStep[];
};

const REFERENCE_ITEMS = [
  {
    title: 'ESC 2023 Guidelines for Arterial Hypertension',
    source: 'Official Guide',
    date: '2023-08-25',
  },
  {
    title: 'ADA Standards of Care in Diabetes 2025',
    source: 'Clinical Standards',
    date: '2025-01-04',
  },
];

const DEFAULT_RECOMMENDATIONS = ['建议 ACEI/ARB 联合 CCB 方案', '加强血压与电解质动态监测'];
const DEFAULT_WARNINGS = ['ACEI 联合保钾利尿剂可能引起高钾血症'];
const DEFAULT_PATHWAY = [
  { step: 1, title: '启动基础降压治疗', description: '结合糖代谢指标动态调整剂量。' },
  { step: 2, title: '14 天内复查', description: '复查肌酐、血钾和尿微量白蛋白，评估肾脏安全性。' },
];

function toRiskScore(level?: string): number {
  const normalized = level?.toLowerCase();
  if (normalized === 'high') return 3;
  if (normalized === 'medium') return 2;
  if (normalized === 'low') return 1;
  return 0;
}

function normalizeRecommendation(item: RecommendationItem): string {
  if (typeof item === 'string') {
    return item;
  }

  const fields = [
    item.drug_name ? `药品：${item.drug_name}` : '',
    item.dosage ? `剂量：${item.dosage}` : '',
    item.frequency ? `频次：${item.frequency}` : '',
    item.route ? `给药：${item.route}` : '',
  ].filter(Boolean);

  const content = fields.length > 0 ? fields.join('，') : '已返回结构化用药建议';
  return item.category ? `[${item.category}] ${content}` : content;
}

export default function ClinicalPage() {
  const [age, setAge] = useState('68');
  const [gender, setGender] = useState('男');
  const [diagnosis, setDiagnosis] = useState('原发性高血压 III 级，心功能 II 级，伴有 2 型糖尿病');
  const [historyInput, setHistoryInput] = useState('');
  const [historyList, setHistoryList] = useState<string[]>(['冠心病', '肾功能不全']);
  const [allergy, setAllergy] = useState('磺胺类药物过敏');
  const [chatInput, setChatInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const canAnalyze = diagnosis.trim().length > 0 && age.trim().length > 0;

  const normalizedRecommendations = useMemo(() => {
    const recommendations = analysisResult?.recommendations;
    if (!recommendations || recommendations.length === 0) {
      return DEFAULT_RECOMMENDATIONS;
    }
    return recommendations.map((item) => normalizeRecommendation(item));
  }, [analysisResult?.recommendations]);

  const normalizedWarnings = useMemo(() => {
    const warningSet = new Set<string>();

    analysisResult?.warnings?.forEach((item) => {
      if (item) warningSet.add(item);
    });

    analysisResult?.recommendations?.forEach((item) => {
      if (typeof item === 'string') {
        return;
      }
      item.warnings?.forEach((warning) => {
        if (warning) warningSet.add(warning);
      });
    });

    if (warningSet.size === 0) {
      return DEFAULT_WARNINGS;
    }
    return Array.from(warningSet);
  }, [analysisResult?.recommendations, analysisResult?.warnings]);

  const normalizedPathway = useMemo(() => {
    const pathway = analysisResult?.clinical_pathway;
    if (!pathway || pathway.length === 0) {
      return DEFAULT_PATHWAY;
    }
    return pathway.map((item, index) => ({
      step: item.step ?? index + 1,
      title: item.title ?? `步骤 ${index + 1}`,
      description: item.description ?? '暂无说明',
    }));
  }, [analysisResult?.clinical_pathway]);

  const resolvedRiskLevel = useMemo(() => {
    const levels: string[] = [];
    if (analysisResult?.risk_level) {
      levels.push(analysisResult.risk_level);
    }
    analysisResult?.recommendations?.forEach((item) => {
      if (typeof item !== 'string' && item.risk_level) {
        levels.push(item.risk_level);
      }
    });

    if (levels.length === 0) {
      return undefined;
    }

    return levels
      .slice()
      .sort((a, b) => toRiskScore(b) - toRiskScore(a))[0]
      ?.toLowerCase();
  }, [analysisResult?.recommendations, analysisResult?.risk_level]);

  const riskLabel = useMemo(() => {
    const risk = resolvedRiskLevel;
    if (risk === 'high') return { text: '高风险', className: 'text-red-600 bg-red-50 border-red-100' };
    if (risk === 'medium') return { text: '中风险', className: 'text-amber-600 bg-amber-50 border-amber-100' };
    if (risk === 'low') return { text: '低风险', className: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    return { text: '待评估', className: 'text-slate-600 bg-slate-50 border-slate-200' };
  }, [resolvedRiskLevel]);

  const addHistory = () => {
    const value = historyInput.trim();
    if (!value) return;
    if (historyList.includes(value)) {
      setHistoryInput('');
      return;
    }
    setHistoryList((list) => [...list, value]);
    setHistoryInput('');
  };

  const removeHistory = (item: string) => {
    setHistoryList((list) => list.filter((value) => value !== item));
  };

  const handleAnalyze = async () => {
    setErrorMessage('');
    if (!canAnalyze) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/clinical/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'new',
          age: Number.parseInt(age, 10),
          gender,
          diagnosis,
          medical_history: historyList,
          allergies: allergy ? [allergy] : [],
          current_medications: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as AnalysisResult;
      setAnalysisResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`分析失败，请检查后端服务。${message}`);
    } finally {
      setAnalyzing(false);
    }
  };

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
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="h-10 w-64 rounded-full border-none bg-slate-100 pl-10 text-sm focus:ring-2 focus:ring-primary/50 dark:bg-slate-800"
              placeholder="搜索药品、指南、文献..."
            />
          </div>
          <button className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">W</div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              病例录入工作台
            </h3>
          </div>

          <div className="space-y-6 p-5">
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">患者基础信息</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">年龄</label>
                  <input
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">性别</label>
                  <select
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                  >
                    <option>男</option>
                    <option>女</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">初步诊断</label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                  placeholder="请输入主诉与体征..."
                  value={diagnosis}
                  onChange={(event) => setDiagnosis(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">既往史</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {historyList.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => removeHistory(item)}
                      className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                    >
                      {item}
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="添加既往病史..."
                    value={historyInput}
                    onChange={(event) => setHistoryInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addHistory}
                    className="rounded-lg border border-slate-200 px-3 text-sm transition hover:border-primary hover:text-primary dark:border-slate-700"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">过敏史</label>
                <input
                  className="w-full rounded-lg border border-red-200 bg-red-50 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-900/10"
                  value={allergy}
                  onChange={(event) => setAllergy(event.target.value)}
                />
              </div>
            </section>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">analytics</span>
              {analyzing ? '分析中...' : '触发 AI 实时推演'}
            </button>
            {errorMessage && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>}
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-background-dark">
          <div className="mx-auto max-w-4xl space-y-6">
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
                  <h3 className="font-bold">AI 临床分析引擎</h3>
                  <p className="text-xs text-slate-500">实时对患者输入进行结构化风险评估和用药建议。</p>
                </div>
              </div>
              <span className={`rounded border px-2 py-1 text-xs font-medium ${riskLabel.className}`}>{riskLabel.text}</span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-primary">pill</span>
                    结构化处方建议
                  </h4>
                  <button className="text-xs font-semibold text-primary hover:underline">一键采纳</button>
                </div>
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {normalizedRecommendations.map((item, index) => (
                    <div
                      key={`recommendation-${index}-${item}`}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="mb-4 flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-orange-500">warning</span>
                  风险监测预警
                </h4>
                <div className="space-y-3 text-sm">
                  {normalizedWarnings.map((item, index) => (
                    <div key={`warning-${index}-${item}`} className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-4 font-bold">AI 临床路径建议</h4>
              <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                {normalizedPathway.map((item, index) => (
                  <li key={`pathway-${item.step}-${index}`} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-primary text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.step}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{item.title}</p>
                      <p>{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

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
                    <h5 className="line-clamp-2 text-xs font-bold group-hover:text-primary">{item.title}</h5>
                    <p className="mt-1 text-[10px] text-slate-400">{item.date} · {item.source}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between p-5">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-primary">forum</span>
                专家会诊讨论区
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">3 位在线</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 text-xs">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                  李
                </div>
                <div className="rounded-xl rounded-tl-none bg-slate-50 p-3 dark:bg-slate-800">
                  建议 ACEI 初始剂量减半，观察 1 周后再滴定。
                </div>
              </div>
              <div className="flex flex-row-reverse gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  我
                </div>
                <div className="rounded-xl rounded-tr-none bg-primary p-3 text-white">是否需要同时监测 24h 尿微量白蛋白？</div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="relative flex items-center">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
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
