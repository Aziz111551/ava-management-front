import { useMemo } from 'react'

/** Données de démonstration — brancher une API de facturation quand elle sera disponible. */
const MOCK_PLANS = [
  {
    id: 'org-1',
    organization: 'AVA Management — Production',
    plan: 'Enterprise',
    mrr: '2 400 €',
    status: 'active',
    renews: '2026-05-12',
    seats: 120,
    channel: 'Web + mobile (PWA)',
  },
  {
    id: 'org-2',
    organization: 'Pilote RH — Région Nord',
    plan: 'Business',
    mrr: '890 €',
    status: 'trial',
    renews: '2026-04-28',
    seats: 45,
    channel: 'Web',
  },
  {
    id: 'org-3',
    organization: 'Sandbox intégration',
    plan: 'Developer',
    mrr: '0 €',
    status: 'sandbox',
    renews: '—',
    seats: 5,
    channel: 'API / tests',
  },
]

const statusStyle = {
  active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', label: 'Actif' },
  trial: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Essai' },
  sandbox: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'Sandbox' },
}

export default function AdminPayments() {
  const totalMrr = useMemo(() => {
    const n = MOCK_PLANS.reduce((acc, r) => {
      const raw = String(r.mrr).replace(/\s/g, '').replace('€', '').replace(',', '.')
      const v = parseFloat(raw)
      return acc + (Number.isFinite(v) ? v : 0)
    }, 0)
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  }, [])

  return (
    <div style={{ padding: '28px', maxWidth: '1280px' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '28px',
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: '800',
            color: 'var(--text)',
          }}>
            Paiements & abonnement
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text2)', lineHeight: 1.55, maxWidth: '640px' }}>
            Vue « finance produit » : plans, sièges et renouvellement. Les montants affichés sont des exemples pour la maquette ;
            connectez votre backend de facturation (Stripe, Chargebee, etc.) pour des données réelles.
          </p>
        </div>
        <div style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(15,23,42,0.92) 100%)',
          border: '1px solid rgba(129,140,248,0.35)',
          minWidth: '220px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            MRR combiné (démo)
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '6px' }}>
            {totalMrr}
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
            Abonnements
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Données illustratives</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{
                textAlign: 'left',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--text3)',
              }}>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Organisation</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Plan</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>MRR</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Sièges</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Canal</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Renouvellement</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PLANS.map((row) => {
                const st = statusStyle[row.status] || statusStyle.sandbox
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text)' }}>{row.organization}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text2)' }}>{row.plan}</td>
                    <td style={{ padding: '16px 20px', color: '#c4b5fd', fontWeight: '700' }}>{row.mrr}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text2)' }}>{row.seats}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text3)', fontSize: '12px' }}>{row.channel}</td>
                    <td style={{ padding: '16px 20px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{row.renews}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: st.bg,
                        color: st.color,
                      }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
