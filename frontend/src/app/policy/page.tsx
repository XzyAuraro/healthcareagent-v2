'use client';

import { useMemo, useRef, useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type SidebarSection = 'policy' | 'literature' | 'prescription' | 'assistant';
type Agency = 'all' | 'nhc' | 'nsa' | 'nmpa';

type PolicyCard = {
  id: string;
  title: string;
  agency: Agency;
  agencyLabel: string;
  date: string;
  summary: string;
  tags: string[];
  url: string;
};

type LiteratureCard = {
  id: string;
  title: string;
  journal: string;
  date: string;
  focus: string;
  evidenceLevel: 'A' | 'B' | 'C';
  url: string;
};

type PrescriptionExample = {
  id: string;
  title: string;
  scenario: string;
  corePlan: string;
  monitoring: string;
  tags: string[];
};

const SIDEBAR_ITEMS: { id: SidebarSection; icon: string; label: string }[] = [
  { id: 'policy', icon: 'description', label: '政策解读' },
  { id: 'literature', icon: 'library_books', label: '文献库' },
  { id: 'prescription', icon: 'medical_information', label: '处方示例' },
  { id: 'assistant', icon: 'smart_toy', label: 'AI 助手' },
];

const SECTION_META: Record<SidebarSection, { title: string; description: string; icon: string }> = {
  policy: {
    title: '政策解读中心',
    description: '按监管机构筛选政策，快速掌握发布节奏、重点条款与执行影响。',
    icon: 'campaign',
  },
  literature: {
    title: '文献检索与摘要',
    description: '聚合指南与高质量研究，支持按证据等级查看临床决策依据。',
    icon: 'menu_book',
  },
  prescription: {
    title: '处方模板与合规要点',
    description: '以常见场景为模板，展示治疗方案、风险提示与复查建议。',
    icon: 'medication',
  },
  assistant: {
    title: 'AI 合规助手',
    description: '输入用药或医保问题，实时返回合规提醒与可执行建议。',
    icon: 'smart_toy',
  },
};

const AGENCIES: { id: Agency; label: string }[] = [
  { id: 'all', label: '全部机构' },
  { id: 'nhc', label: '国家卫健委' },
  { id: 'nsa', label: '国家医保局' },
  { id: 'nmpa', label: '药监局' },
];

const POLICY_FEED: PolicyCard[] = [
  {
    id: 'p1',
    title: '关于完善医保支付制度支持中医药传承创新发展的通知',
    agency: 'nsa',
    agencyLabel: '国家医保局',
    date: '2023-11-20',
    summary: '明确中医医疗机构动态调整机制，将符合条件的中药饮片与院内制剂纳入支付评估范围。',
    tags: ['中医药', '医保目录'],
    url: 'https://www.nhsa.gov.cn/art/2023/11/20/art_37_11472.html',
  },
  {
    id: 'p2',
    title: '关于推进公立医院高质量发展的合规实施细则',
    agency: 'nhc',
    agencyLabel: '国家卫健委',
    date: '2024-05-08',
    summary: '细化医院数据治理、医疗质量指标、采购追溯与安全运营责任分工。',
    tags: ['医院治理', '质量控制'],
    url: 'https://www.nhc.gov.cn/yzygj/s3585/202405/index.html',
  },
  {
    id: 'p3',
    title: '医疗器械网络采购平台供应商准入管理办法',
    agency: 'nmpa',
    agencyLabel: '药监局',
    date: '2024-08-15',
    summary: '补充采购平台供应商信用评级、违规处罚与器械批次追踪制度要求。',
    tags: ['药械监管', '供应链'],
    url: 'https://www.nmpa.gov.cn/xxgk/fgwj/index.html',
  },
];

const LITERATURE_FEED: LiteratureCard[] = [
  {
    id: 'l1',
    title: 'ESC 2025 Update: Resistant Hypertension in Older Adults',
    journal: 'European Heart Journal',
    date: '2025-10-12',
    focus: '强调老年高血压联合用药起始剂量与肾功能动态评估。',
    evidenceLevel: 'A',
    url: 'https://academic.oup.com/eurheartj',
  },
  {
    id: 'l2',
    title: 'Diabetes and Polypharmacy Safety in Primary Care',
    journal: 'JAMA Internal Medicine',
    date: '2024-11-03',
    focus: '建议对 65 岁以上患者进行季度级药物相互作用审查。',
    evidenceLevel: 'B',
    url: 'https://jamanetwork.com/journals/jamainternalmedicine',
  },
  {
    id: 'l3',
    title: 'Province-level Reimbursement Policy Variability in China',
    journal: 'Health Policy',
    date: '2024-06-18',
    focus: '比较 7 省慢病报销规则差异并给出跨地区执行策略。',
    evidenceLevel: 'B',
    url: 'https://www.sciencedirect.com/journal/health-policy',
  },
];

const PRESCRIPTION_FEED: PrescriptionExample[] = [
  {
    id: 'rx1',
    title: '高血压合并 2 型糖尿病',
    scenario: '门诊初诊，血压持续 > 160/100，伴 HbA1c 升高',
    corePlan: 'ARB + CCB 起始治疗，2 周复评后按血压波动微调。',
    monitoring: '复查血钾、肌酐、空腹血糖；记录晨晚血压趋势。',
    tags: ['慢病管理', '双病共管'],
  },
  {
    id: 'rx2',
    title: '冠脉支架术后二级预防',
    scenario: '术后 1 个月，合并高脂血症',
    corePlan: '双抗 + 高强度他汀，必要时联合胃黏膜保护。',
    monitoring: '关注出血风险评分，8 周内复查 LDL-C 达标情况。',
    tags: ['心血管', '二级预防'],
  },
  {
    id: 'rx3',
    title: '老年患者多重用药核查',
    scenario: '≥ 75 岁，慢病 3 项以上，当前口服药物 > 6 种',
    corePlan: '按 STOPP/START 框架清理冲突药物并下调高风险剂量。',
    monitoring: '每月做一次药物-症状复核，必要时家属联合随访。',
    tags: ['老年医学', '用药安全'],
  },
];

const FAQS = [
  {
    id: 'f1',
    title: '异地就医结算新规下，是否支持线上直接备案？',
    answer: '支持。参保人可通过国家医保服务平台 App 或“国家异地就医备案”小程序在线办理备案。',
    level: 'ok',
  },
  {
    id: 'f2',
    title: '医疗机构采购非集采目录同类药品是否有限额？',
    answer: '严格限制。非中选药品采购量不得超过同类药品采购总量的 10%。',
    level: 'warn',
  },
] as const;

const ASSISTANT_HINTS = [
  {
    id: 'a1',
    level: 'ok',
    content: '当前中药处方符合《2023 中医药管理办法》相关要求。',
  },
  {
    id: 'a2',
    level: 'warn',
    content: '该项目在广东省存在 5% 报销比例下调风险，建议二次核查。',
  },
  {
    id: 'a3',
    level: 'danger',
    content: '检测到负面清单药品，基础医保内不应全额报销。',
  },
] as const;

function getEvidenceBadge(level: LiteratureCard['evidenceLevel']): string {
  if (level === 'A') return 'bg-emerald-50 text-emerald-600';
  if (level === 'B') return 'bg-blue-50 text-blue-600';
  return 'bg-slate-100 text-slate-600';
}

export default function PolicyPage() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('policy');
  const [activeAgency, setActiveAgency] = useState<Agency>('all');
  const [expandedFaq, setExpandedFaq] = useState<string>(FAQS[0].id);
  const [region, setRegion] = useState('全国通用');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);

  const handleAssistantSend = async () => {
    if (!assistantInput.trim() || assistantLoading) return;
    setAssistantLoading(true);
    setAssistantAnswer('');
    try {
      const res = await fetch('/api/policy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: assistantInput }),
      });
      const data = await res.json();
      setAssistantAnswer(data.answer || '暂无回答');
    } catch {
      setAssistantAnswer('请求失败，请检查后端是否运行。');
    } finally {
      setAssistantLoading(false);
    }
  };

  const filteredPolicies = useMemo(() => {
    if (activeAgency === 'all') {
      return POLICY_FEED;
    }
    return POLICY_FEED.filter((item) => item.agency === activeAgency);
  }, [activeAgency]);

  const sectionMeta = SECTION_META[activeSection];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background-light font-display text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-3">
          <PrimaryTabsNav />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined text-xl">policy</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">政策解读引擎</h1>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">核心功能</p>
          {SIDEBAR_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto border-r border-slate-200">
        <div className="sticky top-0 z-10 border-b border-slate-200/50 bg-background-light/80 px-8 py-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full rounded-xl border-slate-200 bg-white py-2 pl-10 pr-4 focus:border-primary focus:ring-primary"
              placeholder="搜索政策、文献或合规问答..."
            />
          </div>
        </div>

        <div className="space-y-8 p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
              <span className="material-symbols-outlined text-primary">{sectionMeta.icon}</span>
              {sectionMeta.title}
            </h2>
            <p className="text-sm text-slate-500">{sectionMeta.description}</p>
          </section>

          {activeSection === 'policy' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {AGENCIES.map((item) => {
                  const active = activeAgency === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveAgency(item.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active ? 'bg-primary text-white' : 'border border-slate-100 bg-white text-slate-600 hover:shadow-sm'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <section>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <span className="material-symbols-outlined text-primary">campaign</span>
                  最新政策速递
                </h3>
                <div className="space-y-4">
                  {filteredPolicies.map((policy) => (
                    <article
                      key={policy.id}
                      className="group rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          {policy.agencyLabel}
                        </span>
                        <span className="text-xs text-slate-400">{policy.date} 发布</span>
                      </div>
                      <h4 className="mb-2 text-lg font-bold text-slate-800 transition-colors group-hover:text-primary">
                        {policy.title}
                      </h4>
                      <p className="mb-4 text-sm leading-relaxed text-slate-500">{policy.summary}</p>
                      <div className="flex items-center gap-2">
                        {policy.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                            #{tag}
                          </span>
                        ))}
                        <a
                          href={policy.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          阅读全文
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <span className="material-symbols-outlined text-primary">quiz</span>
                  政策问答库
                </h3>
                <div className="space-y-3">
                  {FAQS.map((item) => {
                    const expanded = expandedFaq === item.id;
                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-xl border-l-4 bg-white shadow-sm ${
                          item.level === 'ok' ? 'border-emerald-500' : 'border-amber-500'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(expanded ? '' : item.id)}
                          className="flex w-full items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-500">
                              {item.level === 'ok' ? 'check_circle' : 'warning'}
                            </span>
                            <span className="font-medium">{item.title}</span>
                          </div>
                          <span className="material-symbols-outlined text-slate-400">
                            {expanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                        {expanded && (
                          <div className="border-t border-slate-50 bg-slate-50/30 px-11 pb-4 pt-2 text-sm text-slate-600">
                            {item.answer}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {activeSection === 'literature' && (
            <section className="space-y-4">
              {LITERATURE_FEED.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`rounded px-2 py-1 text-[10px] font-bold ${getEvidenceBadge(item.evidenceLevel)}`}>
                      证据等级 {item.evidenceLevel}
                    </span>
                    <span className="text-xs text-slate-400">{item.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.journal}</p>
                  <p className="mt-3 text-sm text-slate-600">{item.focus}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    查看原文
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                </article>
              ))}
            </section>
          )}

          {activeSection === 'prescription' && (
            <section className="space-y-4">
              {PRESCRIPTION_FEED.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.scenario}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">核心方案</p>
                      <p className="mt-1 text-sm font-medium">{item.corePlan}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">监测建议</p>
                      <p className="mt-1 text-sm font-medium">{item.monitoring}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )}

          {activeSection === 'assistant' && (
            <section className="space-y-4">
              <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-base font-bold text-slate-800">AI 合规问答</h3>
                <div className="relative flex items-center">
                  <input
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAssistantSend()}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 py-2.5 pl-4 pr-12 text-sm focus:border-primary focus:ring-primary"
                    placeholder="例如：这个处方在广东是否影响报销比例？"
                  />
                  <button
                    type="button"
                    onClick={handleAssistantSend}
                    className="absolute right-2 rounded-lg bg-primary p-1.5 text-white disabled:opacity-60"
                    disabled={assistantInput.trim().length === 0 || assistantLoading}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {assistantLoading ? 'hourglass_empty' : 'send'}
                    </span>
                  </button>
                </div>
                {assistantAnswer && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="prose prose-sm max-w-none text-slate-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{assistantAnswer}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </article>

              <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-base font-bold text-slate-800">实时提醒</h3>
                <div className="space-y-3 text-sm">
                  {ASSISTANT_HINTS.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        item.level === 'ok'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : item.level === 'warn'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {item.content}
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}
        </div>
      </main>

      <aside className="hidden w-80 flex-shrink-0 flex-col overflow-y-auto bg-white xl:flex">
        <div className="space-y-8 p-6">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="material-symbols-outlined text-lg text-primary">location_on</span>
              适用地区
            </h4>
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
            >
              <option>全国通用</option>
              <option>北京市</option>
              <option>上海市</option>
              <option>广东省</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">当前地区：{region}</p>
            <p className="mt-1 text-xs text-slate-500">当前模块：{SIDEBAR_ITEMS.find((item) => item.id === activeSection)?.label}</p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="material-symbols-outlined text-lg text-primary">verified_user</span>
                AI 实时合规提示
              </h4>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">Live</span>
            </div>
            <div className="space-y-3 text-xs">
              {ASSISTANT_HINTS.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    item.level === 'ok'
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : item.level === 'warn'
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      item.level === 'ok' ? 'text-emerald-500' : item.level === 'warn' ? 'text-amber-500' : 'text-red-500'
                    }`}
                  >
                    {item.level === 'ok' ? 'check_circle' : item.level === 'warn' ? 'warning' : 'cancel'}
                  </span>
                  <p className="text-slate-600">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
