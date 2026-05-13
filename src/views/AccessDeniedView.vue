<script setup>
import { onMounted } from 'vue'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { auth } from '../firebase/config.js'

const router = useRouter()

onMounted(async () => {
  try {
    if (auth.currentUser) await signOut(auth)
  } catch {
    /* ignore */
  }
})

function goLogin() {
  router.replace({ name: 'Login' })
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-100 px-4"
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-lg"
    >
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl"
        aria-hidden="true"
      >
        ✕
      </div>
      <h1 class="mt-6 text-xl font-semibold text-slate-900">Access denied</h1>
      <p class="mt-3 text-sm text-slate-600">
        This application is restricted to the shop owner account. You have been
        signed out.
      </p>
      <button
        type="button"
        class="mt-8 inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        @click="goLogin"
      >
        Back to sign in
      </button>
    </div>
  </div>
</template>
