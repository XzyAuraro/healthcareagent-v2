'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import PrimaryTabsNav from '@/components/PrimaryTabsNav';
import { patientsApi, type ApiPatient, type ApiRiskLevel, type CreatePatientPayload } from '@/lib/api';

type RiskLevel = ApiRiskLevel;
type TabId = 'overview' | 'patients' | 'risk' | 'tasks';

type Patient = {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  idCardNumber: string | null;
  diagnosis: string;
  risk: RiskLevel;
  visitDate: string | null;
  address: string | null;
  allergies: string | null;
  pastHistory: string | null;
  bloodPressure: string | null;
  metricName: string | null;
  metricValue: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactRelationship: string | null;
  createdAt: string;
};

type PatientForm = {
  name: string;
  age: string;
  gender: string;
  phone: string;
  idCardNumber: string;
  diagnosis: string;
  risk: RiskLevel;
  visitDate: string;
  address: string;
  allergies: string;
  pastHistory: string;
  bloodPressure: string;
  metricName: string;
  metricValue: string;
  contactName: string;
  contactPhone: string;
  contactRelationship: string;
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: '总览', icon: 'dashboard' },
  { id: 'patients', label: '患者库', icon: 'groups' },
  { id: 'risk', label: '风险分层', icon: 'analytics' },
  { id: 'tasks', label: '待办', icon: 'task_alt' },
];

const TASKS = ['复核高风险患者治疗计划', '补录缺失的监测数据', '安排未达标患者复查'];
const GENDERS = ['未填写', '男', '女', '其他'] as const;
const PHONE_PATTERN = /^1\d{10}$/;
const ID_CARD_PATTERN = /^(?:\d{15}|\d{17}[\dXx])$/;
const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800';

const INITIAL_FORM: PatientForm = {
  name: '',
  age: '',
  gender: '未填写',
  phone: '',
  idCardNumber: '',
  diagnosis: '',
  risk: 'medium',
  visitDate: '',
  address: '',
  allergies: '',
  pastHistory: '',
  bloodPressure: '',
  metricName: '血糖',
  metricValue: '',
  contactName: '',
  contactPhone: '',
  contactRelationship: '',
};

function formatRequestError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return fallback;
}

function riskLabel(risk: RiskLevel) {
  return risk === 'high' ? '高风险' : risk === 'medium' ? '中风险' : '低风险';
}

function riskClass(risk: RiskLevel) {
  return risk === 'high'
    ? 'border-red-200 bg-red-50 text-red-600'
    : risk === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-600'
      : 'border-emerald-200 bg-emerald-50 text-emerald-600';
}

function formatText(value: string | null | undefined, fallback = '未填写') {
  return value && value.trim() ? value : fallback;
}

function formatAge(age: number | null) {
  return age === null || Number.isNaN(age) ? '未填写' : `${age} 岁`;
}

function formatDate(value: string | null) {
  if (!value) return '未填写';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('zh-CN');
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN', { hour12: false });
}

function maskPhone(phone: string | null) {
  if (!phone || !phone.trim()) return '未填写';
  return phone.length < 7 ? phone : `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function maskIdCard(value: string | null) {
  if (!value || !value.trim()) return '未填写';
  return value.length <= 8 ? `${value.slice(0, 2)}***${value.slice(-2)}` : `${value.slice(0, 6)}********${value.slice(-4)}`;
}

function mapPatient(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    idCardNumber: patient.id_card_number,
    diagnosis: patient.diagnosis,
    risk: patient.risk_level,
    visitDate: patient.visit_date,
    address: patient.address,
    allergies: patient.allergies,
    pastHistory: patient.past_history,
    bloodPressure: patient.blood_pressure,
    metricName: patient.metric_name,
    metricValue: patient.metric_value,
    contactName: patient.contact_name,
    contactPhone: patient.contact_phone,
    contactRelationship: patient.contact_relationship,
    createdAt: patient.created_at,
  };
}

function buildPayload(form: PatientForm): CreatePatientPayload {
  const age = form.age.trim() ? Number(form.age.trim()) : null;
  return {
    name: form.name.trim(),
    age: Number.isFinite(age) ? age : null,
    gender: form.gender === '未填写' ? null : form.gender,
    phone: form.phone.trim() || null,
    id_card_number: form.idCardNumber.trim() || null,
    diagnosis: form.diagnosis.trim(),
    risk_level: form.risk,
    visit_date: form.visitDate || null,
    address: form.address.trim() || null,
    allergies: form.allergies.trim() || null,
    past_history: form.pastHistory.trim() || null,
    blood_pressure: form.bloodPressure.trim() || null,
    metric_name: form.metricName.trim() || null,
    metric_value: form.metricValue.trim() || null,
    contact_name: form.contactName.trim() || null,
    contact_phone: form.contactPhone.trim() || null,
    contact_relationship: form.contactRelationship.trim() || null,
  };
}

function formFromPatient(patient: Patient): PatientForm {
  return {
    name: patient.name,
    age: patient.age === null ? '' : String(patient.age),
    gender: patient.gender || '未填写',
    phone: patient.phone || '',
    idCardNumber: patient.idCardNumber || '',
    diagnosis: patient.diagnosis,
    risk: patient.risk,
    visitDate: patient.visitDate || '',
    address: patient.address || '',
    allergies: patient.allergies || '',
    pastHistory: patient.pastHistory || '',
    bloodPressure: patient.bloodPressure || '',
    metricName: patient.metricName || '',
    metricValue: patient.metricValue || '',
    contactName: patient.contactName || '',
    contactPhone: patient.contactPhone || '',
    contactRelationship: patient.contactRelationship || '',
  };
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`space-y-2 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-sm text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-3 dark:bg-slate-800 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap font-semibold">{value}</p>
    </div>
  );
}

function PatientCard({
  patient,
  onSelect,
  onEdit,
  onDelete,
  deleting,
}: {
  patient: Patient;
  onSelect: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  deleting: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{patient.name}</h3>
          <p className="mt-1 text-xs text-slate-400">病历号 {patient.id}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${riskClass(patient.risk)}`}>{riskLabel(patient.risk)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{formatAge(patient.age)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{formatText(patient.gender)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{formatDate(patient.visitDate)}</span>
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{patient.diagnosis}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-400">手机号</p><p className="mt-1 font-semibold">{maskPhone(patient.phone)}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-400">血压</p><p className="mt-1 font-semibold">{formatText(patient.bloodPressure, '--/--')}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-400">{formatText(patient.metricName, '指标')}</p><p className="mt-1 font-semibold">{formatText(patient.metricValue, '--')}</p></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-400">联系人</p><p className="mt-1 font-semibold">{formatText(patient.contactName)}</p></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">身份证号 {maskIdCard(patient.idCardNumber)} · 联系电话 {maskPhone(patient.contactPhone)}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onSelect(patient)} className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white">查看详情</button>
        <button type="button" onClick={() => onEdit(patient)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300">编辑</button>
        <button type="button" onClick={() => onDelete(patient)} disabled={deleting} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">{deleting ? '删除中...' : '删除'}</button>
      </div>
    </article>
  );
}

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState('未同步');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<PatientForm>(INITIAL_FORM);

  const loadPatients = async (background = false) => {
    if (!background) setLoading(true);
    setError('');
    try {
      const data = await patientsApi.getAll();
      setPatients(data.map(mapPatient));
      setLastSyncAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    } catch (loadError) {
      setError(formatRequestError(loadError, '患者数据加载失败，请检查后端和 PostgreSQL 配置。'));
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return patients.filter((patient) => {
      if (riskFilter !== 'all' && patient.risk !== riskFilter) return false;
      if (!keyword) return true;
      return [
        patient.name,
        patient.id,
        patient.phone,
        patient.idCardNumber,
        patient.diagnosis,
        patient.visitDate,
        patient.address,
        patient.allergies,
        patient.pastHistory,
        patient.metricName,
        patient.metricValue,
        patient.bloodPressure,
        patient.contactName,
        patient.contactPhone,
        patient.contactRelationship,
      ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
    });
  }, [patients, riskFilter, searchQuery]);

  const sortedPatients = useMemo(() => {
    const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return [...filteredPatients].sort((a, b) => {
      const riskDiff = order[a.risk] - order[b.risk];
      return riskDiff !== 0 ? riskDiff : b.createdAt.localeCompare(a.createdAt);
    });
  }, [filteredPatients]);

  const visiblePatients = activeTab === 'overview' ? sortedPatients.slice(0, 6) : sortedPatients;
  const counts = {
    high: patients.filter((patient) => patient.risk === 'high').length,
    medium: patients.filter((patient) => patient.risk === 'medium').length,
    low: patients.filter((patient) => patient.risk === 'low').length,
  };

  const closeForm = () => {
    setCreateOpen(false);
    setEditingPatient(null);
    setFormError('');
  };

  const submitPatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.diagnosis.trim()) return setFormError('请至少填写患者姓名和初步诊断。');
    if (form.age.trim() && (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 130)) return setFormError('年龄必须是 0 到 130 之间的整数。');
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) return setFormError('手机号必须是 11 位中国大陆手机号。');
    if (form.idCardNumber.trim() && !ID_CARD_PATTERN.test(form.idCardNumber.trim())) return setFormError('身份证号必须是 15 位数字或 18 位数字/字母 X。');
    if (form.contactPhone.trim() && !PHONE_PATTERN.test(form.contactPhone.trim())) return setFormError('联系人手机号必须是 11 位中国大陆手机号。');

    setSaving(true);
    setFormError('');
    setSuccessMessage('');
    try {
      const saved = editingPatient ? await patientsApi.update(editingPatient.id, buildPayload(form)) : await patientsApi.create(buildPayload(form));
      const next = mapPatient(saved);
      setPatients((current) => [next, ...current.filter((patient) => patient.id !== next.id)]);
      setLastSyncAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setSelectedPatient((current) => (current?.id === next.id ? next : current));
      setActiveTab('patients');
      closeForm();
      setSuccessMessage(editingPatient ? '患者信息已更新。' : '患者已写入 PostgreSQL。');
    } catch (saveError) {
      setFormError(formatRequestError(saveError, editingPatient ? '患者更新失败，请稍后重试。' : '患者保存失败，请稍后重试。'));
    } finally {
      setSaving(false);
    }
  };

  const deletePatient = async (patient: Patient) => {
    if (!window.confirm(`确认删除患者“${patient.name}”吗？此操作不可恢复。`)) return;
    setDeletingId(patient.id);
    setSuccessMessage('');
    setError('');
    try {
      await patientsApi.delete(patient.id);
      setPatients((current) => current.filter((item) => item.id !== patient.id));
      setSelectedPatient((current) => (current?.id === patient.id ? null : current));
      setLastSyncAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setSuccessMessage(`患者“${patient.name}”已删除。`);
    } catch (deleteError) {
      setError(formatRequestError(deleteError, '患者删除失败，请稍后重试。'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background-light p-6 text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-white/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">医生工作台</p>
              <h1 className="text-3xl font-black text-primary">医生管理后台</h1>
              <p className="mt-1 text-sm text-slate-500">患者完整档案已接入 PostgreSQL，手机号和身份证号默认脱敏显示。</p>
            </div>
            <div className="flex items-center gap-3">
              <PrimaryTabsNav className="hidden md:flex" />
              <button type="button" onClick={() => { setSyncing(true); void loadPatients(true).finally(() => setSyncing(false)); }} disabled={syncing} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold hover:bg-slate-200 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700">{syncing ? '同步中...' : `同步数据 | ${lastSyncAt}`}</button>
              <button type="button" onClick={() => { setForm(INITIAL_FORM); setEditingPatient(null); setFormError(''); setCreateOpen(true); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">新建患者</button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 bg-gradient-to-r from-primary via-primary to-cyan-600 px-6 py-5 text-white md:grid-cols-3">
          <div><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">总览</p><p className="mt-2 text-sm text-cyan-50/90">在院患者总数</p><p className="mt-1 text-3xl font-black">{patients.length}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">数据源</p><p className="mt-2 text-sm text-cyan-50/90">最近一次同步</p><p className="mt-1 text-3xl font-black">{lastSyncAt}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">状态</p><p className="mt-2 text-sm text-cyan-50/90">后端与数据库状态</p><p className="mt-1 text-3xl font-black">已就绪</p></div>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${activeTab === tab.id ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900'}`}>
            <span className="material-symbols-outlined">{tab.icon}</span>
            <span className="font-semibold">{tab.label}</span>
          </button>
        ))}
      </section>

      {successMessage && <section className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</section>}
      {error && <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</section>}

      {(activeTab === 'overview' || activeTab === 'risk') && (
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">高风险患者</p><p className="mt-2 text-3xl font-black text-red-600">{counts.high}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">中风险患者</p><p className="mt-2 text-3xl font-black text-amber-600">{counts.medium}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">低风险患者</p><p className="mt-2 text-3xl font-black text-emerald-600">{counts.low}</p></div>
        </section>
      )}

      {activeTab !== 'tasks' && (
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_auto]">
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800" placeholder="搜索姓名、病历号、手机号、身份证号、诊断、地址或联系人" />
            </label>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | RiskLevel)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800">
              <option value="all">全部风险等级</option><option value="high">仅看高风险</option><option value="medium">仅看中风险</option><option value="low">仅看低风险</option>
            </select>
            <div className="flex items-center justify-end text-sm text-slate-500">当前结果 {visiblePatients.length} 条</div>
          </div>
          <p className="mt-3 text-xs text-slate-400">提示：手机号、身份证号、联系人电话均已脱敏显示。</p>
        </section>
      )}

      {activeTab === 'tasks' ? (
        <section className="space-y-3">{TASKS.map((task) => <article key={task} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">{task}</h2></article>)}</section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">正在从 PostgreSQL 加载患者数据...</div> : visiblePatients.length === 0 ? <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">当前筛选条件下没有患者记录。</div> : visiblePatients.map((patient) => <PatientCard key={patient.id} patient={patient} onSelect={setSelectedPatient} onEdit={(item) => { setForm(formFromPatient(item)); setEditingPatient(item); setFormError(''); setCreateOpen(true); }} onDelete={deletePatient} deleting={deletingId === patient.id} />)}
        </section>
      )}

      {createOpen && (
        <Modal title={editingPatient ? '编辑患者' : '新建患者'} onClose={closeForm}>
          <form className="space-y-6" onSubmit={submitPatient}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="患者姓名"><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={INPUT} placeholder="患者姓名" /></Field>
              <Field label="年龄"><input value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} className={INPUT} placeholder="年龄" inputMode="numeric" /></Field>
              <Field label="性别"><select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className={INPUT}>{GENDERS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="风险等级"><select value={form.risk} onChange={(event) => setForm((current) => ({ ...current, risk: event.target.value as RiskLevel }))} className={INPUT}><option value="high">高风险</option><option value="medium">中风险</option><option value="low">低风险</option></select></Field>
              <Field label="手机号"><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={INPUT} placeholder="11 位手机号" inputMode="numeric" /></Field>
              <Field label="身份证号"><input value={form.idCardNumber} onChange={(event) => setForm((current) => ({ ...current, idCardNumber: event.target.value }))} className={INPUT} placeholder="15 位或 18 位身份证号" /></Field>
              <Field label="就诊日期"><input type="date" value={form.visitDate} onChange={(event) => setForm((current) => ({ ...current, visitDate: event.target.value }))} className={INPUT} /></Field>
              <Field label="地址"><input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className={INPUT} placeholder="居住地址" /></Field>
            </div>

            <Field label="初步诊断" wide><textarea value={form.diagnosis} onChange={(event) => setForm((current) => ({ ...current, diagnosis: event.target.value }))} className={`${INPUT} min-h-[96px] resize-y`} placeholder="初步诊断" /></Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="血压"><input value={form.bloodPressure} onChange={(event) => setForm((current) => ({ ...current, bloodPressure: event.target.value }))} className={INPUT} placeholder="如 126/82" /></Field>
              <Field label="指标名称"><input value={form.metricName} onChange={(event) => setForm((current) => ({ ...current, metricName: event.target.value }))} className={INPUT} placeholder="如 HbA1c" /></Field>
              <Field label="指标值"><input value={form.metricValue} onChange={(event) => setForm((current) => ({ ...current, metricValue: event.target.value }))} className={INPUT} placeholder="如 6.4%" /></Field>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="过敏史"><textarea value={form.allergies} onChange={(event) => setForm((current) => ({ ...current, allergies: event.target.value }))} className={`${INPUT} min-h-[96px] resize-y`} placeholder="药物、食物、环境过敏信息" /></Field>
              <Field label="既往史"><textarea value={form.pastHistory} onChange={(event) => setForm((current) => ({ ...current, pastHistory: event.target.value }))} className={`${INPUT} min-h-[96px] resize-y`} placeholder="基础疾病、手术史、长期用药等" /></Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="联系人"><input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} className={INPUT} placeholder="联系人姓名" /></Field>
              <Field label="联系人电话"><input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} className={INPUT} placeholder="11 位手机号" inputMode="numeric" /></Field>
              <Field label="与患者关系"><input value={form.contactRelationship} onChange={(event) => setForm((current) => ({ ...current, contactRelationship: event.target.value }))} className={INPUT} placeholder="如 配偶、子女" /></Field>
            </div>

            {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">取消</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">{saving ? '保存中...' : editingPatient ? '保存修改' : '保存患者'}</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedPatient && (
        <Modal title="患者详情" onClose={() => setSelectedPatient(null)}>
          <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">敏感字段已脱敏显示，若需修改手机号或身份证号，请点击“编辑患者”。</div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Detail label="患者姓名" value={selectedPatient.name} /><Detail label="病历号" value={selectedPatient.id} />
            <Detail label="年龄" value={formatAge(selectedPatient.age)} /><Detail label="性别" value={formatText(selectedPatient.gender)} />
            <Detail label="手机号（脱敏）" value={maskPhone(selectedPatient.phone)} /><Detail label="身份证号（脱敏）" value={maskIdCard(selectedPatient.idCardNumber)} />
            <Detail label="风险等级" value={riskLabel(selectedPatient.risk)} /><Detail label="就诊日期" value={formatDate(selectedPatient.visitDate)} />
            <Detail label="血压" value={formatText(selectedPatient.bloodPressure, '--/--')} /><Detail label={formatText(selectedPatient.metricName, '指标')} value={formatText(selectedPatient.metricValue, '--')} />
            <Detail label="联系人" value={formatText(selectedPatient.contactName)} /><Detail label="联系人电话（脱敏）" value={maskPhone(selectedPatient.contactPhone)} />
            <Detail label="与患者关系" value={formatText(selectedPatient.contactRelationship)} /><Detail label="创建时间" value={formatDateTime(selectedPatient.createdAt)} />
            <Detail label="地址" value={formatText(selectedPatient.address)} wide /><Detail label="初步诊断" value={selectedPatient.diagnosis} wide />
            <Detail label="过敏史" value={formatText(selectedPatient.allergies)} wide /><Detail label="既往史" value={formatText(selectedPatient.pastHistory)} wide />
          </div>
        </Modal>
      )}
    </div>
  );
}
