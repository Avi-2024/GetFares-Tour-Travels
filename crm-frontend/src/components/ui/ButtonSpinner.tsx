import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function ButtonSpinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  )
}

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingLabel?: string
  children: ReactNode
}

export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type='button'
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <>
          <ButtonSpinner />
          <span>{loadingLabel ?? 'Please wait...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

type IconLoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  children: ReactNode
}

export function IconLoadingButton({
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: IconLoadingButtonProps) {
  return (
    <button
      type='button'
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? <ButtonSpinner className='h-3.5 w-3.5' /> : children}
    </button>
  )
}
