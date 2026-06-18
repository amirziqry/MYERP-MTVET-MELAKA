// Shared brand styles for app email templates.
export const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
export const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
export const header = {
  backgroundColor: '#0ea5a4',
  padding: '20px 25px',
  color: '#ffffff',
}
export const headerTitle = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '0',
}
export const headerSubtitle = {
  fontSize: '12px',
  color: '#d1fae5',
  margin: '4px 0 0',
}
export const inner = { padding: '24px 25px' }
export const h1 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 16px',
}
export const text = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 14px',
}
export const li = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 6px',
}
export const button = {
  backgroundColor: '#0ea5a4',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 16px',
}
export const link = { color: '#0ea5a4', textDecoration: 'underline' }
export const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }

export const SITE_NAME = 'Majlis TVET Melaka'
export const APP_URL = 'https://myerptvetmelakatrainer.lovable.app'

export function fmtMoney(v: unknown): string {
  const n = Number(v ?? 0)
  if (!isFinite(n)) return String(v ?? '')
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}