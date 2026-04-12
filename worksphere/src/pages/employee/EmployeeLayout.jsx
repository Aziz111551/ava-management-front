import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'WORK',
    items: [
      { path: '/employee/dashboard', icon: '⚡', label: 'Dashboard' },
      { path: '/employee/projets',   icon: '📁', label: 'My Projects' },
      { path: '/employee/taches',    icon: '✅', label: 'Trello Tasks' },
    ],
  },
  {
    label: 'HR',
    items: [
      { path: '/employee/conges',    icon: '🌴', label: 'Leave Request' },
      { path: '/employee/maladie',   icon: '🏥', label: 'Sick Leave' },
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
