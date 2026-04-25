import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'WORK',
    items: [
      { path: '/employee/dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
      { path: '/employee/projets',   icon: 'fa-solid fa-folder-open', label: 'My Projects' },
      { path: '/employee/taches',    icon: 'fa-solid fa-list-check', label: 'My Workspace' },
    ],
  },
  {
    label: 'HR',
    items: [
      { path: '/employee/conges',    icon: 'fa-solid fa-umbrella-beach', label: 'Leave Request' },
      { path: '/employee/maladie',   icon: 'fa-solid fa-briefcase-medical', label: 'Sick Leave' },
      { path: '/employee/meetings',  icon: 'fa-solid fa-video', label: 'RH Meetings' },
    ],
  },
]

const titles = {
  '/employee/dashboard': 'Dashboard',
  '/employee/projets':   'My projects',
  '/employee/taches':    'My Workspace',
  '/employee/conges':    'Leave Request',
  '/employee/maladie':   'Sick Leave',
  '/employee/meetings':  'RH Meetings',
}

export default function EmployeeLayout() {
  const location = useLocation()
  const pageTitle = location.pathname.startsWith('/employee/meetings')
    ? 'RH Meetings'
    : (titles[location.pathname] || 'Employee workspace')
  return (
    <Layout navItems={navItems} pageTitle={pageTitle}>
      <Outlet />
    </Layout>
  )
}
