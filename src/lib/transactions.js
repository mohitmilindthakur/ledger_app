import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { auth, db } from '../firebase/config.js'

const COLLECTION = 'transactions'
const FIRESTORE_TIMEOUT_MS = 30_000

/** Wait for Auth user + ID token so Firestore requests are not sent unauthenticated. */
export async function awaitFirestoreUser() {
  const u = auth.currentUser
  if (!u) return
  await u.getIdToken()
}

/** Active rows only (soft-deleted docs have deleted: true). */
export function isTransactionActive(row) {
  return row.deleted !== true
}

/**
 * Display date + time: uses stored `time` (HH:mm) when set, otherwise clock from
 * `createdAt`, otherwise date only.
 */
export function formatTransactionDateTime(row) {
  const dateStr = row.date || ''
  if (!dateStr) return '—'

  const timeStr = row.time != null ? String(row.time).trim() : ''
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const parts = timeStr.split(':')
    const d = new Date()
    d.setHours(Number(parts[0]), Number(parts[1] || 0), 0, 0)
    const clock = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${dateStr} · ${clock}`
  }

  const c = row.createdAt
  if (c && typeof c.toDate === 'function') {
    try {
      const clock = c.toDate().toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
      return `${dateStr} · ${clock}`
    } catch {
      /* fall through */
    }
  }

  return dateStr
}

function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${Math.round(ms / 1000)}s. Check the network, browser extensions, and that Firestore is enabled (Firebase Console → Build → Firestore Database).`,
        ),
      )
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Use for writes/deletes so the UI cannot spin forever. */
export function firestoreWithTimeout(promise, label = 'Firestore') {
  return withTimeout(promise, FIRESTORE_TIMEOUT_MS, label)
}

export function formatFirestoreError(err) {
  const code = err?.code || ''
  const msg = err?.message || 'Request failed.'
  if (code === 'permission-denied') {
    return `${msg} (${code}) — Firestore rules rejected this request. Details follow.`
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return `${msg} (${code}) — Firestore is temporarily unreachable. Retry, or check your connection.`
  }
  if (code === 'failed-precondition') {
    return `${msg} (${code}) — Create a Firestore database in this Firebase project if you have not yet.`
  }
  return code ? `${msg} (${code})` : msg
}

/**
 * Call when you get permission-denied: shows what the ID token carries so you
 * can match Firestore rules and confirm you deployed rules to the same project as .env.
 */
export async function explainFirestorePermissionDenied() {
  const u = auth.currentUser
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
  if (!u) {
    return 'permission-denied: not signed in (unexpected).'
  }
  let claimEmail = ''
  try {
    const r = await u.getIdTokenResult(true)
    claimEmail =
      (r.claims && r.claims.email != null && String(r.claims.email)) || ''
  } catch {
    /* ignore */
  }
  const profileEmail = u.email || ''
  const uid = u.uid
  const emailForRules = (claimEmail || profileEmail).trim()
  return [
    'Firestore returned permission-denied. Fix in this order:',
    '',
    `1) Same project: your .env VITE_FIREBASE_PROJECT_ID is "${projectId}". In Firebase Console, open THAT project → Firestore → Rules → Publish after every edit.`,
    '',
    `2) Your account: uid = "${uid}"`,
    `   profile email = "${profileEmail}"`,
    `   ID token "email" claim (what rules usually compare) = "${emailForRules || '(missing)'}"`,
    '',
    '3) In firestore.rules use either:',
    `   request.auth.uid == "${uid}"`,
    '   or match the token email (often all-lowercase for Gmail), then Publish rules.',
    '',
    '4) If you only edited firestore.rules on your computer, deploy them in the Console (or firebase deploy); the live project does not read your repo file.',
    '',
    '5) If your published rules still contain the literal text YOUR_AUTH_UID or REPLACE_WITH_LOWERCASE_EMAIL, Firestore will deny everyone until you replace that placeholder and click Publish again.',
  ].join('\n')
}

export async function formatFirestoreErrorWithHints(err) {
  const base = formatFirestoreError(err)
  if (err?.code === 'permission-denied') {
    return `${base}\n\n${await explainFirestorePermissionDenied()}`
  }
  return base
}

export async function fetchAllTransactions(options = {}) {
  const { includeDeleted = false } = options
  await awaitFirestoreUser()
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
  )
  const snap = await withTimeout(
    getDocs(q),
    FIRESTORE_TIMEOUT_MS,
    'Loading transactions',
  )
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }))
  if (includeDeleted) return rows
  return rows.filter(isTransactionActive)
}

export function monthKeyFromDateString(yyyyMmDd) {
  if (!yyyyMmDd || typeof yyyyMmDd !== 'string') return null
  const parts = yyyyMmDd.split('-')
  if (parts.length < 2) return null
  return `${parts[0]}-${parts[1]}`
}

export function labelMonth(monthKey) {
  if (!monthKey) return ''
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}

export function aggregateByMonth(rows) {
  const map = new Map()
  for (const row of rows) {
    const mk = monthKeyFromDateString(row.date)
    if (!mk) continue
    if (!map.has(mk)) {
      map.set(mk, { monthKey: mk, income: 0, expense: 0 })
    }
    const bucket = map.get(mk)
    const amt = Number(row.amount) || 0
    if (row.type === 'Income') bucket.income += amt
    else if (row.type === 'Expense') bucket.expense += amt
  }
  return [...map.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export function totals(rows) {
  let income = 0
  let expense = 0
  for (const row of rows) {
    const amt = Number(row.amount) || 0
    if (row.type === 'Income') income += amt
    else if (row.type === 'Expense') expense += amt
  }
  return { income, expense, net: income - expense }
}
