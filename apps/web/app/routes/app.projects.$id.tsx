import type { MetaFunction } from 'react-router'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { ProjectDetails } from '~/features/projects/components/ProjectDetails'
import { Sidebar } from '~/features/shared/components/Sidebar'

export const meta: MetaFunction = () => {
  return [{ title: 'Edit Project | Edit Mind' }]
}

export default function EditProjectPage() {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <ProjectDetails isEditing />
    </DashboardLayout>
  )
}
