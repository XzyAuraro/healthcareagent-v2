'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { authApi } from '@/lib/api';

type AuthMode = 'login' | 'register';

const DEMO_USERNAME = 'doctor001';
const DEMO_PASSWORD = 'password123';

const ROLE_OPTIONS = ['医学生', '实习医生', '住院医师', '主治医师', '副主任医师', '主任医师'];

function formatAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = maybeResponse?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((item: { msg?: string }) => item.msg ?? '输入格式错误').join('，');
    }
  }

  return '操作失败，请稍后重试。';
}

function setTokenCookie(token: string): void {
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=28800; samesite=lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('住院医师');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hintMessage, setHintMessage] = useState('');

  const isRegister = mode === 'register';

  const resetMessages = () => {
    setErrorMessage('');
    setHintMessage('');
  };

  const setModeAndReset = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!agreedTerms) {
      setErrorMessage('请先阅读并同意数据安全条款。');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMessage('请输入账号和密码。');
      return;
    }

    if (isRegister) {
      if (!fullName.trim() || !department.trim() || !role.trim()) {
        setErrorMessage('请完整填写注册信息。');
        return;
      }

      if (password.length < 8) {
        setErrorMessage('密码长度至少 8 位。');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('两次输入的密码不一致。');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        await authApi.register({
          username: username.trim(),
          full_name: fullName.trim(),
          department: department.trim(),
          role: role.trim(),
          password,
        });
        setHintMessage('注册成功，正在自动登录。');
      }

      const result = (await authApi.login(username.trim(), password)) as
        | { access_token?: string; token_type?: string }
        | undefined;
      const token = result?.access_token;

      if (!token) {
        throw new Error('token missing');
      }

      localStorage.setItem('token', token);
      setTokenCookie(token);
      router.replace('/');
      router.refresh();
    } catch (error) {
      setErrorMessage(formatAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-950">
      <Image
        src="/images/page_img/login_BG.jpg"
        alt="医疗登录背景"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/45" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10">
        <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-1.5 shadow-sm">
                <Image
                  src="/images/logo.png"
                  alt="Healthcare Agent Logo"
                  width={56}
                  height={56}
                  priority
                  className="h-14 w-14 rounded-xl object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">Healthcare Agent</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">都梁痛安·疼痛管理智能辅助平台</h1>
                <p className="mt-1 text-sm text-slate-500">登录后可进入临床辅助、训练与医生工作台。</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{isRegister ? '创建账号' : '账号登录'}</h2>
                <p className="mt-1 text-sm text-slate-500">请填写账号信息继续。</p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-right text-xs text-cyan-800">
                <p className="font-semibold">演示账号</p>
                <p className="mt-1 whitespace-nowrap">
                  {DEMO_USERNAME} / {DEMO_PASSWORD}
                </p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setModeAndReset('login')}
                className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setModeAndReset('register')}
                className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                注册
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegister && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">姓名</label>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      placeholder="请输入姓名"
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">科室</label>
                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      placeholder="例如：疼痛科 / 麻醉科"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">角色</label>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">工号 / 手机号</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="请输入登录账号"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {isRegister ? '设置密码' : '登录密码'}
                </label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="请输入密码"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">确认密码</label>
                  <div className="relative">
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <label className="flex items-start gap-3 text-xs leading-5 text-slate-500">
                <input
                  checked={agreedTerms}
                  onChange={(event) => setAgreedTerms(event.target.checked)}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  我已阅读并同意
                  <Link href="/policy" className="mx-1 font-semibold text-cyan-700 hover:text-cyan-800 hover:underline">
                    《医疗数据保密条款》
                  </Link>
                  与
                  <Link href="/policy" className="ml-1 font-semibold text-cyan-700 hover:text-cyan-800 hover:underline">
                    《隐私政策》
                  </Link>
                </span>
              </label>

              {errorMessage && (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {errorMessage}
                </p>
              )}

              {hintMessage && (
                <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  {hintMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3.5 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {isRegister
                    ? submitting
                      ? '注册中...'
                      : '注册并登录'
                    : submitting
                      ? '登录中...'
                      : '立即登录'}
                </span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <button
                type="button"
                className="font-semibold text-cyan-700 transition hover:text-cyan-800 hover:underline"
                onClick={() => setHintMessage('请联系管理员重置账号密码。')}
              >
                忘记密码
              </button>
              <Link href="/policy" className="font-semibold text-slate-600 transition hover:text-slate-900 hover:underline">
                查看合规说明
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
