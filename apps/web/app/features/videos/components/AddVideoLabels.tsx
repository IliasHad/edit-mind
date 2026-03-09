import { TrashIcon } from '@heroicons/react/24/solid'
import { Button } from '@ui/components/Button'
import { FormProvider, useForm, useFieldArray } from 'react-hook-form'
import { FormInput } from '~/features/auth/components/FormInput'

interface AddVideoLabelsProps {
    id: string
    loading: boolean
    addVideoLabels: (id: string, labels: Label[]) => Promise<void>
    refresh: (id: string) => Promise<void>
    defaultLabels?: string
}

type Label = {
    name: string
    value: string
}

type FormValues = {
    labels: Label[]
}

export function AddVideoLabels({ addVideoLabels, id, loading, refresh, defaultLabels }: AddVideoLabelsProps) {
    const labels = defaultLabels ? JSON.parse(defaultLabels) : undefined

    const form = useForm<FormValues>({
        defaultValues: {
            labels: Array.isArray(labels)
                ? labels
                : [{ name: '', value: '' }],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'labels',
    })

    const onSubmit = async () => {
        const { labels } = form.getValues()
        try {
            await addVideoLabels(id, labels)
            await refresh(id)
            form.reset({ labels: [{ name: '', value: '' }] })
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black overflow-hidden">
            <div className="p-8">

                <div className="flex items-center gap-3 mb-6">
                    <div>
                        <h3 className="text-sm font-medium text-black dark:text-white">Add Labels</h3>
                    </div>
                </div>

                <FormProvider {...form}>
                    <form method="POST" className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>

                        <div className="grid grid-cols-[1fr_1fr_2rem] gap-2">
                            <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wide px-1">
                                Name
                            </span>
                            <span className="text-xs text-black/40 dark:text-white/40 uppercase tracking-wide px-1">
                                Value
                            </span>
                            <span />
                        </div>

                        <div className="space-y-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr_1fr_2rem] gap-2 items-center">
                                    <FormInput
                                        name={`labels.${index}.name`}
                                        type="text"
                                        placeholder="e.g. Event"
                                        disabled={loading}
                                    />
                                    <FormInput
                                        name={`labels.${index}.value`}
                                        type="text"
                                        placeholder="e.g. Birthday Party"
                                        disabled={loading}
                                    />

                                    <Button
                                        variant="secondary"
                                        type="button"
                                        onClick={() => remove(index)}
                                        disabled={loading}
                                        className="flex items-center justify-center w-10 h-10 rounded-lg text-black/25 dark:text-white/25 hover:text-black/60 dark:hover:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label="Remove row"
                                    >
                                        <TrashIcon className='w-full h-full text-white' />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => append({ name: '', value: '' })}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Add another label
                        </Button>

                        <div className="border-t border-black/5 dark:border-white/5" />

                        <div className="flex items-center justify-between gap-3">

                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    'Saving…'
                                ) : (
                                    'Save labels'
                                )}
                            </Button>
                        </div>

                    </form>
                </FormProvider>
            </div>
        </div>
    )
}