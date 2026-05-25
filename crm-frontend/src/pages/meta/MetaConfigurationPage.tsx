import React, { useState } from 'react'
import { FaFacebook, FaListCheck } from 'react-icons/fa6'
import MetaConnectionPanel from '../../components/settings/MetaConnectionPanel'
import MetaLeadMappingPanel from '../../components/settings/MetaLeadMappingPanel'

type Tab = 'connection' | 'rules'

const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType }> = [
  { id: 'connection', label: 'Connection & tokens', icon: FaFacebook },
  { id: 'rules', label: 'Lead rules', icon: FaListCheck }
]

const MetaConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('connection')

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Meta configuration</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect Facebook Lead Ads to the CRM: tokens, webhook, then field mapping rules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive ?
                  'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'connection' ? <MetaConnectionPanel /> : null}
      {activeTab === 'rules' ? <MetaLeadMappingPanel /> : null}
    </div>
  )
}

export default MetaConfigurationPage
