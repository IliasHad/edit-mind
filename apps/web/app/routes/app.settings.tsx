import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction } from 'react-router'
import { Tabs } from '~/features/settings/components/Tabs'
import FolderSettings from '~/features/settings/components/FolderSettings'
import { FolderArrowDownIcon, Cog6ToothIcon, UserCircleIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { AdvancedSettings } from '~/features/settings/components/AdvancedSettings'

export const meta: MetaFunction = () => [{ title: 'Settings | Edit Mind' }]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Folders')

  const navigation = [
    { name: 'Folders', icon: FolderArrowDownIcon, current: activeTab === 'Folders' },
    { name: 'Advanced', icon: Cog6ToothIcon, current: activeTab === 'Advanced' }
  ]

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Folders':
        return <FolderSettings />
      case 'Advanced':
        return <AdvancedSettings />
      default:
        return null
    }
  }

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold text-black dark:text-white">Settings</h1>
          <p className="text-base text-black/50 dark:text-white/50 mt-1">
            Manage your application preferences and configuration.
          </p>
        </header>

        <div className="grid grid-cols-4 gap-4">
          <Tabs navigation={navigation} onTabChange={handleTabChange} />
          <section className="col-span-3">
            {renderTabContent()}
          </section>
        </div>
      </main>
    </DashboardLayout>
  )
}