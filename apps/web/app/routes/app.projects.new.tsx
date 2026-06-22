import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { ProjectDetails } from '~/features/projects/components/ProjectDetails'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { translate } from '~/i18n/translate'

export const meta: MetaFunction = () => {
  return [{ title: translate('projects.meta.newTitle') }]
}

export default function NewProjectPage() {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <ProjectDetails />
    </DashboardLayout>
  )
}
