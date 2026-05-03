import { Outlet, useLocation } from 'react-router-dom'
import Layout from '../../components/shared/Layout'

const navItems = [
  {
    label: 'TABLEAU DE BORD',
    items: [
      { path: '/admin', icon: 'fa-solid fa-chart-pie', label: 'Vue d’ensemble' },
      { path: '/admin/meet', icon: 'fa-solid fa-video', label: 'Meet & activité' },
      { path: '/admin-pro', icon: 'fa-solid fa-table-columns', label: 'Admin Dashboard Pro' },
    ],
  },
]

const titles = {
  '/admin': 'Administration — Vue d’ensemble',
  '/admin/meet': 'Meet — Synthèse des réunions',
  '/admin-pro': 'Admin Dashboard Pro',
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
