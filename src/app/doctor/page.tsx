'use client';

import { FormEvent, useMemo, useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';

type RiskLevel = 'high' | 'medium' | 'low';
type SidebarTab = 'dashboard' | 'patients' | 'risk' | 'medication' | 'followup';

type Patient = {
  id: string;
  name: string;
  diagnosis: string;
  risk: RiskLevel;
  bloodPressure: string;
  metricName: string;
  metricValue: string;
};

type MedicationTask = {
  id: string;
  patient: string;
  drug: string;
  issue: string;
  action: string;
  due: string;
};

type FollowupTask = {
  id: string;
  patient: string;
  date: string;
  focus: string;
  status: 'today' | 'upcoming' | 'overdue';
};

type TodoItem = {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  deadline: string;
};

type NewCaseForm = {
  name: string;
  diagnosis: string;
  risk: RiskLevel;
  bloodPressure: string;
  metricName: string;
  metricValue: string;
};

const PATIENTS: Patient[] = [
  {
    id: '982132',
    name: '张卫',
    diagnosis: '高血压 / 2 型糖尿病 / 冠心病',
    risk: 'high',
    bloodPressure: '165/105',
    metricName: '血糖',
    metricValue: '8.4 mmol/L',
  },
  {
    id: '441092',
    name: '李晨',
    diagnosis: '冠脉支架术后 / 高脂血症',
    risk: 'medium',
    bloodPressure: '132/82',
    metricName: 'LDL-C',
    metricValue: '2.8 mmol/L',
  },
  {
    id: '331902',
    name: '王欣',
    diagnosis: '常规体检 / 轻度高血压',
    risk: 'low',
    bloodPressure: '118/76',
    metricName: 'BMI',
    metricValue: '23.5',
  },
];

const INITIAL_NEW_CASE_FORM: NewCaseForm = {
  name: '',
  diagnosis: '',
  risk: 'medium',
  bloodPressure: '',
  metricName: '血糖',
  metricValue: '',
};

const MEDICATION_TASKS: MedicationTask[] = [
  {
    id: 'm1',
    patient: '张卫',
    drug: '盐酸贝那普利',
    issue: '近 7 天血压波动较大',
    action: '建议复核依从性并评估是否联合 CCB',
    due: '今日 17:00',
  },
  {
    id: 'm2',
    patient: '李晨',
    drug: '阿托伐他汀',
    issue: 'LDL-C 未达标',
    action: '建议评估剂量上调并排查饮食依从',
    due: '明日 10:00',
  },
  {
    id: 'm3',
    patient: '王欣',
    drug: '缬沙坦',
    issue: '偶发低压偏低',
    action: '建议 3 日居家血压连续监测后再调整',
    due: '本周五',
  },
];

const FOLLOWUP_TASKS: FollowupTask[] = [
  {
    id: 'f1',
    patient: '张卫',
    date: '今天 16:00',
    focus: '复查肾功能与血钾，评估 ACEI 安全性',
    status: 'today',
  },
  {
    id: 'f2',
    patient: '李晨',
    date: '明天 09:30',
    focus: '复查 LDL-C 与肝功能',
    status: 'upcoming',
  },
  {
    id: 'f3',
    patient: '王欣',
    date: '已逾期 1 天',
    focus: '补录家庭血压与体重数据',
    status: 'overdue',
  },
];

const SIDEBAR_ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'dashboard', label: '工作台概览' },
  { id: 'patients', icon: 'groups', label: '我的患者库' },
  { id: 'risk', icon: 'analytics', label: '风险评估' },
  { id: 'medication', icon: 'monitoring', label: '用药追踪' },
  { id: 'followup', icon: 'event_note', label: '随访管理' },
];

const TAB_META: Record<SidebarTab, { title: string; description: string; icon: string }> = {
  dashboard: {
    title: '工作台概览',
    description: '查看当日核心指标与重点患者进展。',
    icon: 'dashboard',
  },
  patients: {
    title: '患者库',
    description: '按风险等级查看患者详情并进行病例管理。',
    icon: 'patient_list',
  },
  risk: {
    title: '风险评估',
    description: '按高到低排序，优先处理高风险患者。',
    icon: 'analytics',
  },
  medication: {
    title: '用药追踪',
    description: '聚焦当前用药问题、调整建议与到期任务。',
    icon: 'pill',
  },
  followup: {
    title: '随访管理',
    description: '按时间线安排随访，减少遗漏与逾期。',
    icon: 'event_note',
  },
};

function getRiskBadgeClass(risk: RiskLevel): string {
  if (risk === 'high') return 'bg-danger/10 text-danger';
  if (risk === 'medium') return 'bg-warning/10 text-warning';
  return 'bg-success/10 text-success';
}

function getRiskLabel(risk: RiskLevel): string {
  if (risk === 'high') return '高风险';
  if (risk === 'medium') return '中风险';
  return '低风险';
}

function getFollowupStatusClass(status: FollowupTask['status']): string {
  if (status === 'today') return 'bg-blue-50 text-blue-600';
  if (status === 'upcoming') return 'bg-emerald-50 text-emerald-600';
  return 'bg-red-50 text-red-600';
}

function getFollowupStatusLabel(status: FollowupTask['status']): string {
  if (status === 'today') return '今日';
  if (status === 'upcoming') return '即将到期';
  return '已逾期';
}

function createPatientId(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

function PatientCard({
  patient,
  onViewDetails,
}: {
  patient: Patient;
  onViewDetails: (patient: Patient) => void;
}) {
  return (
    <article
      className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${
        patient.risk === 'high' ? 'border-danger' : patient.risk === 'medium' ? 'border-warning' : 'border-success'
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-bold">
            {patient.name}
            <span className="ml-2 text-xs font-normal text-slate-400">ID: {patient.id}</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">{patient.diagnosis}</p>
        </div>
        <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${getRiskBadgeClass(patient.risk)}`}>
          {getRiskLabel(patient.risk)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
          <p className="text-[10px] text-slate-400">血压</p>
          <p className="text-sm font-bold">{patient.bloodPressure}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
          <p className="text-[10px] text-slate-400">{patient.metricName}</p>
          <p className="text-sm font-bold">{patient.metricValue}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(patient)}
          className="flex-1 rounded bg-info/10 py-1.5 text-xs font-bold text-info transition hover:bg-info hover:text-white"
        >
          查看详情
        </button>
        <button className="flex h-8 w-10 items-center justify-center rounded border border-slate-200 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          <span className="material-symbols-outlined text-sm">more_horiz</span>
        </button>
      </div>
    </article>
  );
}

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState('刚刚');
  const [allPatients, setAllPatients] = useState<Patient[]>(PATIENTS);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState<NewCaseForm>(INITIAL_NEW_CASE_FORM);
  const [caseFormError, setCaseFormError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const sortedPatients = useMemo(() => {
    const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return [...allPatients].sort((a, b) => order[a.risk] - order[b.risk]);
  }, [allPatients]);

  const todoItems = useMemo<TodoItem[]>(() => {
    if (activeTab === 'medication') {
      return [
        { id: 'tm1', title: '复核张卫降压方案调整', priority: 'P1', deadline: '今天 17:00' },
        { id: 'tm2', title: '确认李晨他汀剂量调整', priority: 'P2', deadline: '明天 10:00' },
      ];
    }
    if (activeTab === 'followup') {
      return [
        { id: 'tf1', title: '补做王欣逾期随访', priority: 'P1', deadline: '尽快' },
        { id: 'tf2', title: '安排李晨明日门诊复查', priority: 'P2', deadline: '明天 09:30' },
      ];
    }
    if (activeTab === 'risk') {
      return [
        { id: 'tr1', title: '审核高风险患者今日计划', priority: 'P1', deadline: '今天 16:00' },
        { id: 'tr2', title: '完成中风险患者复评 2 例', priority: 'P2', deadline: '今天 18:00' },
      ];
    }
    return [
      { id: 'td1', title: '审核 52 号病房张卫的 AI 风险报告', priority: 'P1', deadline: '今天 17:00' },
      { id: 'td2', title: '确认 3 位新入院患者的初筛方案', priority: 'P2', deadline: '明天 10:00' },
    ];
  }, [activeTab]);

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastSyncAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    setSyncing(false);
  };

  const openCreateCaseModal = () => {
    setCaseFormError('');
    setCaseModalOpen(true);
  };

  const closeCreateCaseModal = () => {
    setCaseModalOpen(false);
    setNewCaseForm(INITIAL_NEW_CASE_FORM);
    setCaseFormError('');
  };

  const handleCreateCase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newCaseForm.name.trim() || !newCaseForm.diagnosis.trim()) {
      setCaseFormError('请至少填写患者姓名和初步诊断。');
      return;
    }

    const createdPatient: Patient = {
      id: createPatientId(),
      name: newCaseForm.name.trim(),
      diagnosis: newCaseForm.diagnosis.trim(),
      risk: newCaseForm.risk,
      bloodPressure: newCaseForm.bloodPressure.trim() || '--/--',
      metricName: newCaseForm.metricName.trim() || '指标',
      metricValue: newCaseForm.metricValue.trim() || '--',
    };

    setAllPatients((list) => [createdPatient, ...list]);
    setActiveTab('patients');
    closeCreateCaseModal();
  };

  const openPatientDetails = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const closePatientDetails = () => {
    setSelectedPatient(null);
  };

  const tabMeta = TAB_META[activeTab];
  const highRiskCount = allPatients.filter((item) => item.risk === 'high').length;
  const mediumRiskCount = allPatients.filter((item) => item.risk === 'medium').length;
  const lowRiskCount = allPatients.filter((item) => item.risk === 'low').length;

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
      <header className="fixed top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary p-1.5">
            <span className="material-symbols-outlined text-2xl text-white">medical_services</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            MedOS <span className="font-normal text-slate-400">| 医生管理后台</span>
          </h1>
        </div>

        <div className="hidden max-w-xl flex-1 px-8 md:block">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              className="w-full rounded-xl border-none bg-slate-100 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 dark:bg-slate-800"
              placeholder="搜索患者姓名、病案号或药品名称..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryTabsNav className="hidden md:flex" />
          <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">王建国 主任</p>
              <p className="text-xs text-slate-500">心内科一病区</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-primary">
              W
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        <aside className="fixed left-0 hidden h-[calc(100vh-64px)] w-64 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex dark:border-slate-800 dark:bg-slate-900">
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>系统状态</span>
              <span className="flex items-center gap-1 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                运行中
              </span>
            </div>
            <p className="text-[11px] text-slate-500">最近同步：{lastSyncAt}</p>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSync}
              className="w-full rounded-lg bg-slate-200 py-2 text-xs font-semibold transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {syncing ? '同步中...' : '同步云端数据'}
            </button>
          </div>
        </aside>

        <main className="flex-1 space-y-8 overflow-y-auto p-6 lg:ml-64 xl:mr-80">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <span className="material-symbols-outlined text-primary">{tabMeta.icon}</span>
              {tabMeta.title}
            </h2>
            <p className="text-sm text-slate-500">{tabMeta.description}</p>
          </section>

          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-warning/10 p-2 text-warning">priority_high</span>
                    <span className="text-xs text-slate-400">较昨日 +2</span>
                  </div>
                  <p className="text-sm text-slate-500">待处理高风险患者</p>
                  <p className="mt-1 text-3xl font-black">08</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-success/10 p-2 text-success">check_circle</span>
                    <span className="text-xs text-slate-400">完成率 92%</span>
                  </div>
                  <p className="text-sm text-slate-500">今日已完成评估</p>
                  <p className="mt-1 text-3xl font-black">15</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-info/10 p-2 text-info">history</span>
                    <span className="text-xs text-slate-400">平均耗时 4m</span>
                  </div>
                  <p className="text-sm text-slate-500">本周随访总量</p>
                  <p className="mt-1 text-3xl font-black">124</p>
                </div>
              </div>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <span className="material-symbols-outlined text-primary">patient_list</span>
                    今日重点患者
                  </h3>
                  <button
                    type="button"
                    onClick={openCreateCaseModal}
                    className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    新建病历
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedPatients.map((patient) => (
                    <PatientCard key={patient.id} patient={patient} onViewDetails={openPatientDetails} />
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'patients' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  患者列表
                </h3>
                <button
                  type="button"
                  onClick={openCreateCaseModal}
                  className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  新建病历
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allPatients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} onViewDetails={openPatientDetails} />
                ))}
              </div>
            </section>
          )}

          {activeTab === 'risk' && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs text-red-500">高风险</p>
                  <p className="mt-1 text-2xl font-black text-red-600">{highRiskCount}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs text-amber-500">中风险</p>
                  <p className="mt-1 text-2xl font-black text-amber-600">{mediumRiskCount}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-500">低风险</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">{lowRiskCount}</p>
                </div>
              </div>
              <section className="space-y-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <span className="material-symbols-outlined text-primary">priority_high</span>
                  风险优先队列
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedPatients.map((patient) => (
                    <PatientCard key={patient.id} patient={patient} onViewDetails={openPatientDetails} />
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'medication' && (
            <section className="space-y-4">
              {MEDICATION_TASKS.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">
                      {item.patient} · {item.drug}
                    </h3>
                    <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{item.due}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.issue}</p>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {item.action}
                  </div>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'followup' && (
            <section className="space-y-4">
              {FOLLOWUP_TASKS.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{item.patient}</h3>
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${getFollowupStatusClass(item.status)}`}>
                      {getFollowupStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{item.date}</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{item.focus}</p>
                </article>
              ))}
            </section>
          )}
        </main>

        <aside className="fixed right-0 hidden h-[calc(100vh-64px)] w-80 overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 xl:block dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-primary">task_alt</span>
            快捷待办
          </h3>
          <p className="mb-4 text-xs text-slate-500">当前模块：{SIDEBAR_ITEMS.find((item) => item.id === activeTab)?.label}</p>

          <div className="space-y-4">
            {todoItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <label className="flex cursor-pointer items-start gap-3">
                  <input className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" />
                  <div>
                    <p className="text-xs font-bold">{item.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.priority === 'P1'
                            ? 'bg-danger/10 text-danger'
                            : item.priority === 'P2'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-info/10 text-info'
                        }`}
                      >
                        {item.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.deadline}</span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {caseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">新建病历</h3>
              <button
                type="button"
                onClick={closeCreateCaseModal}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="关闭"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateCase}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">患者姓名</label>
                  <input
                    value={newCaseForm.name}
                    onChange={(event) => setNewCaseForm((form) => ({ ...form, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="请输入姓名"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">风险等级</label>
                  <select
                    value={newCaseForm.risk}
                    onChange={(event) => setNewCaseForm((form) => ({ ...form, risk: event.target.value as RiskLevel }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="high">高风险</option>
                    <option value="medium">中风险</option>
                    <option value="low">低风险</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500">初步诊断</label>
                <textarea
                  value={newCaseForm.diagnosis}
                  onChange={(event) => setNewCaseForm((form) => ({ ...form, diagnosis: event.target.value }))}
                  className="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="例如：高血压 / 2 型糖尿病"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">血压</label>
                  <input
                    value={newCaseForm.bloodPressure}
                    onChange={(event) => setNewCaseForm((form) => ({ ...form, bloodPressure: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="120/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">指标名称</label>
                  <input
                    value={newCaseForm.metricName}
                    onChange={(event) => setNewCaseForm((form) => ({ ...form, metricName: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="血糖"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">指标值</label>
                  <input
                    value={newCaseForm.metricValue}
                    onChange={(event) => setNewCaseForm((form) => ({ ...form, metricValue: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                    placeholder="6.8 mmol/L"
                  />
                </div>
              </div>

              {caseFormError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{caseFormError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateCaseModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                >
                  取消
                </button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90">
                  保存病历
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">患者详情</h3>
              <button
                type="button"
                onClick={closePatientDetails}
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="关闭"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">姓名</p>
                  <p className="mt-1 font-semibold">{selectedPatient.name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">病历号</p>
                  <p className="mt-1 font-semibold">{selectedPatient.id}</p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-xs text-slate-500">初步诊断</p>
                <p className="mt-1 font-semibold">{selectedPatient.diagnosis}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">风险等级</p>
                  <p className="mt-1 font-semibold">{getRiskLabel(selectedPatient.risk)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">血压</p>
                  <p className="mt-1 font-semibold">{selectedPatient.bloodPressure}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">{selectedPatient.metricName}</p>
                  <p className="mt-1 font-semibold">{selectedPatient.metricValue}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
