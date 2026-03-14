'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级', intermediate: '中级', advanced: '高级',
};
const DEPARTMENT_LABELS: Record<string, string> = {
  cardiology: '心内科', neurology: '神经内科', oncology: '肿瘤科', emergency: '急诊科',
};
// 各难度建议用时（秒）
const TIMER_SECONDS: Record<string, number> = {
  beginner: 900, intermediate: 600, advanced: 480,
};

type CaseData = {
  case_id: string;
  chief_complaint: string;
  present_illness: string;
  past_history: string;
  physical_exam: string;
  lab_results: string;
  imaging: string;
  department: string;
  difficulty: string;
};
type EvalResult = { oc_eval: string; bc_comment: string; correct_diagnosis: string };
type PrescriptionItem = { drug: string; dose: string; frequency: string; route: string; duration: string; rationale: string };
const EMPTY_RX = (): PrescriptionItem => ({ drug: '', dose: '', frequency: 'bid', route: '口服', duration: '', rationale: '' });

type Phase = { type: 'generating' } | { type: 'reading'; caseData: CaseData } | { type: 'evaluating' } | { type: 'done'; result: EvalResult };

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function CaseAnalysisPage() {
  const params = useSearchParams();
  const difficulty = params.get('difficulty') ?? 'intermediate';
  const department = params.get('department') ?? 'cardiology';

  const [phase, setPhase] = useState<Phase>({ type: 'generating' });
  const [errorMsg, setErrorMsg] = useState('');

  // Answer form state
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([EMPTY_RX()]);
  const [evalSeconds, setEvalSeconds] = useState(0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS[difficulty] ?? 600);
  const [timerStarted, setTimerStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerStarted && phase.type === 'reading') {
      timerRef.current = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerStarted, phase.type]);

  // Generate case on mount
  useEffect(() => {
    const controller = new AbortController();
    async function generate() {
      try {
        const res = await fetch('/api/training/case-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty, department }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { job_id } = (await res.json()) as { job_id: string };

        const start = Date.now();
        while (Date.now() - start < 120_000) {
          await new Promise((r) => setTimeout(r, 3000));
          if (controller.signal.aborted) return;
          const poll = await fetch(`/api/training/job/${job_id}`, { signal: controller.signal });
          if (!poll.ok) continue;
          const job = await poll.json();
          if (job.status === 'done') {
            setPhase({ type: 'reading', caseData: job as CaseData });
            setTimerStarted(true);
            return;
          }
          if (job.status === 'error') throw new Error(job.error ?? '生成失败');
        }
        throw new Error('生成超时，请返回重试');
      } catch (e) {
        if (controller.signal.aborted) return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    }
    generate();
    return () => controller.abort();
  }, [difficulty, department]);

  const startEvaluate = async () => {
    if (phase.type !== 'reading') return;
    if (timerRef.current) clearInterval(timerRef.current);
    const caseId = phase.caseData.case_id;
    setPhase({ type: 'evaluating' });
    setEvalSeconds(0);

    try {
      const res = await fetch('/api/training/case-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          trainee_diagnosis: diagnosis,
          prescriptions: prescriptions.filter((rx) => rx.drug.trim()),
          notes,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { job_id } = (await res.json()) as { job_id: string };

      const start = Date.now();
      while (Date.now() - start < 300_000) {
        await new Promise((r) => setTimeout(r, 3000));
        setEvalSeconds(Math.floor((Date.now() - start) / 1000));
        const poll = await fetch(`/api/training/job/${job_id}`);
        if (!poll.ok) continue;
        const job = await poll.json();
        if (job.status === 'done') { setPhase({ type: 'done', result: job as EvalResult }); return; }
        if (job.status === 'error') throw new Error(job.error ?? '评估失败');
      }
      throw new Error('评估超时');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      if (phase.type !== 'done') setPhase((p) => p.type === 'evaluating' ? { type: 'reading', caseData: (phase as { type: 'reading'; caseData: CaseData }).caseData } : p);
    }
  };

  const diffLabel = DIFFICULTY_LABELS[difficulty] ?? difficulty;
  const deptLabel = DEPARTMENT_LABELS[department] ?? department;
  const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 180 ? 'text-amber-500' : 'text-slate-600';

  return (
    <div className="flex h-screen flex-col bg-background-light font-display dark:bg-background-dark">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <PrimaryTabsNav className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="rounded bg-blue-100 px-2 py-1 font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">模式一·病例分析</span>
          <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">{deptLabel}</span>
          <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{diffLabel}</span>
          {phase.type === 'reading' && (
            <span className={`rounded bg-slate-100 px-2 py-1 font-mono font-bold dark:bg-slate-800 ${timerColor}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </header>

      {/* Generating */}
      {phase.type === 'generating' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">正在生成病例摘要…</p>
          {errorMsg && (
            <div className="flex flex-col items-center gap-2">
              <p className="max-w-sm rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{errorMsg}</p>
              <Link href="/training" className="text-xs text-primary underline">返回重选</Link>
            </div>
          )}
        </div>
      )}

      {/* Evaluating */}
      {phase.type === 'evaluating' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">AI 正在评分… {evalSeconds > 0 ? `(${evalSeconds}s)` : ''}</p>
          <p className="text-xs text-slate-400">OC 评分 + 百川药物安全审查</p>
        </div>
      )}

      {/* Result */}
      {phase.type === 'done' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/10">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                ✓ 正确诊断：{phase.result.correct_diagnosis}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-primary">assessment</span>
                AI 综合评分报告
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {phase.result.oc_eval}
              </p>
            </div>
            {phase.result.bc_comment && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/10 dark:text-indigo-300">
                <span className="font-bold">百川药学专家：</span>{phase.result.bc_comment}
              </div>
            )}
            <div className="flex gap-3">
              <Link href="/training" className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20">
                返回重新训练
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Reading + Answer Form — two-column layout */}
      {phase.type === 'reading' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: case summary */}
          <div className="flex-1 overflow-y-auto border-r border-slate-200 p-6 dark:border-slate-800">
            <div className="mx-auto max-w-xl space-y-4">
              <h2 className="font-black text-slate-900 dark:text-white">病例摘要</h2>

              {[
                { label: '主诉', value: phase.caseData.chief_complaint, icon: 'person' },
                { label: '现病史', value: phase.caseData.present_illness, icon: 'history' },
                { label: '既往史', value: phase.caseData.past_history, icon: 'folder_open' },
                { label: '体格检查', value: phase.caseData.physical_exam, icon: 'stethoscope' },
                { label: '辅助检查', value: phase.caseData.lab_results, icon: 'labs' },
                ...(phase.caseData.imaging ? [{ label: '影像学', value: phase.caseData.imaging, icon: 'radiology' }] : []),
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span className="material-symbols-outlined text-sm text-primary">{item.icon}</span>
                    {item.label}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: answer form */}
          <div className="flex w-96 shrink-0 flex-col overflow-y-auto bg-slate-50 p-5 dark:bg-slate-900/50">
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">你的处置方案</h3>

            {errorMsg && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{errorMsg}</p>}

            {/* Diagnosis */}
            <div className="mb-4 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">诊断意见 *</label>
              <textarea
                className="min-h-[80px] w-full rounded-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="请填写主诊断及鉴别诊断思路…"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            {/* Prescriptions */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">开具处方</label>
                {prescriptions.length < 4 && (
                  <button type="button" onClick={() => setPrescriptions([...prescriptions, EMPTY_RX()])} className="text-xs text-primary hover:underline">
                    + 添加药物
                  </button>
                )}
              </div>
              {prescriptions.map((rx, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                    <input
                      className="flex-1 rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                      placeholder="药品名称"
                      value={rx.drug}
                      onChange={(e) => { const n = [...prescriptions]; n[idx] = { ...rx, drug: e.target.value }; setPrescriptions(n); }}
                    />
                    {prescriptions.length > 1 && (
                      <button type="button" onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <input className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="剂量" value={rx.dose}
                      onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,dose:e.target.value}; setPrescriptions(n); }} />
                    <select className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900" value={rx.frequency}
                      onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,frequency:e.target.value}; setPrescriptions(n); }}>
                      {['qd','bid','tid','qid','q8h','q12h','prn','st'].map(f=><option key={f}>{f}</option>)}
                    </select>
                    <select className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900" value={rx.route}
                      onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,route:e.target.value}; setPrescriptions(n); }}>
                      {['口服','静脉','肌注','皮下','舌下','透皮','吸入'].map(r=><option key={r}>{r}</option>)}
                    </select>
                    <input className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="疗程" value={rx.duration}
                      onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,duration:e.target.value}; setPrescriptions(n); }} />
                  </div>
                  <input className="w-full rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="用药依据（选填）" value={rx.rationale}
                    onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,rationale:e.target.value}; setPrescriptions(n); }} />
                </div>
              ))}
            </div>

            {/* Clinical notes */}
            <div className="mb-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">临床推理补充（选填）</label>
              <textarea
                className="min-h-[60px] w-full rounded-xl border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="补充说明诊断思路、监测计划等…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={startEvaluate}
              disabled={!diagnosis.trim()}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交方案·AI 评分
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">填写诊断后可提交，处方和推理为选填项</p>
          </div>
        </div>
      )}
    </div>
  );
}
