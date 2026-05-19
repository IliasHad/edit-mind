import { DashboardLayout } from '~/layouts/DashboardLayout'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { type MetaFunction, useSearchParams } from 'react-router'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import FolderSettings from '~/features/settings/components/FolderSettings'
import { AdvancedSettings } from '~/features/settings/components/AdvancedSettings'
import { AccessTokensSettings } from '~/features/settings/components/AccessTokensSettings'
import { PreferencesSettings } from '~/features/settings/components/PreferencesSettings'
import { translate } from '~/i18n/translate'

export const meta: MetaFunction = () => [{ title: translate('settings.meta.title') }]

const TAB_IDS = ['folders', 'preferences', 'accessTokens', 'advanced'] as const

type SettingsTabId = (typeof TAB_IDS)[number]

export default function SettingsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabs = [
    { id: 'folders', label: t('settings.tabs.folders') },
    { id: 'preferences', label: t('settings.tabs.preferences') },
    { id: 'accessTokens', label: t('settings.tabs.accessTokens', 'API tokens') },
    { id: 'advanced', label: t('settings.tabs.advanced') },
  ] satisfies Array<{ id: SettingsTabId; label: string }>

  const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === searchParams.get('tab')))

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">{t('settings.title')}</h1>
          <p className="text-sm text-white/50 mt-1">{t('settings.description')}</p>
        </div>

        <TabGroup
          selectedIndex={selectedIndex}
          onChange={(index) => setSearchParams({ tab: tabs[index].id }, { replace: true })}
        >
          <TabList className="flex border-b border-white/10 mb-8">
            {tabs.map((tab) => (
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
            <TabPanel className="outline-none"><PreferencesSettings /></TabPanel>
            <TabPanel className="outline-none"><AccessTokensSettings /></TabPanel>
            <TabPanel className="outline-none"><AdvancedSettings /></TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </DashboardLayout>
  )
}
