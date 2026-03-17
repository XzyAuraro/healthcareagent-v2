'use client';

import { useEffect, useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  clinicalApi,
  type ClinicalCaseBundle,
  type ClinicalCasePayload,
  type ClinicalDebateResponse,
  type ClinicalMessage,
} from '@/lib/api';

type FormState = {
  patientName: string;
  age: string;
  gender: string;
  diagnosis: string;
  department: string;
  painScore: string;
  painType: string;
  currentOpioid: string;
  currentDose: string;
  currentFreq: string;
  planDrug: string;
  planDose: string;
  planFreq: string;
  mmeDay: string;
  ortScore: string;
  ortLevel: string;
  comorbidities: string;
  allergies: string;
  adverseHist: string;
  coMeds: string;
  renalLiverIssue: boolean;
  personalUse: string;
  familyUse: string;
  psychHistories: string;
  extraNotes: string;
  freeText: string;
};

const REFERENCE_ITEMS = [
  { title: 'CPIC 阿片类药物药物基因组学指南（CYP2D6/OPRM1）2023', source: 'CPIC Guidelines', date: '2023-06-15' },
  { title: 'WHO 癌痛规范化治疗指南 2022', source: 'WHO', date: '2022-03-01' },
  { title: 'NCCN 肿瘤姑息治疗指南 v2.2024', source: 'NCCN', date: '2024-01-10' },
  { title: '中华疼痛学会：阿片类药物临床应用指导原则 2021', source: '中华疼痛学会', date: '2021-11-20' },
];

const INITIAL_FORM: FormState = {
  patientName: '张敏',
  age: '62',
  gender: '女',
  diagnosis: '肺癌骨转移（T4N2M1b），继发性骨痛',
  department: '疼痛科',
  painScore: '7',
  painType: '癌性疼痛',
  currentOpioid: '无',
  currentDose: '0',
  currentFreq: '无',
  planDrug: '吗啡缓释片',
  planDose: '30',
  planFreq: '2',
  mmeDay: '60',
  ortScore: '3',
  ortLevel: '低风险',
  comorbidities: '2型糖尿病，高血压',
  allergies: '可待因（恶心呕吐）',
  adverseHist: '无',
  coMeds: '二甲双胍，缬沙坦',
  renalLiverIssue: false,
  personalUse: '无',
  familyUse: '无',
  psychHistories: '无',
  extraNotes: '',
  freeText: '',
};

const INPUT =
  'w-full rounded-lg border border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800';

function mapBundleToForm(bundle: ClinicalCaseBundle): FormState {
  const record = bundle.case;
  return {
    patientName: record.patient_name || '',
    age: String(record.age ?? 50),
    gender: record.gender || '男',
    diagnosis: record.diagnosis,
    department: record.department,
    painScore: String(record.pain_score),
    painType: record.pain_type,
    currentOpioid: record.current_opioid,
    currentDose: String(record.current_dose),
    currentFreq: record.current_freq,
    planDrug: record.plan_drug,
    planDose: String(record.plan_dose),
    planFreq: String(record.plan_freq),
    mmeDay: String(record.mme_day),
    ortScore: String(record.ort_score),
    ortLevel: record.ort_level,
    comorbidities: record.comorbidities,
    allergies: record.allergies,
    adverseHist: record.adverse_hist,
    coMeds: record.co_meds,
    renalLiverIssue: record.renal_liver_issue,
    personalUse: record.personal_use,
    familyUse: record.family_use,
    psychHistories: record.psych_histories,
    extraNotes: record.extra_notes || '',
    freeText: record.free_text || '',
  };
}

function buildPayload(form: FormState): ClinicalCasePayload {
  return {
    patient_name: form.patientName.trim(),
    age: Number.parseInt(form.age, 10) || 50,
    gender: form.gender,
    diagnosis: form.diagnosis.trim(),
    pain_score: Number.parseInt(form.painScore, 10) || 0,
    pain_type: form.painType,
    department: form.department.trim() || '疼痛科',
    current_opioid: form.currentOpioid.trim() || '无',
    current_dose: Number.parseFloat(form.currentDose) || 0,
    current_freq: form.currentFreq.trim() || '无',
    plan_drug: form.planDrug.trim() || '无',
    plan_dose: Number.parseFloat(form.planDose) || 0,
    plan_freq: Number.parseInt(form.planFreq, 10) || 0,
    mme_day: Number.parseFloat(form.mmeDay) || 0,
    ort_score: Number.parseInt(form.ortScore, 10) || 0,
    ort_level: form.ortLevel,
    comorbidities: form.comorbidities.trim() || '无',
    allergies: form.allergies.trim() || '无',
    adverse_hist: form.adverseHist.trim() || '无',
    co_meds: form.coMeds.trim() || '无',
    renal_liver_issue: form.renalLiverIssue,
    personal_use: form.personalUse.trim() || '无',
    family_use: form.familyUse.trim() || '无',
    psych_histories: form.psychHistories.trim() || '无',
    extra_notes: form.extraNotes.trim(),
    free_text: form.freeText.trim(),
  };
}

function bundleToResult(bundle: ClinicalCaseBundle): ClinicalDebateResponse | null {
  const { case: record } = bundle;
  if (!record.consensus || !record.oc_answer || !record.baichuan_review) {
    return null;
  }
  return {
    oc_answer: record.oc_answer,
    baichuan_review: record.baichuan_review,
    consensus: record.consensus,
    risk_warning: record.risk_warning || 'green',
    mme_warning: record.mme_warning || '',
  };
}

function formatRequestError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { detail?: string; error?: string } } }).response;
    const detail = response?.data?.detail || response?.data?.error;
    if (detail) {
      return detail;
    }
  }
  return fallback;
}

export default function ClinicalPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [chatInput, setChatInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pollingSeconds, setPollingSeconds] = useState(0);
  const [discussing, setDiscussing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseUpdatedAt, setCaseUpdatedAt] = useState('');
  const [messages, setMessages] = useState<ClinicalMessage[]>([]);
  const [result, setResult] = useState<ClinicalDebateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canAnalyze = form.diagnosis.trim().length > 0 && form.age.trim().length > 0;
  const riskLabel =
    result?.risk_warning === 'red'
      ? { text: '高风险', className: 'text-red-600 bg-red-50 border-red-100' }
      : result?.risk_warning === 'green'
        ? { text: '低风险', className: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
        : { text: '待评估', className: 'text-slate-600 bg-slate-50 border-slate-200' };

  const applyBundle = (bundle: ClinicalCaseBundle) => {
    setCaseId(bundle.case.id);
    setCaseUpdatedAt(new Date(bundle.case.updated_at).toLocaleString('zh-CN', { hour12: false }));
    setForm(mapBundleToForm(bundle));
    setMessages(bundle.messages);
    setResult(bundleToResult(bundle));
    if (bundle.case.ai_status === 'error' && bundle.case.ai_error) {
      setErrorMessage(`上次会诊失败：${bundle.case.ai_error}`);
    } else if (bundle.case.ai_status === 'running') {
      setErrorMessage('检测到一条未完成的 AI 会诊记录，请重新触发 AI 联合会诊。');
    }
  };

  useEffect(() => {
    const loadLatest = async () => {
      setLoadingLatest(true);
      setErrorMessage('');
      try {
        const bundle = await clinicalApi.getLatestCase();
        if (bundle) {
          applyBundle(bundle);
          setSuccessMessage('已恢复最近一次临床病例与 MDT 讨论记录。');
        }
      } catch (error) {
        setErrorMessage(formatRequestError(error, '最近病例恢复失败，请检查后端服务。'));
      } finally {
        setLoadingLatest(false);
      }
    };

    void loadLatest();
  }, []);

  const refreshCase = async (nextCaseId: string) => {
    const bundle = await clinicalApi.getCase(nextCaseId);
    applyBundle(bundle);
    return bundle;
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const payload = buildPayload(form);
      const record = caseId
        ? await clinicalApi.updateCase(caseId, payload)
        : await clinicalApi.createCase(payload);
      setCaseId(record.id);
      setCaseUpdatedAt(new Date(record.updated_at).toLocaleString('zh-CN', { hour12: false }));
      setSuccessMessage('病例已保存到 PostgreSQL。');
      return record.id;
    } catch (error) {
      setErrorMessage(formatRequestError(error, '病例保存失败，请稍后重试。'));
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleAnalyze = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!canAnalyze) return;

    setAnalyzing(true);
    setPollingSeconds(0);

    try {
      const payload = buildPayload(form);
      const { job_id, case_id } = await clinicalApi.submitCase({ ...payload, case_id: caseId });
      setCaseId(case_id);

      const startTime = Date.now();
      while (Date.now() - startTime < 300_000) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setPollingSeconds(Math.floor((Date.now() - startTime) / 1000));

        const job = await clinicalApi.getJob(job_id);
        if (job.status === 'done') {
          await refreshCase(case_id);
          setSuccessMessage('AI 联合会诊结果已写入 PostgreSQL。');
          return;
        }
        if (job.status === 'error') {
          throw new Error(job.error || '后端分析失败');
        }
      }

      throw new Error('等待超时（5 分钟），请重试。');
    } catch (error) {
      setErrorMessage(formatRequestError(error, 'AI 联合会诊失败，请检查模型和后端服务。'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendDiscussion = async () => {
    if (!chatInput.trim()) return;

    setDiscussing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const ensuredCaseId = caseId || (await saveDraft());
      if (!ensuredCaseId) {
        return;
      }
      const response = await clinicalApi.sendDiscussion(ensuredCaseId, chatInput.trim());
      setMessages((current) => [...current, response.doctor_message, response.ai_message]);
      setChatInput('');
      await refreshCase(ensuredCaseId);
      setSuccessMessage('MDT 讨论内容已保存，并生成会诊摘要。');
    } catch (error) {
      setErrorMessage(formatRequestError(error, 'MDT 讨论发送失败，请稍后重试。'));
    } finally {
      setDiscussing(false);
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

        <div className="flex items-center gap-4 text-xs text-slate-500">
          {caseId ? <span>当前病例 ID: {caseId.slice(0, 8)}</span> : <span>当前病例未保存</span>}
          {caseUpdatedAt && <span>最近更新：{caseUpdatedAt}</span>}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="flex w-96 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h3 className="flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              病例录入工作台
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              病例表单、AI 输出和 MDT 讨论记录都会写入 PostgreSQL，刷新后可恢复。
            </p>
          </div>

          <div className="space-y-5 p-5">
            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">患者基础信息</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">患者姓名</label>
                  <input className={INPUT} value={form.patientName} onChange={(e) => setForm((current) => ({ ...current, patientName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">年龄</label>
                  <input className={INPUT} value={form.age} onChange={(e) => setForm((current) => ({ ...current, age: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">性别</label>
                  <select className={INPUT} value={form.gender} onChange={(e) => setForm((current) => ({ ...current, gender: e.target.value }))}>
                    <option>男</option>
                    <option>女</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">科室</label>
                  <input className={INPUT} value={form.department} onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))} />
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">初步诊断</label>
                <textarea className={`${INPUT} min-h-[72px]`} value={form.diagnosis} onChange={(e) => setForm((current) => ({ ...current, diagnosis: e.target.value }))} />
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">疼痛评估</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">疼痛评分（NRS）</label>
                  <input type="number" min={0} max={10} className={INPUT} value={form.painScore} onChange={(e) => setForm((current) => ({ ...current, painScore: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">疼痛类型</label>
                  <select className={INPUT} value={form.painType} onChange={(e) => setForm((current) => ({ ...current, painType: e.target.value }))}>
                    <option>癌性疼痛</option>
                    <option>非癌性慢性疼痛</option>
                    <option>急性疼痛</option>
                    <option>神经病理性疼痛</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">用药信息</h4>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div className="space-y-1"><label>当前阿片</label><input className={INPUT} value={form.currentOpioid} onChange={(e) => setForm((current) => ({ ...current, currentOpioid: e.target.value }))} /></div>
                <div className="space-y-1"><label>当前剂量</label><input className={INPUT} value={form.currentDose} onChange={(e) => setForm((current) => ({ ...current, currentDose: e.target.value }))} /></div>
                <div className="space-y-1"><label>当前频次</label><input className={INPUT} value={form.currentFreq} onChange={(e) => setForm((current) => ({ ...current, currentFreq: e.target.value }))} /></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="space-y-1"><label>拟开药物</label><input className={INPUT} value={form.planDrug} onChange={(e) => setForm((current) => ({ ...current, planDrug: e.target.value }))} /></div>
                <div className="space-y-1"><label>拟开剂量</label><input className={INPUT} value={form.planDose} onChange={(e) => setForm((current) => ({ ...current, planDose: e.target.value }))} /></div>
                <div className="space-y-1"><label>拟开频次</label><input className={INPUT} value={form.planFreq} onChange={(e) => setForm((current) => ({ ...current, planFreq: e.target.value }))} /></div>
                <div className="space-y-1"><label>MME/day</label><input className={INPUT} value={form.mmeDay} onChange={(e) => setForm((current) => ({ ...current, mmeDay: e.target.value }))} /></div>
              </div>
              <div className="mt-3 space-y-1">
                <label className="text-xs text-slate-500">合并用药</label>
                <input className={INPUT} value={form.coMeds} onChange={(e) => setForm((current) => ({ ...current, coMeds: e.target.value }))} />
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">风险因素</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs text-slate-500">ORT 评分</label><input className={INPUT} value={form.ortScore} onChange={(e) => setForm((current) => ({ ...current, ortScore: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs text-slate-500">ORT 风险</label><select className={INPUT} value={form.ortLevel} onChange={(e) => setForm((current) => ({ ...current, ortLevel: e.target.value }))}><option>低风险</option><option>中风险</option><option>高风险</option></select></div>
              </div>
              <div className="mt-3 space-y-1"><label className="text-xs text-slate-500">合并症</label><input className={INPUT} value={form.comorbidities} onChange={(e) => setForm((current) => ({ ...current, comorbidities: e.target.value }))} /></div>
              <div className="mt-3 space-y-1"><label className="text-xs text-slate-500">过敏史</label><input className={`${INPUT} border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/10`} value={form.allergies} onChange={(e) => setForm((current) => ({ ...current, allergies: e.target.value }))} /></div>
              <div className="mt-3 space-y-1"><label className="text-xs text-slate-500">既往不良反应</label><input className={INPUT} value={form.adverseHist} onChange={(e) => setForm((current) => ({ ...current, adverseHist: e.target.value }))} /></div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs text-slate-500">个人使用史</label><input className={INPUT} value={form.personalUse} onChange={(e) => setForm((current) => ({ ...current, personalUse: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-xs text-slate-500">家族使用史</label><input className={INPUT} value={form.familyUse} onChange={(e) => setForm((current) => ({ ...current, familyUse: e.target.value }))} /></div>
              </div>
              <div className="mt-3 space-y-1"><label className="text-xs text-slate-500">心理病史</label><input className={INPUT} value={form.psychHistories} onChange={(e) => setForm((current) => ({ ...current, psychHistories: e.target.value }))} /></div>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={form.renalLiverIssue} onChange={(e) => setForm((current) => ({ ...current, renalLiverIssue: e.target.checked }))} />
                肝肾功能异常
              </label>
            </section>

            <section>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">补充说明</h4>
              <textarea className={`${INPUT} min-h-[64px]`} placeholder="其他临床信息、病历摘要..." value={form.extraNotes} onChange={(e) => setForm((current) => ({ ...current, extraNotes: e.target.value }))} />
              <textarea className={`${INPUT} mt-3 min-h-[88px]`} placeholder="粘贴完整病历、检验摘要或会诊背景..." value={form.freeText} onChange={(e) => setForm((current) => ({ ...current, freeText: e.target.value }))} />
            </section>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => void saveDraft()} disabled={savingDraft} className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
                {savingDraft ? '保存中...' : '保存病例'}
              </button>
              <button type="button" onClick={() => void handleAnalyze()} disabled={!canAnalyze || analyzing} className="rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-primary/40 disabled:cursor-not-allowed disabled:opacity-50">
                {analyzing ? `AI 联合会诊中… ${pollingSeconds > 0 ? `(${pollingSeconds}s)` : ''}` : '触发 AI 联合会诊'}
              </button>
            </div>

            {loadingLatest && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">正在恢复最近病例...</p>}
            {successMessage && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{successMessage}</p>}
            {errorMessage && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>}
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-background-dark">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className={`absolute inset-0 rounded-full border-4 border-primary border-t-transparent ${analyzing ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
                  <span className="material-symbols-outlined text-primary">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold">OC × 百川 三阶联合会诊引擎</h3>
                  <p className="text-xs text-slate-500">病例录入、AI 输出和 MDT 讨论均已持久化。</p>
                </div>
              </div>
              <span className={`rounded border px-2 py-1 text-xs font-medium ${riskLabel.className}`}>{riskLabel.text}</span>
            </div>

            {result?.mme_warning && (
              <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${result.mme_warning.includes('红线') ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                <span className="material-symbols-outlined shrink-0">{result.mme_warning.includes('红线') ? 'emergency' : 'warning'}</span>
                <p>{result.mme_warning}</p>
              </div>
            )}

            {!result && !analyzing && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <span className="material-symbols-outlined mb-3 text-5xl text-slate-300">biotech</span>
                <p className="font-medium text-slate-400">填写左侧病例信息后</p>
                <p className="text-sm text-slate-400">点击「触发 AI 联合会诊」后将自动落库并生成持久化结果</p>
              </div>
            )}

            {result && (
              <>
                <article className={`rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-900 ${result.risk_warning === 'red' ? 'border-red-200 dark:border-red-900/40' : 'border-emerald-200 dark:border-emerald-900/40'}`}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`material-symbols-outlined ${result.risk_warning === 'red' ? 'text-red-500' : 'text-emerald-500'}`}>verified</span>
                    <h4 className="font-bold">AI 综合会诊共识</h4>
                    <span className="ml-auto text-xs text-slate-400">Step 3 · 已持久化</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 dark:prose-invert dark:text-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.consensus}</ReactMarkdown>
                  </div>
                </article>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-primary">database</span><h4 className="font-bold text-sm">病例库初步分析</h4><span className="ml-auto text-xs text-slate-400">Step 1 · OC</span></div>
                    <div className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.oc_answer}</ReactMarkdown>
                    </div>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">rate_review</span><h4 className="font-bold text-sm">百川医疗专家审阅</h4><span className="ml-auto text-xs text-slate-400">Step 2 · 百川</span></div>
                    <div className="prose prose-sm max-w-none text-slate-600 dark:prose-invert dark:text-slate-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.baichuan_review}</ReactMarkdown>
                    </div>
                  </article>
                </div>
              </>
            )}
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
                <button key={item.title} type="button" className="group flex w-full items-start gap-3 text-left transition">
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
                MDT 会诊讨论区
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">{messages.length} 条记录</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 text-xs">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-400 dark:border-slate-700">
                  保存病例后可在此发起 MDT 讨论，内容会写入 PostgreSQL。
                </div>
              ) : (
                messages.map((message) => {
                  const isDoctor = message.role === 'doctor';
                  return (
                    <div key={message.id} className={`flex gap-3 ${isDoctor ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isDoctor ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {(message.author_name || (isDoctor ? '我' : 'AI')).slice(0, 1)}
                      </div>
                      <div className={`max-w-[78%] rounded-xl p-3 ${isDoctor ? 'rounded-tr-none bg-primary text-white' : 'rounded-tl-none bg-slate-50 dark:bg-slate-800'}`}>
                        <p className={`mb-1 font-semibold ${isDoctor ? 'text-white/90' : 'text-slate-500'}`}>{message.author_name || (isDoctor ? '当前医生' : 'MDT 助手')}</p>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-inherit dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                        <p className={`mt-2 text-[10px] ${isDoctor ? 'text-white/70' : 'text-slate-400'}`}>{new Date(message.created_at).toLocaleString('zh-CN', { hour12: false })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 p-4 dark:border-slate-800">
              <div className="relative flex items-center">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full rounded-xl border-slate-200 py-3 pl-4 pr-12 text-sm focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  placeholder={caseId ? '输入临床疑问，保存到 MDT 讨论区...' : '先保存病例，再发起 MDT 讨论'}
                  disabled={discussing}
                />
                <button type="button" onClick={() => void handleSendDiscussion()} disabled={!chatInput.trim() || discussing} className="absolute right-2 rounded-lg bg-primary p-1.5 text-white hover:bg-primary/90 disabled:opacity-50">
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
