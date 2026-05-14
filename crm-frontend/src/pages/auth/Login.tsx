import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGlobeAsia,
  FaLock
} from 'react-icons/fa'
import { authApi } from '../../api'
import { reportApiError } from '../../lib/notify'
import { useAuth } from '../../context/AuthContext'

const DEMO_EMAIL = ''
const DEMO_PASSWORD = ''
const PERMISSION_RESOLVE_TIMEOUT_MS = 2500
const ENABLE_LOGIN_PERF_LOGS = import.meta.env.DEV

type LoginPerfSummary = {
  route: string
  role: string
  totalMs: number
  loginApiMs: number
  permissionWaitMs: number
  permissionState: 'skipped_admin' | 'resolved' | 'timeout_or_empty'
}

const getNowMs = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now()

const formatMs = (value: number) => Number(value.toFixed(1))

const logLoginPerf = (summary: LoginPerfSummary) => {
  if (!ENABLE_LOGIN_PERF_LOGS) return
  console.info('[login-perf]', {
    ...summary,
    totalMs: formatMs(summary.totalMs),
    loginApiMs: formatMs(summary.loginApiMs),
    permissionWaitMs: formatMs(summary.permissionWaitMs)
  })
}

const normalizePermissionKey = (permission: string) =>
  String(permission || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, ':')

const hasPermission = (grantedPermissions: string[], required: string) => {
  const requiredKey = normalizePermissionKey(required)
  const normalized = grantedPermissions
    .map(normalizePermissionKey)
    .filter(Boolean)

  return normalized.some(permission => {
    if (permission === '*' || permission === requiredKey) return true
    if (permission.endsWith(':*')) {
      const scope = permission.slice(0, -2)
      return requiredKey.startsWith(`${scope}:`)
    }
    if (permission.endsWith(':write')) {
      const scope = permission.slice(0, -6)
      return (
        requiredKey === `${scope}:read` ||
        requiredKey === `${scope}:create` ||
        requiredKey === `${scope}:update` ||
        requiredKey === `${scope}:delete` ||
        requiredKey === `${scope}:write`
      )
    }
    return false
  })
}

const resolveLandingRoute = (permissions: string[]) => {
  const routeOrder: Array<{ permission: string; to: string }> = [
    { permission: 'reports:read', to: '/dashboard' },
    { permission: 'leads:read', to: '/leads' },
    { permission: 'quotations:read', to: '/quotations' },
    { permission: 'bookings:read', to: '/bookings' },
    { permission: 'payments:read', to: '/payments' },
    { permission: 'refunds:read', to: '/refunds' },
    { permission: 'visa:read', to: '/visa' },
    { permission: 'campaigns:read', to: '/campaigns' },
    { permission: 'customers:read', to: '/customers' },
    { permission: 'complaints:read', to: '/complaints' },
    { permission: 'users:read', to: '/users' },
    { permission: 'settings:read', to: '/settings' }
  ]

  for (const candidate of routeOrder) {
    if (hasPermission(permissions, candidate.permission)) {
      return candidate.to
    }
  }
  return '/profile'
}

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { setAuthState, refreshPermissions } = useAuth()

  const togglePassword = () => {
    setShowPassword(!showPassword)
  }

  const validateForm = () => {
    const newErrors = { email: '', password: '' }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return !newErrors.email && !newErrors.password
  }

  const normalizeBooleanFlag = (value: unknown): boolean | null => {
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true
    }
    if (value === false || value === 0 || value === '0' || value === 'false') {
      return false
    }
    return null
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)
    setApiError('')
    const signInStartMs = getNowMs()
    let loginApiMs = 0
    let permissionWaitMs = 0

    try {
      const loginApiStartMs = getNowMs()
      const { data } = await authApi.login({
        email,
        password,
        rememberMe: true
      })
      loginApiMs = getNowMs() - loginApiStartMs
      const userName =
        data.user.fullName || data.user.name || email.split('@')[0]
      const userEmail = data.user.email || email
      const userRole = data.user.role
      setAuthState(data.accessToken, {
        id: data.user.id,
        name: userName,
        email: userEmail,
        role: userRole,
        roleId: data.user.roleId,
        active: normalizeBooleanFlag(data.user.active ?? data.user.isActive),
        isActive:
          normalizeBooleanFlag(data.user.isActive ?? data.user.active) ??
          undefined
      })
      const isAdmin = String(userRole || '').toLowerCase() === 'admin'
      if (isAdmin) {
        logLoginPerf({
          route: '/dashboard',
          role: String(userRole || 'admin'),
          totalMs: getNowMs() - signInStartMs,
          loginApiMs,
          permissionWaitMs: 0,
          permissionState: 'skipped_admin'
        })
        navigate('/dashboard')
        return
      }
      const permissionsPromise = refreshPermissions(data.accessToken)
      const permissionWaitStartMs = getNowMs()
      const permissions = await new Promise<string[] | null>(resolve => {
        const timeoutId = window.setTimeout(
          () => resolve(null),
          PERMISSION_RESOLVE_TIMEOUT_MS
        )

        permissionsPromise.then(nextPermissions => {
          window.clearTimeout(timeoutId)
          resolve(nextPermissions)
        })
      })
      permissionWaitMs = getNowMs() - permissionWaitStartMs

      if (permissions && permissions.length > 0) {
        const route = resolveLandingRoute(permissions)
        logLoginPerf({
          route,
          role: String(userRole || 'user'),
          totalMs: getNowMs() - signInStartMs,
          loginApiMs,
          permissionWaitMs,
          permissionState: 'resolved'
        })
        navigate(route)
        return
      }

      logLoginPerf({
        route: '/profile',
        role: String(userRole || 'user'),
        totalMs: getNowMs() - signInStartMs,
        loginApiMs,
        permissionWaitMs,
        permissionState: 'timeout_or_empty'
      })
      navigate('/profile')
      void permissionsPromise.then(nextPermissions => {
        if (!nextPermissions.length) return
        const target = resolveLandingRoute(nextPermissions)
        if (target === '/profile') return
        if (
          typeof window !== 'undefined' &&
          window.location.pathname === '/profile'
        ) {
          navigate(target, { replace: true })
        }
      })
    } catch (err) {
      reportApiError(
        err,
        'Unable to sign in right now. Please try again.',
        setApiError
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 text-slate-900'>
      <div className='relative min-h-screen overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_55%)]' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(6,182,212,0.14),_transparent_45%)]' />

        <div className='relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]'>
          {/* LEFT BRAND PANEL */}
          <section className='hidden lg:flex relative flex-col justify-between px-16 py-16 xl:px-20 xl:py-20 overflow-hidden bg-[#020617]'>
            {/* INLINE ANIMATIONS */}
            <style>{`
              @keyframes orbit-rotate {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
              }
              @keyframes core-pulse {
                0%, 100% { transform: scale(1); opacity: 0.9; filter: blur(0px); }
                50% { transform: scale(1.08); opacity: 1; filter: blur(2px); }
              }
              @keyframes comet-move {
                0% { transform: translateX(-100%) translateY(0) rotate(-35deg); opacity: 0; }
                10% { opacity: 0.6; }
                90% { opacity: 0.6; }
                100% { transform: translateX(200%) translateY(100px) rotate(-35deg); opacity: 0; }
              }
              @keyframes drift {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(40px, -40px); }
              }
              @keyframes twinkle-star {
                0%, 100% { opacity: 0.2; transform: scale(0.7); }
                50% { opacity: 1; transform: scale(1.2); }
              }
              .glass-card {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
              }
            `}</style>

            {/* BACKGROUND DEPTH LAYERS */}
            <div className='absolute inset-0 z-0 pointer-events-none'>
              <div className='absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[140px] rounded-full animate-[drift_15s_ease-in-out_infinite]' />
              <div className='absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/25 blur-[120px] rounded-full animate-[drift_18s_ease-in-out_infinite_reverse]' />
              <div className='absolute top-[30%] right-[10%] w-[35%] h-[35%] bg-cyan-500/15 blur-[100px] rounded-full animate-[drift_22s_ease-in-out_infinite]' />
              <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_85%)]' />
              <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            </div>

            {/* MAIN ANIMATION SYSTEM (AS BACKGROUND) */}
            <div className='absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-70'>
              <div className='relative w-[800px] h-[800px] translate-x-1/4'>
                {/* CORE ENERGY NODE */}
                <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30'>
                  <div className='w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 p-[1px] shadow-[0_0_100px_rgba(59,130,246,0.4)] animate-[core-pulse_4s_ease-in-out_infinite]'>
                    <div className='w-full h-full rounded-full bg-slate-950 flex items-center justify-center border border-white/10 overflow-hidden relative'>
                      <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.4),_transparent_75%)]' />
                      <div className='relative z-10 flex flex-col items-center'>
                        <FaGlobeAsia className='text-5xl text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-[spin_12s_linear_infinite]' />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ORBIT RINGS */}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className='absolute top-1/2 left-1/2 rounded-full border border-white/[0.03] shadow-[inset_0_0_60px_rgba(255,255,255,0.01)]'
                    style={{
                      width: `${(i + 1) * 180 + 100}px`,
                      height: `${(i + 1) * 180 + 100}px`,
                      animation: `orbit-rotate ${
                        25 + i * 20
                      }s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`
                    }}
                  >
                    {/* Floating Glow Nodes */}
                    <div
                      className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-white/80 to-blue-300 shadow-[0_0_25px_rgba(255,255,255,0.5)] border border-white/40'
                      style={{ filter: `hue-rotate(${i * 45}deg)` }}
                    />
                  </div>
                ))}

                {/* FLOATING PARTICLES */}
                {[...Array(40)].map((_, i) => (
                  <div
                    key={i}
                    className='absolute w-1.5 h-1.5 bg-white rounded-full animate-[twinkle-star_4s_ease-in-out_infinite]'
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      opacity: Math.random() * 0.4 + 0.1
                    }}
                  />
                ))}

                {/* COMET SWEEP LINES */}
                <div className='absolute inset-[-200px] pointer-events-none'>
                  <div className='absolute top-[20%] left-[-10%] w-[150%] h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-[comet-move_8s_linear_infinite]' />
                  <div className='absolute top-[65%] left-[-10%] w-[150%] h-[1px] bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent animate-[comet-move_12s_linear_infinite_4s]' />
                </div>
              </div>
            </div>

            {/* CONTENT LAYER */}
            <div className='relative z-10 h-full flex flex-col justify-between'>
              {/* TOP: BRANDING */}
              <div className='flex items-center gap-4 group cursor-default'>
                <div className='p-0 rounded-2xl transition-all duration-500 group-hover:scale-110'>
                  <img
                    src='/logo1.png'
                    alt='Get2Vacations'
                    className='h-8 w-6 transition-transform duration-500 group-hover:rotate-12'
                  />
                </div>
                <div className='flex flex-col'>
                  <span className='text-2xl font-black tracking-tighter text-white uppercase'>
                    Get2Vacations <span className='text-blue-500'>CRM</span>
                  </span>
                  <span className='text-[10px] font-bold tracking-[0.4em] text-blue-400/70 uppercase'>
                    Travel Intelligence
                  </span>
                </div>
              </div>

              {/* MIDDLE: HEADLINE & DESCRIPTION */}
              <div className='max-w-xl'>
                <h1 className='text-6xl xl:text-7xl font-black tracking-tight text-white leading-[0.95] mb-6'>
                  Redefine your <br />
                  <span className='bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-500'>
                    Travel Ops.
                  </span>
                </h1>
                <p className='text-xl text-slate-400/90 font-medium leading-relaxed max-w-md'>
                  A premium operating system for modern travel agencies. Fast,
                  automated, and hyper-scalable.
                </p>

                <div className='mt-10 flex flex-wrap gap-4'>
                  <div className='glass-card px-5 py-2.5 rounded-full text-xs font-bold text-blue-100 flex items-center gap-2.5 transition-all hover:bg-white/10 cursor-default'>
                    <div className='w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' />
                    SLA Monitoring
                  </div>
                  <div className='glass-card px-5 py-2.5 rounded-full text-xs font-bold text-indigo-100 flex items-center gap-2.5 transition-all hover:bg-white/10 cursor-default'>
                    <div className='w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' />
                    Visa Automation
                  </div>
                  <div className='glass-card px-5 py-2.5 rounded-full text-xs font-bold text-cyan-100 flex items-center gap-2.5 transition-all hover:bg-white/10 cursor-default'>
                    <div className='w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]' />
                    Revenue Intelligence
                  </div>
                </div>
              </div>

              {/* FOOTER: TRUST BADGE */}
              <div className='flex items-center justify-between border-t border-white/10 pt-8'>
                <div className='flex -space-x-3'>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className='w-10 h-10 rounded-full border-2 border-[#020617] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ring-1 ring-white/10'
                    >
                      <img
                        src={`https://i.pravatar.cc/100?u=${i}`}
                        alt='user'
                        className='w-full h-full object-cover opacity-80'
                      />
                    </div>
                  ))}
                  <div className='w-10 h-10 rounded-full border-2 border-[#020617] bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10'>
                    +2k
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xs font-bold text-white'>
                    Join 2,000+ travel pros
                  </p>
                  <p className='text-[10px] font-medium text-slate-500'>
                    Industry-leading CRM since 2024
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT LOGIN FORM */}
          <section className='flex items-center justify-center px-6 py-12 lg:px-10'>
            <div className='w-full max-w-md'>
              <div className='rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-blue-500/10'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='h-11 w-11 rounded-xl flex items-center justify-center'>
                    <img
                      src='/logo1.png'
                      alt='Get2Vacations'
                      className='h-8 w-6'
                    />
                  </div>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-blue-600'>
                      Get2Vacations CRM
                    </p>
                    <p className='text-lg font-semibold text-slate-900'>
                      Sign in to continue
                    </p>
                  </div>
                </div>

                <div className='mb-6'>
                  <h2 className='text-2xl font-semibold text-slate-900'>
                    Welcome back
                  </h2>
                  <p className='text-sm text-slate-500'>
                    Use your admin or team credentials to enter the workspace.
                  </p>
                </div>

                <form className='space-y-5' onSubmit={handleSignIn}>
                  <div>
                    <label className='text-sm font-medium text-slate-700'>
                      Email address
                    </label>
                    <div className='relative mt-2'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400'>
                        <FaEnvelope />
                      </div>
                      <input
                        type='email'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder='name@company.com'
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.email ? 'border-red-300' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='text-sm font-medium text-slate-700'>
                      Password
                    </label>
                    <div className='relative mt-2'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400'>
                        <FaLock />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder='Enter your password'
                        className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.password
                            ? 'border-red-300'
                            : 'border-slate-200'
                        }`}
                      />
                      <button
                        type='button'
                        onClick={togglePassword}
                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors'
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className='mt-1 text-xs text-red-600'>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className='flex items-center justify-between text-sm'>
                    <label className='flex items-center gap-2 text-slate-600'>
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded border-slate-300 text-blue-600'
                      />
                      Remember me
                    </label>
                    {/* <Link
                      to='/forgot-password'
                      className='text-blue-600 font-medium hover:text-blue-700'
                    >
                      Forgot password?
                    </Link> */}
                  </div>

                  <button
                    type='submit'
                    disabled={submitting}
                    className='w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-semibold py-3.5 shadow-md shadow-blue-500/30 hover:bg-blue-700 transition-colors'
                  >
                    {submitting ? 'Signing in...' : 'Sign in'}
                    {!submitting && <FaArrowRight />}
                  </button>

                  {apiError && (
                    <p className='text-sm text-red-600 text-center'>
                      {apiError}
                    </p>
                  )}
                </form>
              </div>

              <p className='mt-6 text-center text-xs text-slate-400'>
                Powered by Get2Vacations Tour & Travels CRM
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Login
