import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGlobeAsia,
  FaLock,
  FaRocket,
  FaUsers,
  FaChartLine,
  FaShieldAlt
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
    <main className='min-h-screen bg-[#0A0A0F] text-white'>
      <div className='relative min-h-screen overflow-hidden'>
        {/* Background with #602FF7 gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-[#602FF7] via-[#4a1fd8] to-[#0A0A0F]' />
        
        {/* Animated background patterns */}
        <div className='absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] opacity-40' />
        
        {/* Floating gradient orbs */}
        <div className='absolute top-20 left-1/4 w-96 h-96 bg-[#8B5CF6] rounded-full blur-[120px] opacity-20 animate-pulse' />
        <div className='absolute bottom-20 right-1/4 w-80 h-80 bg-[#602FF7] rounded-full blur-[100px] opacity-30 animate-pulse' style={{ animationDelay: '2s' }} />
        <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C084FC] rounded-full blur-[150px] opacity-10' />
        
        {/* Stars twinkling effect */}
        <div className='absolute inset-0 overflow-hidden'>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className='absolute w-1 h-1 bg-white rounded-full animate-twinkle'
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                opacity: Math.random() * 0.5 + 0.2
              }}
            />
          ))}
        </div>

        <div className='relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]'>
          {/* LEFT BRAND PANEL - New design */}
          <section className='hidden lg:flex relative flex-col justify-between px-16 py-16 xl:px-20 xl:py-20 overflow-hidden bg-gradient-to-br from-[#602FF7]/30 via-[#4a1fd8]/20 to-transparent backdrop-blur-sm'>
            {/* Inline animations */}
            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px) translateX(0px); }
                25% { transform: translateY(-20px) translateX(10px); }
                50% { transform: translateY(-10px) translateX(-10px); }
                75% { transform: translateY(10px) translateX(5px); }
              }
              @keyframes glow-pulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
              }
              @keyframes slide-up {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes orbit-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .animate-twinkle {
                animation: twinkle 4s ease-in-out infinite;
              }
              @keyframes twinkle {
                0%, 100% { opacity: 0.2; transform: scale(0.7); }
                50% { opacity: 1; transform: scale(1.2); }
              }
              .glass-card {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
              }
            `}</style>

            {/* Animated globe / icon */}
            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40'>
              <div className='relative w-[500px] h-[500px]'>
                <div className='absolute inset-0 rounded-full border-2 border-white/10 animate-[orbit-spin_20s_linear_infinite]' />
                <div className='absolute inset-[50px] rounded-full border border-white/5 animate-[orbit-spin_30s_linear_infinite_reverse]' />
                <div className='absolute inset-[100px] rounded-full border border-white/5 animate-[orbit-spin_40s_linear_infinite]' />
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                  <FaGlobeAsia className='text-8xl text-white/30' />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className='relative z-10 h-full flex flex-col justify-between'>
              {/* Brand */}
              <div className='flex items-center gap-4 group cursor-default animate-[slide-up_0.6s_ease-out]'>
                <div className='p-0 rounded-2xl transition-all duration-500 group-hover:scale-110'>
                  <img
                    src='/logo1.png'
                    alt='ROYALITSERVICE'
                    className='h-10 w-8 brightness-0 invert transition-transform duration-500 group-hover:rotate-12'
                  />
                </div>
                <div className='flex flex-col'>
                  <span className='text-2xl font-black tracking-tighter text-white uppercase'>
                    ROYALITSERVICE <span className='text-[#C084FC]'>CRM</span>
                  </span>
                  <span className='text-[10px] font-bold tracking-[0.4em] text-white/60 uppercase'>
                    Travel Intelligence
                  </span>
                </div>
              </div>

              {/* Main Headline */}
              <div className='max-w-xl animate-[slide-up_0.6s_ease-out_0.2s_both]'>
                <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6'>
                  <FaRocket className='text-[#C084FC] text-xs' />
                  <span className='text-xs font-medium text-white/80'>Next-Gen Travel Platform</span>
                </div>
                <h1 className='text-6xl xl:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6'>
                  Transform Your
                  <br />
                  <span className='bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#8B5CF6] bg-clip-text text-transparent'>
                    Travel Business
                  </span>
                </h1>
                <p className='text-lg text-white/70 leading-relaxed max-w-md'>
                  Enterprise-grade CRM solution designed for modern travel agencies. 
                  Streamline operations, automate workflows, and scale with confidence.
                </p>

                {/* Stats */}
                <div className='mt-10 flex gap-8'>
                  <div>
                    <div className='text-3xl font-black text-white'>98%</div>
                    <div className='text-xs text-white/50'>Client Satisfaction</div>
                  </div>
                  <div>
                    <div className='text-3xl font-black text-white'>24/7</div>
                    <div className='text-xs text-white/50'>Support Available</div>
                  </div>
                  <div>
                    <div className='text-3xl font-black text-white'>500+</div>
                    <div className='text-xs text-white/50'>Agencies Trust Us</div>
                  </div>
                </div>

                {/* Feature pills */}
                <div className='mt-10 flex flex-wrap gap-3'>
                  <div className='glass-card px-4 py-2 rounded-full text-xs font-medium text-white/80 flex items-center gap-2'>
                    <FaShieldAlt className='text-[#C084FC] text-xs' />
                    Enterprise Security
                  </div>
                  <div className='glass-card px-4 py-2 rounded-full text-xs font-medium text-white/80 flex items-center gap-2'>
                    <FaChartLine className='text-[#C084FC] text-xs' />
                    Real-time Analytics
                  </div>
                  <div className='glass-card px-4 py-2 rounded-full text-xs font-medium text-white/80 flex items-center gap-2'>
                    <FaUsers className='text-[#C084FC] text-xs' />
                    Team Collaboration
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className='flex items-center justify-between border-t border-white/10 pt-8 animate-[slide-up_0.6s_ease-out_0.4s_both]'>
                <div className='flex -space-x-3'>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className='w-10 h-10 rounded-full border-2 border-[#602FF7] bg-gradient-to-br from-[#8B5CF6] to-[#602FF7] flex items-center justify-center text-[10px] font-bold text-white overflow-hidden'
                    >
                      <img
                        src={`https://i.pravatar.cc/100?u=${i}`}
                        alt='user'
                        className='w-full h-full object-cover'
                      />
                    </div>
                  ))}
                  <div className='w-10 h-10 rounded-full border-2 border-[#602FF7] bg-gradient-to-br from-[#C084FC] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-white'>
                    +2k
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xs font-medium text-white/80'>
                    Trusted by industry leaders
                  </p>
                  <p className='text-[10px] font-medium text-white/40'>
                    Join the future of travel management
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT LOGIN FORM - Redesigned */}
          <section className='flex items-center justify-center px-6 py-12 lg:px-10'>
            <div className='w-full max-w-md'>
              <div className='rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-2xl border border-white/20'>
                <div className='text-center mb-8'>
                  <div className='mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#602FF7] to-[#8B5CF6] flex items-center justify-center mb-4 shadow-lg shadow-[#602FF7]/30'>
                    <img
                      src='/logo1.png'
                      alt='ROYALITSERVICE'
                      className='h-8 w-6 brightness-0 invert'
                    />
                  </div>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    Welcome back
                  </h2>
                  <p className='text-sm text-gray-500 mt-1'>
                    Sign in to access your workspace
                  </p>
                </div>

                <form className='space-y-5' onSubmit={handleSignIn}>
                  <div>
                    <label className='text-sm font-medium text-gray-700'>
                      Email address
                    </label>
                    <div className='relative mt-2'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400'>
                        <FaEnvelope className='text-sm' />
                      </div>
                      <input
                        type='email'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder='name@company.com'
                        className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#602FF7] focus:border-[#602FF7] transition-all ${
                          errors.email ? 'border-red-300' : 'border-gray-200'
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
                    <label className='text-sm font-medium text-gray-700'>
                      Password
                    </label>
                    <div className='relative mt-2'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400'>
                        <FaLock className='text-sm' />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder='Enter your password'
                        className={`w-full pl-10 pr-10 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-[#602FF7] focus:border-[#602FF7] transition-all ${
                          errors.password
                            ? 'border-red-300'
                            : 'border-gray-200'
                        }`}
                      />
                      <button
                        type='button'
                        onClick={togglePassword}
                        className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors'
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
                    <label className='flex items-center gap-2 text-gray-600 cursor-pointer'>
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded border-gray-300 text-[#602FF7] focus:ring-[#602FF7] cursor-pointer'
                      />
                      <span>Remember me</span>
                    </label>
                    <Link
                      to='/forgot-password'
                      className='text-[#602FF7] font-medium hover:text-[#4a1fd8] transition-colors'
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type='submit'
                    disabled={submitting}
                    className='w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#602FF7] to-[#8B5CF6] text-white font-semibold py-3.5 shadow-lg shadow-[#602FF7]/30 hover:shadow-xl hover:shadow-[#602FF7]/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed'
                  >
                    {submitting ? (
                      <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    ) : (
                      <>
                        Sign in
                        <FaArrowRight className='text-sm' />
                      </>
                    )}
                  </button>

                  {apiError && (
                    <p className='text-sm text-red-600 text-center bg-red-50 rounded-lg p-2'>
                      {apiError}
                    </p>
                  )}
                </form>

                <div className='mt-6 pt-6 border-t border-gray-100'>
                  <p className='text-center text-xs text-gray-400'>
                    Don't have an account?{' '}
                    <Link to='/contact' className='text-[#602FF7] font-medium hover:underline'>
                      Contact Sales
                    </Link>
                  </p>
                </div>
              </div>

              <p className='mt-6 text-center text-xs text-white/50'>
                Powered by ROYALITSERVICE Tour & Travels CRM
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Login