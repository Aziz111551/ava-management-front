import API from './api'

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.rows)) return payload.rows
  if (Array.isArray(payload.results)) return payload.results
  return []
}

function extractTotal(payload, fallbackLength) {
  const p = payload || {}
  const fromPagination = Number(p?.pagination?.total)
  if (Number.isFinite(fromPagination)) return fromPagination
  const fromTotal = Number(p?.total)
  if (Number.isFinite(fromTotal)) return fromTotal
  const fromCount = Number(p?.count)
  if (Number.isFinite(fromCount)) return fromCount
  return fallbackLength
}

async function requestWithFallback(candidates) {
  let lastErr = null
  for (const c of candidates) {
    try {
      const res = await API.request(c)
      return res
    } catch (err) {
      lastErr = err
      if (err?.response?.status && err.response.status !== 404) throw err
    }
  }
  throw lastErr || new Error('Aucun endpoint disponible')
}

function toUserRow(raw, index = 0) {
  const id = raw._id || raw.id || raw.userId || `USR-${index + 1}`
  return {
    id: String(id),
    name: raw.name || raw.fullName || raw.username || raw.email || '—',
    email: raw.email || '—',
    role: raw.role || 'employee',
    status: raw.status || (raw.active === false ? 'blocked' : 'active'),
    _raw: raw,
  }
}

export async function getUsersApi({ page = 1, limit = 20, search = '' } = {}) {
  const res = await requestWithFallback([
    { method: 'GET', url: '/api/users', params: { page, limit, q: search || undefined } },
    { method: 'GET', url: '/rh/employees' },
  ])
  const list = normalizeListPayload(res?.data).map(toUserRow)
  const q = String(search || '').trim().toLowerCase()
  const filtered = q
    ? list.filter(
        (u) =>
          String(u.name || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q) ||
          String(u.role || '').toLowerCase().includes(q),
      )
    : list
  const fallbackPaged = filtered.slice((page - 1) * limit, page * limit)
  const usingApiUsers = String(res?.config?.url || '').includes('/api/users')
  const rows = usingApiUsers ? filtered : fallbackPaged
  const total = extractTotal(res?.data, filtered.length)
  return {
    rows,
    pagination: res?.data?.pagination || { page, limit, total },
    total,
    source: res?.config?.url || '',
  }
}

export async function deleteUserApi(id) {
  await requestWithFallback([
    { method: 'DELETE', url: `/api/users/${encodeURIComponent(id)}` },
    { method: 'DELETE', url: `/rh/employees/${encodeURIComponent(id)}` },
  ])
}

export async function createUserApi(payload) {
  const body = {
    name: payload.name,
    email: payload.email,
    role: payload.role || 'employee',
    status: payload.status || 'active',
    department: payload.department || undefined,
    employeeType: payload.employeeType || undefined,
  }
  const res = await requestWithFallback([
    { method: 'POST', url: '/api/users', data: body },
    { method: 'POST', url: '/rh/employees', data: body },
  ])
  const row = normalizeListPayload(res?.data)[0] || res?.data?.data || res?.data
  return toUserRow(row || body, 0)
}

export async function updateUserApi(id, payload) {
  const body = {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    department: payload.department || undefined,
    employeeType: payload.employeeType || undefined,
  }
  const res = await requestWithFallback([
    { method: 'PUT', url: `/api/users/${encodeURIComponent(id)}`, data: body },
    { method: 'PUT', url: `/rh/employees/${encodeURIComponent(id)}`, data: body },
  ])
  const row = normalizeListPayload(res?.data)[0] || res?.data?.data || res?.data
  return toUserRow(row || { id, ...body }, 0)
}

export async function getAdminPermissionsApi() {
  const res = await requestWithFallback([
    { method: 'GET', url: '/api/auth/permissions' },
    { method: 'GET', url: '/auth/permissions' },
  ])
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.data?.permissions)) return res.data.permissions
  if (Array.isArray(res?.data?.data?.permissions)) return res.data.data.permissions
  return []
}

export async function getSettingsApi() {
  const res = await requestWithFallback([
    { method: 'GET', url: '/api/settings' },
  ])
  const s = res?.data?.data || res?.data || {}
  return {
    appName: s.appName || s.name || 'WorkSphere Admin',
    supportEmail: s.supportEmail || s.contactEmail || 'support@worksphere.tn',
    timezone: s.timezone || 'Africa/Tunis',
    notifications: s.notificationsEnabled ?? s.notifications ?? true,
  }
}

export async function updateSettingsApi(payload) {
  const body = {
    appName: payload.appName,
    supportEmail: payload.supportEmail,
    timezone: payload.timezone,
    notificationsEnabled: Boolean(payload.notifications),
  }
  await requestWithFallback([
    { method: 'PUT', url: '/api/settings', data: body },
  ])
}

export async function getTransactionsApi({ page = 1, limit = 50 } = {}) {
  const res = await requestWithFallback([
    { method: 'GET', url: '/api/transactions', params: { page, limit } },
  ])
  return normalizeListPayload(res?.data)
}

export async function getActivityApi({ limit = 30 } = {}) {
  const res = await requestWithFallback([
    { method: 'GET', url: '/api/activity', params: { limit } },
    { method: 'GET', url: '/api/logs', params: { limit } },
  ])
  return normalizeListPayload(res?.data)
}
