import { Button } from '@ui/components/Button'
import { FormProvider, useForm } from 'react-hook-form';
import { FormInput } from '~/features/auth/components/FormInput';

interface UpdateLocationProps {
    id: string
    defaultLocation: string
    loading: boolean
    updateVideoLocation: (id: string, location: string) => Promise<void>
    refresh: (id: string) => Promise<void>
}
type FormValues = {
    location: string
}

export function UpdateLocation({ updateVideoLocation, id, defaultLocation, loading, refresh }: UpdateLocationProps) {
    const form = useForm<FormValues>({
        defaultValues: {
            location: defaultLocation
        }
    })

    const onSubmit = async () => {
        const { location } = form.getValues()
        if (!location) return

        try {
            await updateVideoLocation(id, location)
            await refresh(id)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
            <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div>
                        <h3 className="text-sm font-medium text-black dark:text-white">Update Location</h3>
                    </div>
                </div>

                <FormProvider {...form}>
                    <form method="POST" className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="relative">
                            <FormInput
                                name="location"
                                type="text"
                                placeholder="e.g. New York, Central Park"
                                disabled={loading}
                            />

                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <Button
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        Updating...
                                    </>
                                ) : 'Update location'}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </div>
        </div>
    )
}