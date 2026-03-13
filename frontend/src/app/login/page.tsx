'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { authApi } from '@/lib/api';

type AuthMode = 'login' | 'register';

const DEMO_USERNAME = 'doctor001';
const DEMO_PASSWORD = 'password123';

function formatAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { detail?: string } } }).response;
    if (maybeResponse?.data?.detail) {
      return maybeResponse.data.detail;
    }
  }
  return '登录失败，请检查账号密码后重试。';
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
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hintMessage, setHintMessage] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setHintMessage('');

    if (!agreedTerms) {
      setErrorMessage('请先阅读并同意数据安全条款。');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMessage('请输入账号和密码。');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setErrorMessage('两次输入的密码不一致。');
        return;
      }
      setHintMessage('演示环境暂不开放自助注册，请使用演示账号登录。');
      return;
    }

    setSubmitting(true);
    try {
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
    } catch (error) {
      setErrorMessage(formatAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 font-display">
      <Image
        src="/images/log_in_bg.png"
        alt="登录背景"
        fill
        priority
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
      <div className="pointer-events-none absolute -left-28 top-8 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden text-white lg:block">
          <div className="mb-8 flex items-center gap-4">
            <div className="overflow-hidden rounded-2xl border border-cyan-300/40 bg-white/95 p-2 shadow-lg shadow-slate-950/40">
              <Image src="/images/logo.png" alt="智医助手 Logo" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-cyan-100/90">智医助手</p>
              <h1 className="text-3xl font-black">智医助手・镇痛类药物辅助决策系统</h1>
            </div>
          </div>

          <p className="max-w-xl text-base leading-7 text-slate-200">
            参考 stitch_/_5 的登录结构做了适配，保留医疗场景视觉并补齐可用登录流程，支持账号登录、条款确认和会话保持。
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-200/90">
              <span className="material-symbols-outlined text-cyan-300">verified_user</span>
              <span>严格遵循医疗数据最小化原则和访问审计流程。</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200/90">
              <span className="material-symbols-outlined text-cyan-300">lock</span>
              <span>TLS 加密链路 + 登录态校验，避免未授权访问。</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200/90">
              <span className="material-symbols-outlined text-cyan-300">monitor_heart</span>
              <span>临床、培训、政策模块入口已统一可点击导航。</span>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-950/30">
            <div className="relative bg-gradient-to-br from-primary to-indigo-700 px-7 py-7 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Medical Professional Portal</p>
              <h2 className="mt-2 text-2xl font-bold">{isRegister ? '账号注册' : '欢迎登录'}</h2>
              <p className="mt-2 text-sm text-slate-100/90">演示账号：doctor001 / password123</p>
            </div>

            <div className="p-7">
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  账号登录
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  账号注册
                </button>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">工号 / 手机号</label>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-slate-400">
                      person
                    </span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="请输入账号"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {isRegister ? '设置密码' : '登录密码'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-slate-400">
                      lock
                    </span>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-3 text-slate-400">
                        verified_user
                      </span>
                      <input
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span>
                    我已阅读并同意
                    <Link href="/policy" className="mx-1 text-primary hover:underline">
                      《医疗数据保密条款》
                    </Link>
                    与
                    <Link href="/policy" className="ml-1 text-primary hover:underline">
                      《隐私政策》
                    </Link>
                  </span>
                </label>

                {errorMessage && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {errorMessage}
                  </p>
                )}
                {hintMessage && (
                  <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {hintMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{isRegister ? '提交注册' : submitting ? '登录中...' : '立即登录'}</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
                <span>忘记密码？</span>
                <button
                  type="button"
                  className="ml-2 font-semibold text-primary hover:underline"
                  onClick={() => setHintMessage('请联系管理员重置账号密码。')}
                >
                  联系管理员
                </button>
              </div>

              <div className="mt-3 text-center text-xs text-slate-400">
                演示账号：{DEMO_USERNAME} / {DEMO_PASSWORD}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-5 left-1/2 z-20 w-[min(92vw,900px)] -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/70 px-5 py-2 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] tracking-wide text-slate-200">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            安全状态：TLS 加密通信已开启
          </span>
          <span className="h-3 w-px bg-white/20" />
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-cyan-300">shield_lock</span>
            动态脱敏：敏感字段实时保护
          </span>
          <span className="h-3 w-px bg-white/20" />
          <Link href="/policy" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
            查看合规政策
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
