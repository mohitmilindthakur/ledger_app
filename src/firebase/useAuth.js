import { ref, computed } from 'vue'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth } from './config.js'

const allowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL || '')
  .trim()
  .toLowerCase()

export const user = ref(null)
const ready = ref(false)
const accessDenied = ref(false)
const signInError = ref('')

let onDeniedNavigate = () => {}

let resolveReady
export const whenAuthReady = new Promise((resolve) => {
  resolveReady = resolve
})
let firstAuthEvent = true

let unsub = null

export function initAuth(navigateToDenied) {
  onDeniedNavigate = navigateToDenied
  if (unsub) return
  unsub = onAuthStateChanged(auth, async (u) => {
    accessDenied.value = false
    if (u?.email && !emailsMatch(u.email, allowedEmail)) {
      await signOut(auth)
      user.value = null
      accessDenied.value = true
      onDeniedNavigate()
    } else {
      user.value = u
    }
    ready.value = true
    if (firstAuthEvent) {
      firstAuthEvent = false
      resolveReady()
    }
  })
}

function emailsMatch(a, b) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
}

export function isAllowedUser() {
  return !!user.value && emailsMatch(user.value.email, allowedEmail)
}

export function useAuth() {
  const isAllowed = computed(() => isAllowedUser())

  async function signInWithGoogle() {
    signInError.value = ''
    accessDenied.value = false
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (e) {
      const code = e?.code || ''
      if (code === 'auth/configuration-not-found') {
        signInError.value =
          'Firebase Authentication is not set up for this project, or Google sign-in is disabled. In Firebase Console: Build → Authentication → Get started. Then Sign-in method → Google → Enable. Use the same project as your .env (check VITE_FIREBASE_AUTH_DOMAIN matches Project settings, usually project-id.firebaseapp.com).'
      } else if (code === 'auth/unauthorized-domain') {
        signInError.value =
          'This site URL is not allowed. In Firebase Console: Authentication → Settings → Authorized domains → add your domain (and localhost for local dev).'
      } else if (code === 'auth/operation-not-allowed') {
        signInError.value =
          'Google sign-in is turned off for this Firebase project. Enable it under Authentication → Sign-in method → Google.'
      } else {
        signInError.value = e?.message || 'Sign-in failed. Try again.'
      }
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return {
    user,
    ready,
    accessDenied,
    signInError,
    isAllowed,
    signInWithGoogle,
    logout,
    allowedEmail,
  }
}
