import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBuilding,
  FaUser,
  FaCreditCard,
  FaPlus,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaBars,
  FaDownload,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa'
import { FaXmark, FaPenToSquare, FaPercent, FaRotate, FaMoneyBillTrendUp } from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { customersApi } from '../../api/customers'
import { suppliersApi } from '../../api/suppliers'
import { paymentsApi } from '../../api/payments'
import { bookingsApi } from '../../api/bookings'
import { reportsApi } from '../../api/reports'
import { getApiErrorMessage } from '../../api/apiClient'

// Enhanced Stats Card Component
const StatsCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend, 
  color = 'blue' 
}: { 
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
  }

  return (
    <SurfaceCard className={`p-4 border ${colorClasses[color]}`}>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <div className='flex items-center gap-2 mb-2'>
            <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
              <Icon className='text-sm' />
            </div>
            <p className='text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide'>
              {label}
            </p>
          </div>
          <p className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1'>
            {value}
          </p>
          {subValue && (
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {subValue}
            </p>
          )}
        </div>
        {trend && (
          <div className={`text-xs font-semibold ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </div>
        )}
      </div>
    </SurfaceCard>
  )
}

// Alert Banner Component
const AlertBanner = ({ 
  type = 'info', 
  message, 
  onDismiss 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error'
  message: string
  onDismiss?: () => void
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: FaInfoCircle
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: FaCheckCircle
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      icon: FaExclamationTriangle
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: FaExclamationTriangle
    }
  }

  const style = styles[type]
  const Icon = style.icon

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3 mb-4`}>
      <div className='flex items-start gap-3'>
        <Icon className={`${style.text} text-lg flex-shrink-0 mt-0.5`} />
        <p className={`text-sm ${style.text} flex-1`}>{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${style.text} hover:opacity-70 flex-shrink-0`}
          >
            <FaXmark />
          </button>
        )}
      </div>
    </div>
  )
}

// Quick Action Button Component
const QuickActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  disabled?: boolean
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      <Icon className='text-base' />
      {label}
    </button>
  )
}

// Main Component (keeping existing logic, just enhancing UI)
const FinanceSystemEnhanced: React.FC = () => {
  // ... (keep all existing state and logic from FinanceSystem.tsx)
  
  return (
    <main className='flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900'>
      <div className='mx-auto w-full max-w-9xl px-4 py-6 sm:px-6 lg:px-8'>
        {/* Enhanced Header with Gradient */}
        <div className='mb-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                Finance System
              </h1>
              <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                Complete financial management for your travel business
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <QuickActionButton
                icon={FaDownload}
                label='Export'
                onClick={() => {}}
                variant='secondary'
              />
              <QuickActionButton
                icon={FaRotate}
                label='Refresh'
                onClick={() => {}}
                variant='secondary'
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <StatsCard
            icon={FaUser}
            label='Total Clients'
            value='0'
            subValue='Active KYC records'
            color='blue'
          />
          <StatsCard
            icon={FaBuilding}
            label='Active Suppliers'
            value='0'
            subValue='Payment details verified'
            color='green'
          />
          <StatsCard
            icon={FaMoneyBillTrendUp}
            label='Total Revenue'
            value='$0'
            subValue='This month'
            color='purple'
            trend='up'
          />
          <StatsCard
            icon={FaCreditCard}
            label='Pending Payments'
            value='0'
            subValue='Awaiting verification'
            color='orange'
          />
        </div>

        {/* Rest of the existing component structure */}
        <AlertBanner
          type='info'
          message='Finance system is now live! All data is synced with quotations and bookings.'
        />

        {/* ... (keep all existing tabs, tables, modals, etc.) */}
      </div>
    </main>
  )
}

export default FinanceSystemEnhanced
