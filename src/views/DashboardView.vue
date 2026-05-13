<script setup>
import { ref, computed, onMounted } from 'vue'
import AppShell from '../components/AppShell.vue'
import {
  fetchAllTransactions,
  aggregateByMonth,
  totals,
  labelMonth,
  formatFirestoreErrorWithHints,
} from '../lib/transactions.js'

const loading = ref(true)
const error = ref('')
const rows = ref([])

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const summary = computed(() => totals(rows.value))
const monthly = computed(() => aggregateByMonth(rows.value))

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    rows.value = await fetchAllTransactions()
  } catch (e) {
    error.value = await formatFirestoreErrorWithHints(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AppShell title="Dashboard">
    <div>
      <p
        v-if="error"
        class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      >
        {{ error }}
      </p>
      <div v-else-if="loading" class="flex items-center gap-3 text-slate-600">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600"
        />
        Loading dashboard…
      </div>
      <template v-else>
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total income
          </p>
          <p class="mt-2 text-2xl font-semibold text-emerald-700">
            {{ money.format(summary.income) }}
          </p>
        </div>
        <div
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total expenses
          </p>
          <p class="mt-2 text-2xl font-semibold text-rose-700">
            {{ money.format(summary.expense) }}
          </p>
        </div>
        <div
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Net balance
          </p>
          <p
            class="mt-2 text-2xl font-semibold"
            :class="summary.net >= 0 ? 'text-teal-800' : 'text-rose-800'"
          >
            {{ money.format(summary.net) }}
          </p>
        </div>
      </div>

      <div
        class="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900">Monthly summary</h2>
          <p class="text-sm text-slate-500">
            Income, expenses, and net grouped by calendar month.
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-5 py-3">Month</th>
                <th class="px-5 py-3 text-right">Income</th>
                <th class="px-5 py-3 text-right">Expenses</th>
                <th class="px-5 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="m in monthly" :key="m.monthKey" class="hover:bg-slate-50/80">
                <td class="px-5 py-3 font-medium text-slate-900">
                  {{ labelMonth(m.monthKey) }}
                </td>
                <td class="px-5 py-3 text-right text-emerald-700">
                  {{ money.format(m.income) }}
                </td>
                <td class="px-5 py-3 text-right text-rose-700">
                  {{ money.format(m.expense) }}
                </td>
                <td
                  class="px-5 py-3 text-right font-medium"
                  :class="m.income - m.expense >= 0 ? 'text-teal-800' : 'text-rose-800'"
                >
                  {{ money.format(m.income - m.expense) }}
                </td>
              </tr>
              <tr v-if="!monthly.length">
                <td colspan="4" class="px-5 py-8 text-center text-slate-500">
                  No transactions yet. Add your first entry from the Add page.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </template>
    </div>
  </AppShell>
</template>
