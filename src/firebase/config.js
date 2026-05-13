import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore'

/**

 * Reads a Vite env var, trims whitespace, and removes a single pair of
 * wrapping quotes (common mistake in .env files).
 */
function viteEnv(name) {
  const raw = import.meta.env[name]
  if (raw === undefined || raw === null) return ''
  let s = String(raw).trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

const missing = requiredKeys.filter((k) => !viteEnv(k))
if (missing.length) {
  const msg = [
    '[Shop Ledger] Missing or empty Firebase environment variables:',
    ...missing.map((k) => `  - ${k}`),
    '',
    '1. Copy .env.example to .env in the project root.',
    '2. Paste values from Firebase Console → Project settings → Your apps (Web).',
    '3. Do not wrap values in quotes unless the value itself contains spaces.',
    '4. Restart the dev server after saving .env (npm run dev).',
  ].join('\n')
  console.error(msg)
  throw new Error(
    `Missing Firebase configuration (${missing.join(', ')}). See console for details.`,
  )
}

const firebaseConfig = {
  apiKey: viteEnv('VITE_FIREBASE_API_KEY'),
  authDomain: viteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: viteEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: viteEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: viteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: viteEnv('VITE_FIREBASE_APP_ID'),
}

let app
let auth
let db
try {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  try {
    db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    })
  } catch {
    db = getFirestore(app)
  }
} catch (e) {
  const code = e?.code || ''
  console.error(
    '[Shop Ledger] Firebase failed to start. Typical fixes:',
    '\n  • Copy the Web app config from Firebase Console → Project settings → Your apps.',
    '\n  • Ensure VITE_FIREBASE_API_KEY is the full key (often starts with "AIza").',
    '\n  • Remove quotes around .env values; restart dev server after any .env change.',
    '\n  • Use the same project for all VITE_FIREBASE_* variables.',
    e,
  )
  if (code === 'auth/invalid-api-key') {
    throw new Error(
      'Invalid Firebase API key (auth/invalid-api-key). Fix VITE_FIREBASE_API_KEY in .env, then restart npm run dev.',
    )
  }
  throw e
}

export { auth, db }
export default app
