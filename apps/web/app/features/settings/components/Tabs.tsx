import { Button } from '@ui/components/Button'

interface TabItem {
    name: string
    current: boolean
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface TabsProps {
    navigation: TabItem[]
    onTabChange: (tabName: string) => void
}

export function Tabs({ navigation, onTabChange }: TabsProps) {
    return (
        <nav aria-label="Sidebar" className="flex flex-1 flex-col">
            <ul role="list" className="-mx-2 space-y-2">
                {navigation.map((item) => (
                    <li key={item.name}>
                        <Button
                            onClick={() => onTabChange(item.name)}
                            variant={item.current ? "glass" : "secondary"}
                            className='w-full text-left justify-start'
                            leftIcon={
                                <item.icon
                                    aria-hidden="true"
                                    className={"size-6 shrink-0"}
                                />
                            }
                        >

                            {item.name}
                        </Button>
                    </li>
                ))}
            </ul>
        </nav>
    )
}