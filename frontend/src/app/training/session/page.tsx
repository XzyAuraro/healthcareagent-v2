'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级', intermediate: '中级', advanced: '高级',
};
const DEPARTMENT_LABELS: Record<string, string> = {
  cardiology: '心内科', neurology: '神经内科', oncology: '肿瘤科', emergency: '急诊科',
};

type Message = { role: 'trainee' | 'patient'; content: string };
type EvalResult = { oc_eval: string; bc_comment: string; correct_diagnosis: string };
type Phase =
  | { type: 'generating' }
  | { type: 'chatting' }
  | { type: 'evaluating' }
  | { type: 'done'; result: EvalResult };

type PrescriptionItem = {
  drug: string; dose: string; frequency: string; route: string; duration: string; rationale: string;
};
const EMPTY_RX = (): PrescriptionItem => ({
  drug: '', dose: '', frequency: 'bid', route: '口服', duration: '', rationale: '',
});

function TrainingSessionPageContent() {
  const params = useSearchParams();
  const difficulty = params.get('difficulty') ?? 'intermediate';
  const department = params.get('department') ?? 'cardiology';

  const [phase, setPhase] = useState<Phase>({ type: 'generating' });
  const [caseId, setCaseId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [traineeInput, setTraineeInput] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([EMPTY_RX()]);
  const [showDiagInput, setShowDiagInput] = useState(false);
  const [evalSeconds, setEvalSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Generate case on mount — AbortController 防止 StrictMode 重复请求
  useEffect(() => {
    const controller = new AbortController();

    async function generate() {
      try {
        const res = await fetch('/api/training/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ difficulty, department }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { job_id } = (await res.json()) as { job_id: string };

        const start = Date.now();
        while (Date.now() - start < 120_000) {
          await new Promise((r) => setTimeout(r, 3000));
          if (controller.signal.aborted) return;
          const poll = await fetch(`/api/training/job/${job_id}`, { signal: controller.signal, headers: getAuthHeaders() });
          if (!poll.ok) continue;
          const job = await poll.json();
          if (job.status === 'done') {
            setCaseId(job.case_id);
            setChiefComplaint(job.chief_complaint);
            setMessages([{ role: 'patient', content: job.patient_intro }]);
            setPhase({ type: 'chatting' });
            return;
          }
          if (job.status === 'error') throw new Error(job.error ?? '生成失败');
        }
        throw new Error('生成超时，请返回重试');
      } catch (e) {
        if (controller.signal.aborted) return; // StrictMode cleanup，忽略
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    }

    generate();
    return () => controller.abort();
  }, [difficulty, department]);

  const sendMessage = async () => {
    if (!input.trim() || sending || phase.type !== 'chatting') return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setErrorMsg('');
    const history: Message[] = [...messages, { role: 'trainee', content: userMsg }];
    setMessages(history);
    try {
      const res = await fetch('/api/training/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ case_id: caseId, message: userMsg, history: messages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { response: string };
      setMessages([...history, { role: 'patient', content: data.response }]);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const startEvaluate = async () => {
    setShowDiagInput(false);
    setPhase({ type: 'evaluating' });
    setEvalSeconds(0);
    try {
      const res = await fetch('/api/training/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          case_id: caseId,
          history: messages,
          trainee_diagnosis: traineeInput,
          prescriptions: prescriptions.filter((rx) => rx.drug.trim()),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { job_id } = (await res.json()) as { job_id: string };

      const start = Date.now();
      while (Date.now() - start < 300_000) {
        await new Promise((r) => setTimeout(r, 3000));
        setEvalSeconds(Math.floor((Date.now() - start) / 1000));
        const poll = await fetch(`/api/training/job/${job_id}`, { headers: getAuthHeaders() });
        if (!poll.ok) continue;
        const job = await poll.json();
        if (job.status === 'done') { setPhase({ type: 'done', result: job as EvalResult }); return; }
        if (job.status === 'error') throw new Error(job.error ?? '评估失败');
      }
      throw new Error('评估超时');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase({ type: 'chatting' });
    }
  };

  const diffLabel = DIFFICULTY_LABELS[difficulty] ?? difficulty;
  const deptLabel = DEPARTMENT_LABELS[department] ?? department;

  return (
    <div className="flex h-screen flex-col bg-background-light font-display dark:bg-background-dark">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <PrimaryTabsNav className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="rounded bg-primary/10 px-2 py-1 font-bold text-primary">{deptLabel}</span>
          <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{diffLabel}</span>
          {phase.type === 'chatting' && (
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{messages.length} 轮</span>
          )}
        </div>
      </header>

      {/* Generating */}
      {phase.type === 'generating' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">正在生成虚拟病例…</p>
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
          <p className="text-xs text-slate-400">OC 评分 + 百川专家点评，请稍候</p>
        </div>
      )}

      {/* Evaluation result */}
      {phase.type === 'done' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-5">
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
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{phase.result.oc_eval}</ReactMarkdown>
              </div>
            </div>
            {phase.result.bc_comment && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/10 dark:text-indigo-300">
                <span className="font-bold">百川专家补充：</span>{phase.result.bc_comment}
              </div>
            )}
            <Link
              href="/training"
              className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:shadow-primary/40"
            >
              返回重新训练
            </Link>
          </div>
        </div>
      )}

      {/* Chat UI */}
      {phase.type === 'chatting' && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-2xl space-y-4">
              {chiefComplaint && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <span className="font-bold text-slate-700 dark:text-slate-300">主诉：</span>{chiefComplaint}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'trainee' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    m.role === 'patient'
                      ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                      : 'bg-primary text-white'
                  }`}>
                    {m.role === 'patient' ? '患' : '医'}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'patient'
                      ? 'rounded-tl-none bg-white shadow-sm dark:bg-slate-900'
                      : 'rounded-tr-none bg-primary text-white'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold dark:bg-slate-700">患</div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {errorMsg && <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{errorMsg}</p>}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto max-w-2xl space-y-2">
              {showDiagInput && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4 dark:bg-primary/10">
                  {/* 诊断 */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">你的诊断</label>
                    <input
                      className="mt-1 w-full rounded-lg border-slate-200 text-sm dark:border-slate-700 dark:bg-slate-800"
                      placeholder="例：慢性心力衰竭急性加重（NYHA III级）"
                      value={traineeInput}
                      onChange={(e) => setTraineeInput(e.target.value)}
                    />
                  </div>

                  {/* 处方 */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        开具处方（可选，不填则跳过处方评分）
                      </label>
                      {prescriptions.length < 4 && (
                        <button
                          type="button"
                          onClick={() => setPrescriptions([...prescriptions, EMPTY_RX()])}
                          className="text-xs text-primary hover:underline"
                        >
                          + 添加药物
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {prescriptions.map((rx, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                            <input
                              className="flex-1 rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                              placeholder="药品名称（如：吗啡缓释片）"
                              value={rx.drug}
                              onChange={(e) => {
                                const next = [...prescriptions];
                                next[idx] = { ...rx, drug: e.target.value };
                                setPrescriptions(next);
                              }}
                            />
                            {prescriptions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <input
                              className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                              placeholder="剂量（如：30mg）"
                              value={rx.dose}
                              onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,dose:e.target.value}; setPrescriptions(n); }}
                            />
                            <select
                              className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                              value={rx.frequency}
                              onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,frequency:e.target.value}; setPrescriptions(n); }}
                            >
                              {['qd','bid','tid','qid','q8h','q12h','prn','st'].map(f=><option key={f}>{f}</option>)}
                            </select>
                            <select
                              className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                              value={rx.route}
                              onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,route:e.target.value}; setPrescriptions(n); }}
                            >
                              {['口服','静脉','肌注','皮下','舌下','透皮','吸入'].map(r=><option key={r}>{r}</option>)}
                            </select>
                            <input
                              className="rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                              placeholder="疗程"
                              value={rx.duration}
                              onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,duration:e.target.value}; setPrescriptions(n); }}
                            />
                          </div>
                          <input
                            className="w-full rounded border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
                            placeholder="用药依据 / 注意事项（选填）"
                            value={rx.rationale}
                            onChange={(e) => { const n=[...prescriptions]; n[idx]={...rx,rationale:e.target.value}; setPrescriptions(n); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startEvaluate}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      提交评分
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDiagInput(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:border-slate-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border-slate-200 py-3 text-sm focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                  placeholder="向患者提问… (Enter 发送)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={sending || showDiagInput}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !input.trim() || showDiagInput}
                  className="rounded-xl bg-primary p-3 text-white disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagInput(true)}
                  disabled={sending || messages.length < 3}
                  className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  title="至少问 3 轮后可结束评分"
                >
                  结束评分
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-400">
                至少问 3 轮后可结束 · AI 将从系统性、诊断思路、沟通技巧等维度评分
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TrainingSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-light dark:bg-background-dark" />}>
      <TrainingSessionPageContent />
    </Suspense>
  );
}
