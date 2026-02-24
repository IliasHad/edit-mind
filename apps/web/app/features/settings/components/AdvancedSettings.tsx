import { ArrowTopRightOnSquareIcon, CircleStackIcon } from '@heroicons/react/24/solid'
import { FeatureCard } from './FeatureCard'

export const AdvancedSettings = () => {
    return (
        <section>
            <FeatureCard
                icon={<ArrowTopRightOnSquareIcon className="size-5 text-white/70" />}
                title="Immich Import"
                description="Import videos directly from your Immich library."
                primaryCta={{
                    text: 'Go to Immich Import',
                    icon: <CircleStackIcon className="size-4" />,
                    link: '/app/immich-import',
                }}
            />
        </section>
    )
}
