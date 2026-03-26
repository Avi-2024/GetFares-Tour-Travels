import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBars,
  FaBell,
  FaChevronDown,
  FaMagnifyingGlass,
  FaMoon,
  FaSun
} from 'react-icons/fa6'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationsContext'
import { authApi } from '../../api/auth'

const getDisplayName = (name?: string, email?: string) => {
  const value = name?.trim() || email?.split('@')[0] || 'User'
  return value
}

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const formatRoleLabel = (role?: string) => {
  if (!role) return 'Signed in'
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

type BreakState = { isBreak: boolean; startedAt: number | null }

const BREAK_STORAGE_KEY = 'header_break_state'

const getStoredBreakState = (): BreakState => {
  if (typeof window === 'undefined') return { isBreak: false, startedAt: null }
  try {
    const raw = localStorage.getItem(BREAK_STORAGE_KEY)
    if (!raw) return { isBreak: false, startedAt: null }
    const parsed = JSON.parse(raw) as {
      isBreak?: boolean
      startedAt?: number | null
    }
    if (parsed?.isBreak && typeof parsed.startedAt === 'number') {
      return { isBreak: true, startedAt: parsed.startedAt }
    }
    return { isBreak: false, startedAt: null }
  } catch (error) {
    console.warn('Failed to parse break state', error)
    return { isBreak: false, startedAt: null }
  }
}

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => value.toString().padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

const Header: React.FC<{
  onMenuClick: () => void
}> = ({ onMenuClick }) => {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [breakState, setBreakState] = useState<BreakState>(() =>
    getStoredBreakState()
  )
  const [breakElapsed, setBreakElapsed] = useState(() => {
    if (breakState.isBreak && breakState.startedAt) {
      return Date.now() - breakState.startedAt
    }
    return 0
  })
  const [isActive, setIsActive] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('user_active_status')
    return stored !== null ? stored === 'true' : true
  })
  const [togglingActive, setTogglingActive] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { hasPermission, logout, user } = useAuth()
  const { unreadCount } = useNotifications()
  const displayName = getDisplayName(user?.name, user?.email)
  const roleLabel = formatRoleLabel(user?.role)
  const initials = getInitials(displayName)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(
      BREAK_STORAGE_KEY,
      JSON.stringify({
        isBreak: breakState.isBreak,
        startedAt: breakState.startedAt
      })
    )
  }, [breakState])

  useEffect(() => {
    const { isBreak, startedAt } = breakState
    if (!isBreak || !startedAt) return undefined

    const interval = setInterval(() => {
      setBreakElapsed(Date.now() - startedAt)
    }, 1000)

    return () => clearInterval(interval)
  }, [breakState])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  const handleToggleBreak = () => {
    if (breakState.isBreak) {
      setBreakState({ isBreak: false, startedAt: null })
      setBreakElapsed(0)
      return
    }
    const startedAt = Date.now()
    setBreakState({ isBreak: true, startedAt })
    setBreakElapsed(0)
  }

  const handleToggleActive = async () => {
    if (togglingActive || breakState.isBreak) return
    const next = !isActive
    setIsActive(next)
    localStorage.setItem('user_active_status', String(next))
    setTogglingActive(true)
    try {
      await authApi.toggleActive(next)
    } catch {
      setIsActive(!next)
      localStorage.setItem('user_active_status', String(!next))
    } finally {
      setTogglingActive(false)
    }
  }

  const breakTimerLabel = useMemo(() => {
    if (!breakState.isBreak) return 'Start Break'
    return `On Break • ${formatDuration(breakElapsed)}`
  }, [breakState.isBreak, breakElapsed])

  return (
    <header className='sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur lg:px-8 dark:border-gray-700 dark:bg-gray-900/90'>
      <div className='flex items-center gap-4'>
        <button
          onClick={onMenuClick}
          className='rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-800'
        >
          <FaBars />
        </button>
        <div className='relative hidden w-72 md:block'>
          <input
            className='field-input pl-9'
            placeholder='Search leads, bookings, customers...'
          />
          <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
        </div>
      </div>

      <div className='flex items-center gap-2 sm:gap-3'>
        <button
          type='button'
          onClick={handleToggleBreak}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:gap-2 sm:px-3 sm:text-sm ${
            breakState.isBreak
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              breakState.isBreak ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className='hidden sm:inline'>{breakTimerLabel}</span>
          <span className='sm:hidden'>
            {breakState.isBreak ? 'Break' : 'Start'}
          </span>
        </button>
        <button
          type='button'
          onClick={() => void handleToggleActive()}
          disabled={breakState.isBreak || togglingActive}
          title={
            breakState.isBreak
              ? 'End break to change active status'
              : isActive
              ? 'Click to go inactive'
              : 'Click to go active'
          }
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-2 text-xs font-semibold transition sm:gap-2 sm:px-3 sm:text-sm ${
            breakState.isBreak || !isActive
              ? 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
              : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              breakState.isBreak || !isActive
                ? 'bg-gray-400'
                : togglingActive
                ? 'bg-green-400 animate-pulse'
                : 'bg-green-500'
            }`}
          />
          <span className='hidden sm:inline'>
            {breakState.isBreak ? 'On break' : isActive ? 'Active' : 'Inactive'}
          </span>
          <span className='sm:hidden'>
            {breakState.isBreak ? 'Away' : isActive ? 'On' : 'Off'}
          </span>
        </button>
        <button
          onClick={toggle}
          className='rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        >
          {dark ? <FaSun /> : <FaMoon />}
        </button>
        {hasPermission('notifications:read') ? (
          <div className='relative'>
            <button
              onClick={() => navigate('/notifications')}
              className='relative rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaBell />
              {unreadCount > 0 ? (
                <span className='absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white'>
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
        <div ref={ref} className='relative'>
          <button
            onClick={() => setMenuOpen(p => !p)}
            className='flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
          >
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white'>
              {initials}
            </div>
            <div className='hidden text-left sm:block'>
              <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                {displayName}
              </p>
              <p className='text-xs text-gray-500'>{roleLabel}</p>
            </div>
            <FaChevronDown className='text-xs text-gray-500' />
          </button>
          {menuOpen ? (
            <div className='absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900'>
              {[
                { label: 'Profile', action: () => navigate('/profile') },
                {
                  label: 'Notifications',
                  action: () => navigate('/notifications')
                },
                { label: 'Settings', action: () => navigate('/settings') },
                {
                  label: 'Logout',
                  action: () => {
                    logout()
                    navigate('/login')
                  },
                  variant: 'danger' as const
                }
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMenuOpen(false)
                    item.action()
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    item.variant === 'danger'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-800/40'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Header
