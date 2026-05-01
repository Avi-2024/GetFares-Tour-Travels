import { useMemo } from 'react'
import { FaXmark } from 'react-icons/fa6'
import { CurrencyInput } from '../../components/form'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { useAuth } from '../../context/AuthContext'

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, power)
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[power]}`
}

type EditRefundModalProps = {
  isOpen: boolean
  refundId?: string | null
  form: any
  setForm: any
  formError: string
  loading: boolean
  financeUserOptions: any[]
  currencyOptions: any[]
  proofFile: File | null
  proofUploadError: string
  proofInputRef: React.RefObject<HTMLInputElement>
  handleProofFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  clearProofSelection: () => void
  onSave: () => void
  onCancel: () => void
}

const EditRefundModal = ({
  isOpen,
  refundId,
  form,
  setForm,
  formError,
  loading,
  financeUserOptions,
  currencyOptions,
  proofFile,
  proofUploadError,
  proofInputRef,
  handleProofFileChange,
  clearProofSelection,
  onSave,
  onCancel
}: EditRefundModalProps) => {
  const { user } = useAuth()
  const viewerRaisedByName = useMemo(
    () =>
      (user?.name?.trim() || user?.email?.split('@')[0] || '').trim(),
    [user?.name, user?.email]
  )

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full my-8'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between rounded-t-xl'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Edit Refund Request
            </h3>
            {refundId ? (
              <p className='mt-0.5 text-xs font-mono text-gray-500 dark:text-gray-400'>
                {refundId}
              </p>
            ) : null}
          </div>
          <button
            onClick={onCancel}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          {formError && (
            <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {formError}
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Assign Finance Person *
              </label>
              <SearchableDropdown
                value={form.assignedTo}
                onChange={value =>
                  setForm((current: any) => ({ ...current, assignedTo: value }))
                }
                options={financeUserOptions}
                searchPlaceholder='Search accounts user...'
              />
            </div>
            <CurrencyInput
              label='Refund Amount'
              value={form.refundAmount}
              onChange={value =>
                setForm((current: any) => ({ ...current, refundAmount: value }))
              }
              required
            />
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Currency
              </label>
              <SearchableDropdown
                value={form.currency}
                onChange={value =>
                  setForm((current: any) => ({ ...current, currency: value }))
                }
                options={currencyOptions}
                searchPlaceholder='Search currency...'
              />
            </div>
            <CurrencyInput
              label='Supplier Penalty'
              value={form.supplierPenalty}
              onChange={value =>
                setForm((current: any) => ({ ...current, supplierPenalty: value }))
              }
            />
            <CurrencyInput
              label='Service Charge'
              value={form.serviceCharge}
              onChange={value =>
                setForm((current: any) => ({ ...current, serviceCharge: value }))
              }
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Raised By *
            </label>
            <input
              type='text'
              readOnly
              value={viewerRaisedByName}
              title='Taken from logged-in account'
              className='w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200'
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Logged-in user (cannot be changed)
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={event =>
                setForm((current: any) => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder='Refund reason, proof notes, or approval context'
              className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-900'
            />
          </div>

          <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900'>
            <p className='text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2'>
              Refund Proof
            </p>
            {proofFile ? (
              <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800'>
                <div>
                  <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                    {proofFile.name}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {formatFileSize(proofFile.size)}
                  </p>
                </div>
                <button
                  type='button'
                  className='text-xs font-semibold text-red-600 hover:underline'
                  onClick={clearProofSelection}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className='text-sm text-gray-500'>
                Upload refund proof image or PDF, max 5 MB.
              </p>
            )}
            <div className='mt-3'>
              <label
                htmlFor='refund-proof-upload-modal'
                className='inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              >
                Upload Proof
              </label>
              <input
                id='refund-proof-upload-modal'
                ref={proofInputRef}
                type='file'
                accept='application/pdf,image/*'
                className='hidden'
                onChange={handleProofFileChange}
              />
            </div>
            {proofUploadError && (
              <p className='mt-2 text-xs text-red-500'>{proofUploadError}</p>
            )}
          </div>
        </div>

        <div className='flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50'
          >
            {loading ? 'Updating...' : 'Update Refund'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditRefundModal
