import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'MAIN',
    items: [
      { path: '/rh/calendrier',   icon: '📅', label: 'Calendar' },
      { path: '/rh/reclamations', icon: '📋', label: 'Complaints' },
      { path: '/rh/conges',       icon: '🌴', label: 'Leave Management' },
    ],
  },
  {
    label: 'RECRUITMENT',
    items: [
      { path: '/rh/candidats',    icon: '👥', label: 'Phase 1 Candidates' },
    ],
  },
  {
    label: 'WORKFORCE',
    items: [
      { path: '/rh/maladies',     icon: '🏥', label: 'Sick Leave' },
      { path: '/rh/employes',     icon: '🧑‍💼', label: 'Employees' },
    ],
  },
]

const titles = {
  '/rh/calendrier':   'Calendar',
  '/rh/reclamations': 'Complaints & Issues',
  '/rh/conges':       'Leave Management',
  '/rh/candidats':    'Accepted Candidates — Phase 1',
  '/rh/maladies':     'Sick Leave',
  '/rh/employes':     'Employee List',
}

export default function RHLayout() {
  const location = useLocation()
  return (
    <Layout navItems={navItems} pageTitle={titles[location.pathname] || 'RH'}>
      <Outlet />
    </Layout>
  )
}
