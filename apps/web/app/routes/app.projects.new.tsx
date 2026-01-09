import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { ProjectDetails } from '~/features/projects/components/ProjectDetails'
import { Sidebar } from '~/features/shared/components/Sidebar'

export const meta: MetaFunction = () => {
  return [{ title: 'New Project | Edit Mind' }]
}

export default function NewProjectPage() {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <ProjectDetails />
    </DashboardLayout>
  )
}
