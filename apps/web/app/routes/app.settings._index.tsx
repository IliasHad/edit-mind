import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction } from 'react-router'
import { useSearchParams } from 'react-router'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import FolderSettings from '~/features/settings/components/FolderSettings'
import { AdvancedSettings } from '~/features/settings/components/AdvancedSettings'
import { AccessTokensSettings } from '~/features/settings/components/AccessTokensSettings'

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

const TABS = [
  { id: 'folders',      label: 'Folders' },
  { id: 'accessTokens', label: 'API tokens' },
  { id: 'advanced',     label: 'Advanced' },
]

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedIndex = Math.max(0, TABS.findIndex((t) => t.id === searchParams.get('tab')))

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-white/50 mt-1">Manage your preferences and configuration.</p>
        </div>

        <TabGroup
          selectedIndex={selectedIndex}
          onChange={(index) => setSearchParams({ tab: TABS[index].id }, { replace: true })}
        >
          <TabList className="flex border-b border-white/10 mb-8">
            {TABS.map((tab) => (
              <Tab
                key={tab.id}
                className="px-4 py-2.5 text-sm font-medium transition-colors outline-none border-b-2 -mb-px
                  text-white/50 border-transparent hover:text-white/80
                  data-selected:text-white data-selected:border-white"
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            <TabPanel className="outline-none"><FolderSettings /></TabPanel>
            <TabPanel className="outline-none"><AccessTokensSettings /></TabPanel>
            <TabPanel className="outline-none"><AdvancedSettings /></TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </DashboardLayout>
  )
}
