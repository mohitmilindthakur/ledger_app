<script setup>
import { RouterView } from 'vue-router'
import { useAuth } from './firebase/useAuth.js'

const { ready } = useAuth()
</script>

<template>
  <div
    v-if="!ready"
    class="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-100"
  >
    <div
      class="h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
      aria-hidden="true"
    />
    <p class="text-sm font-medium text-slate-600">Checking sign-in…</p>
  </div>
  <RouterView v-else />
</template>
