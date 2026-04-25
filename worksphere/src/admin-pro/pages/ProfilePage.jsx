import { useAuth } from '../../context/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  // Handlers à compléter selon logique réelle
  const handleEdit = () => {
    // TODO: ouvrir modal ou naviguer vers page édition
    alert('Edit profile (à implémenter)')
  }
  const handleDelete = () => {
    // TODO: confirmation + suppression
    alert('Delete profile (à implémenter)')
  }
  const handleBlock = () => {
    // TODO: confirmation + blocage
    alert('Block profile (à implémenter)')
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Informations de votre compte administrateur.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Nom</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{user?.name || '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{user?.email || '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
          <p className="mt-1 font-semibold uppercase text-slate-900 dark:text-slate-100">{user?.role || '—'}</p>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleEdit}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          Delete
        </button>
        <button
          onClick={handleBlock}
          className="rounded-lg bg-slate-700 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Block
        </button>
      </div>
    </section>
  )
}
