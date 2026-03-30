import React, { useState, useEffect } from 'react'
import { FaXmark, FaFloppyDisk } from 'react-icons/fa6'

export interface EditQuotationPayload {
  marginPercent?: number
  discount?: number
  taxPercent?: number
  supplierCost?: number
  serviceFeeAmount?: number
  importantNotes?: string
  builderSnapshot?: any
}

interface EditQuotationModalProps {
  quotation: {
    id: string
    quoteNumber: string
    customer: string
    email?: string
    destination: string
    total: number
    margin: number
    status: string
    importantNotes?: string | null
  }
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, updates: EditQuotationPayload) => Promise<void>
}

const EditQuotationModal: React.FC<EditQuotationModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<EditQuotationPayload>({
    marginPercent: quotation.margin || 0,
    discount: 0,
    taxPercent: 0,
    supplierCost: 0,
    serviceFeeAmount: 0,
    importantNotes: quotation.importantNotes || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFormData({
        marginPercent: quotation.margin || 0,
        discount: 0,
        taxPercent: 0,
        supplierCost: 0,
        serviceFeeAmount: 0,
        importantNotes: quotation.importantNotes || ''
      })
      setError('')
    }
  }, [isOpen, quotation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (
      formData.marginPercent !== undefined &&
      (formData.marginPercent < 0 || formData.marginPercent > 100)
    ) {
      setError('Margin must be between 0 and 100')
      return
    }

    if (formData.discount !== undefined && formData.discount < 0) {
      setError('Discount cannot be negative')
      return
    }

    if (
      formData.taxPercent !== undefined &&
      (formData.taxPercent < 0 || formData.taxPercent > 100)
    ) {
      setError('Tax percent must be between 0 and 100')
      return
    }

    if (formData.supplierCost !== undefined && formData.supplierCost < 0) {
      setError('Supplier cost cannot be negative')
      return
    }

    if (formData.serviceFeeAmount !== undefined && formData.serviceFeeAmount < 0) {
      setError('Service fee cannot be negative')
      return
    }

    setLoading(true)
    try {
      await onSave(quotation.id, formData)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to update quotation')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4'>
      <div className='w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4'>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Edit Quotation
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {quotation.quoteNumber} - {quotation.customer}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className='p-2 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50'
          >
            <FaXmark />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='px-5 py-4 space-y-4'>
          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {error}
            </div>
          )}

          {/* Read-only Info */}
          <div className='rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2'>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Customer:
                </span>
                <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                  {quotation.customer}
                </span>
              </div>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Email:
                </span>
                <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                  {quotation.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Destination:
                </span>
                <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                  {quotation.destination}
                </span>
              </div>
              <div>
                <span className='text-gray-500 dark:text-gray-400'>
                  Current Total:
                </span>
                <span className='ml-2 font-medium text-gray-900 dark:text-gray-100'>
                  ${quotation.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Cost & Profit Section */}
          <div className='rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 p-4'>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3'>
              Cost & Profit
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Supplier Cost ($)
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.supplierCost}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      supplierCost: parseFloat(e.target.value) || 0
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  disabled={loading}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Markup / Margin (%)
                </label>
                <input
                  type='number'
                  min='0'
                  max='100'
                  step='0.01'
                  value={formData.marginPercent}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      marginPercent: parseFloat(e.target.value) || 0
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  disabled={loading}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Service Fee ($)
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.serviceFeeAmount}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      serviceFeeAmount: parseFloat(e.target.value) || 0
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  disabled={loading}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Tax (%)
                </label>
                <input
                  type='number'
                  min='0'
                  max='100'
                  step='0.01'
                  value={formData.taxPercent}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      taxPercent: parseFloat(e.target.value) || 0
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  disabled={loading}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Discount ($)
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.discount}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      discount: parseFloat(e.target.value) || 0
                    }))
                  }
                  className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Important Notes
            </label>
            <textarea
              value={formData.importantNotes}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  importantNotes: e.target.value
                }))
              }
              rows={4}
              maxLength={4000}
              className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              placeholder='Add any important notes or special instructions...'
              disabled={loading}
            />
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              {formData.importantNotes?.length || 0} / 4000 characters
            </p>
          </div>

          {/* Info Box */}
          <div className='rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 px-4 py-3'>
            <p className='text-xs text-blue-700 dark:text-blue-300'>
              <strong>Note:</strong> Only DRAFT quotations can be edited. Changes
              to pricing will recalculate the final amount automatically. All fields
              match the Quotation Builder for consistency.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className='sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={loading}
            className='px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50'
          >
            {loading ? (
              <>
                <span className='animate-spin'>⌛</span>
                Saving...
              </>
            ) : (
              <>
                <FaFloppyDisk className='text-xs' />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditQuotationModal
