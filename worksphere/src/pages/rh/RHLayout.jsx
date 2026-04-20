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
      { path: '/rh/candidats', icon: 'fa-solid fa-laptop-code', label: 'Phase 1 — Test technique' },
      { path: '/rh/candidats-phase2', icon: 'fa-solid fa-person-running', label: 'Phase 2 — Test physique' },
      { path: '/rh/phase3', icon: 'fa-solid fa-user-check', label: 'Phase 3 — Décision finale' },
      { path: '/rh/meetings', icon: 'fa-solid fa-video', label: 'Réunions intégrées' },
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
  '/rh/candidats':         'Phase 1 — Test technique',
  '/rh/candidats-phase2':  'Phase 2 — Test physique',
  '/rh/phase3':            'Phase 3 — Décision finale',
  '/rh/meetings':          'Réunions intégrées',
  '/rh/maladies':     'Sick Leave',
  '/rh/employes':     'Employee List',
}

export default function RHLayout() {
  const location = useLocation()
  const pageTitle = location.pathname.startsWith('/rh/meetings')
    ? 'Réunions intégrées'
    : location.pathname.startsWith('/rh/phase3')
      ? 'Phase 3 — Décision finale'
    : (titles[location.pathname] || 'RH')
  return (
    <Layout navItems={navItems} pageTitle={pageTitle}>
      <Outlet />
    </Layout>
  )
}
