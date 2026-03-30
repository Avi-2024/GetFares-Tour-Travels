import React from 'react'
import { useParams } from 'react-router-dom'
import QuotationBuilderPage from './QuotationBuilderPage'

const EditQuotationPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  return <QuotationBuilderPage mode='edit' quotationId={id} />
}

export default EditQuotationPage
