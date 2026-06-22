import { ArrowTopRightOnSquareIcon, CircleStackIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'
import { FeatureCard } from './FeatureCard'

export const AdvancedSettings = () => {
  const { t } = useTranslation()

  return (
    <section>
      <FeatureCard
        icon={<ArrowTopRightOnSquareIcon className="size-5 text-white/70" />}
        title={t('settings.advanced.immichImport.title')}
        description={t('settings.advanced.immichImport.description')}
        primaryCta={{
          text: t('settings.advanced.immichImport.cta'),
          icon: <CircleStackIcon className="size-4" />,
          link: '/app/immich-import',
        }}
      />
    </section>
  )
}
