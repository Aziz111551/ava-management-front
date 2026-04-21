import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'TABLEAU DE BORD',
    items: [
      { path: '/admin', icon: 'fa-solid fa-chart-pie', label: 'Vue d’ensemble' },
      { path: '/admin/meet', icon: 'fa-solid fa-video', label: 'Meet & activité' },
      { path: '/admin/messages', icon: 'fa-solid fa-paper-plane', label: 'Messages RH / employés' },
      { path: '/admin/payments', icon: 'fa-solid fa-credit-card', label: 'Paiements & abonnement' },
    ],
  },
]

const titles = {
  '/admin': 'Administration — Vue d’ensemble',
  '/admin/meet': 'Meet — Synthèse des réunions',
  '/admin/messages': 'Messagerie administrateur',
  '/admin/payments': 'Paiements & abonnement',
}

export default function AdminLayout() {
  const location = useLocation()
  const pageTitle = titles[location.pathname] || 'Administration'
  return (
    <Layout navItems={navItems} pageTitle={pageTitle} adminMode>
      <Outlet />
    </Layout>
  )
}
