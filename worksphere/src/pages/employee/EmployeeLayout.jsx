import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'WORK',
    items: [
      { path: '/employee/dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard' },
      { path: '/employee/projets',   icon: 'fa-solid fa-folder-open', label: 'My Projects' },
      { path: '/employee/taches',    icon: 'fa-solid fa-list-check', label: 'Trello Tasks' },
    ],
  },
  {
    label: 'HR',
    items: [
      { path: '/employee/conges',    icon: 'fa-solid fa-umbrella-beach', label: 'Leave Request' },
      { path: '/employee/maladie',   icon: 'fa-solid fa-briefcase-medical', label: 'Sick Leave' },
    ],
  },
]

const titles = {
  '/employee/dashboard': 'Dashboard',
  '/employee/projets':   'My projects',
  '/employee/taches':    'Trello Tasks',
  '/employee/conges':    'Leave Request',
  '/employee/maladie':   'Sick Leave',
}

export default function EmployeeLayout() {
  const location = useLocation()
  return (
    <Layout navItems={navItems} pageTitle={titles[location.pathname] || 'Employee workspace'}>
      <Outlet />
    </Layout>
  )
}
