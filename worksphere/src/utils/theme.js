const STORAGE_KEY = 'ap_dark'

export function getInitialDarkMode() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored != null) return stored === '1'
  return true
}

export function applyDarkMode(darkMode) {
  localStorage.setItem(STORAGE_KEY, darkMode ? '1' : '0')
  document.documentElement.classList.toggle('dark', darkMode)
  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
}
