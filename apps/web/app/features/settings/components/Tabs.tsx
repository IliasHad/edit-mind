import { useTranslation } from 'react-i18next'
import { Button } from '@ui/components/Button'

interface TabItem {
    id: string
    label: string
    current: boolean
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface TabsProps {
    navigation: TabItem[]
    onTabChange: (tabId: string) => void
}

export function Tabs({ navigation, onTabChange }: TabsProps) {
    const { t } = useTranslation()

    return (
        <nav aria-label={t('common.sidebar')} className="flex flex-1 flex-col">
            <ul role="list" className="-mx-2 space-y-2">
                {navigation.map((item) => (
                    <li key={item.id}>
                        <Button
                            onClick={() => onTabChange(item.id)}
                            variant={item.current ? "glass" : "secondary"}
                            className='w-full text-left justify-start'
                            leftIcon={
                                <item.icon
                                    aria-hidden="true"
                                    className={"size-6 shrink-0"}
                                />
                            }
                        >

                            {item.label}
                        </Button>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
