import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'MAIN',
    items: [
      { path: '/rh/calendrier',   icon: 'fa-solid fa-calendar-days', label: 'Calendar' },
      { path: '/rh/reclamations', icon: 'fa-solid fa-clipboard-list', label: 'Complaints' },
      { path: '/rh/conges',       icon: 'fa-solid fa-plane-departure', label: 'Leave Management' },
    ],
  },
  {
    label: 'RECRUITMENT',
    items: [
      { path: '/rh/candidats',    icon: 'fa-solid fa-user-group', label: 'Phase 1 Candidates' },
    ],
  },
  {
    label: 'WORKFORCE',
    items: [
      { path: '/rh/maladies',     icon: 'fa-solid fa-notes-medical', label: 'Sick Leave' },
      { path: '/rh/employes',     icon: 'fa-solid fa-users', label: 'Employees' },
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
