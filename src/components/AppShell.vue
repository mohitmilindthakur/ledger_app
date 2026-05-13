<script setup>
import { RouterLink } from 'vue-router'
import { useAuth } from '../firebase/useAuth.js'

defineProps({
  title: { type: String, default: '' },
})

const { logout } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header
      class="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
    >
      <div
        class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white"
          >
            SL
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-teal-700">
              Shop Ledger
            </p>
            <h1 class="text-lg font-semibold text-slate-900">{{ title }}</h1>
          </div>
        </div>
        <nav class="flex flex-wrap items-center gap-2 text-sm font-medium">
          <RouterLink
            to="/"
            class="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-teal-50 !text-teal-900"
            exact-active-class="!bg-teal-50 !text-teal-900"
          >
            Dashboard
          </RouterLink>
          <RouterLink
            to="/transactions"
            class="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-teal-50 !text-teal-900"
          >
            Transactions
          </RouterLink>
          <RouterLink
            to="/transactions/add"
            class="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            active-class="!bg-teal-50 !text-teal-900"
          >
            Add
          </RouterLink>
          <button
            type="button"
            class="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            @click="logout"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <slot />
    </main>
  </div>
</template>
