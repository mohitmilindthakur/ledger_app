<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppShell from '../components/AppShell.vue'
import {
  fetchAllTransactions,
  formatFirestoreErrorWithHints,
  awaitFirestoreUser,
  firestoreWithTimeout,
  formatTransactionDateTime,
} from '../lib/transactions.js'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

const COLLECTION = 'transactions'

const loading = ref(true)
const error = ref('')
const allRows = ref([])

const filterType = ref('All')
const filterCategory = ref('All')
const dateFrom = ref('')
const dateTo = ref('')

const categories = computed(() => {
  const set = new Set()
  for (const r of allRows.value) {
    if (r.category) set.add(r.category)
  }
  return ['All', ...[...set].sort()]
})

const filtered = computed(() => {
  let list = [...allRows.value]
  if (filterType.value !== 'All') {
    list = list.filter((r) => r.type === filterType.value)
  }
  if (filterCategory.value !== 'All') {
    list = list.filter((r) => r.category === filterCategory.value)
  }
  if (dateFrom.value) {
    list = list.filter((r) => r.date >= dateFrom.value)
  }
  if (dateTo.value) {
    list = list.filter((r) => r.date <= dateTo.value)
  }
  return list
})

const money = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const deleteId = ref(null)
const deleteBusy = ref(false)
const restoreId = ref(null)
const restoreBusy = ref(false)

function removedOnLabel(row) {
  const ts = row.deletedAt
  if (!ts || typeof ts.toDate !== 'function') return ''
  try {
    return ts.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return ''
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    allRows.value = await fetchAllTransactions({ includeDeleted: true })
  } catch (e) {
    error.value = await formatFirestoreErrorWithHints(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch([filterType], () => {
  filterCategory.value = 'All'
})

async function confirmDelete() {
  if (!deleteId.value) return
  deleteBusy.value = true
  try {
    await awaitFirestoreUser()
    await firestoreWithTimeout(
      updateDoc(doc(db, COLLECTION, deleteId.value), {
        deleted: true,
        deletedAt: serverTimestamp(),
      }),
      'Remove transaction',
    )
    deleteId.value = null
    await load()
  } catch (e) {
    error.value = await formatFirestoreErrorWithHints(e)
  } finally {
    deleteBusy.value = false
  }
}

async function confirmRestore() {
  if (!restoreId.value) return
  restoreBusy.value = true
  try {
    await awaitFirestoreUser()
    await firestoreWithTimeout(
      updateDoc(doc(db, COLLECTION, restoreId.value), {
        deleted: false,
        deletedAt: deleteField(),
      }),
      'Restore transaction',
    )
    restoreId.value = null
    await load()
  } catch (e) {
    error.value = await formatFirestoreErrorWithHints(e)
  } finally {
    restoreBusy.value = false
  }
}
</script>

<template>
  <AppShell title="Transactions">
    <p
      v-if="error"
      class="whitespace-pre-wrap mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {{ error }}
    </p>

    <div
      class="mb-6 flex flex-nowrap items-end gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 pb-3 shadow-sm"
    >
      <div class="flex shrink-0 flex-col gap-1">
        <label class="text-xs font-medium text-slate-500" for="from">From</label>
        <input
          id="from"
          v-model="dateFrom"
          type="date"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div class="flex shrink-0 flex-col gap-1">
        <label class="text-xs font-medium text-slate-500" for="to">To</label>
        <input
          id="to"
          v-model="dateTo"
          type="date"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <div class="flex shrink-0 flex-col gap-1">
        <label class="text-xs font-medium text-slate-500" for="type">Type</label>
        <select
          id="type"
          v-model="filterType"
          class="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option>All</option>
          <option>Income</option>
          <option>Expense</option>
        </select>
      </div>
      <div class="flex shrink-0 flex-col gap-1">
        <label class="text-xs font-medium text-slate-500" for="cat">Category</label>
        <select
          id="cat"
          v-model="filterCategory"
          class="min-w-[10rem] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="
          dateFrom = '';
          dateTo = '';
          filterType = 'All';
          filterCategory = 'All';
        "
      >
        Clear filters
      </button>
    </div>

    <div
      v-if="loading"
      class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600"
    >
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600"
      />
      Loading transactions…
    </div>

    <div
      v-else
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <!-- Mobile: compact cards -->
      <div class="md:hidden">
        <div v-if="!filtered.length" class="px-4 py-10 text-center text-sm text-slate-500">
          No transactions match your filters.
        </div>
        <ul v-else class="divide-y divide-slate-100">
          <li
            v-for="row in filtered"
            :key="`card-${row.id}`"
            class="px-3 py-3"
          >
            <article
              class="rounded-xl border p-3 shadow-sm"
              :class="
                row.deleted
                  ? 'border border-dashed border-slate-300 bg-slate-100/90'
                  : 'border border-slate-200 bg-slate-50/40'
              "
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <time
                    class="text-xs font-medium tabular-nums text-slate-500"
                    :datetime="row.date"
                  >{{ formatTransactionDateTime(row) }}</time>
                  <span
                    v-if="row.deleted"
                    class="inline-flex shrink-0 rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  >
                    Removed
                  </span>
                  <span
                    class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    :class="
                      row.type === 'Income'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    "
                  >
                    {{ row.type }}
                  </span>
                </div>
                <span
                  class="shrink-0 text-sm font-semibold tabular-nums"
                  :class="
                    row.deleted
                      ? 'text-slate-400 line-through'
                      : row.type === 'Income'
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                  "
                >
                  {{ money.format(Number(row.amount) || 0) }}
                </span>
              </div>
              <p
                class="mt-2 line-clamp-2 text-sm leading-snug"
                :class="row.deleted ? 'text-slate-500 line-through' : 'text-slate-900'"
              >
                {{ row.description }}
              </p>
              <p v-if="row.deleted && removedOnLabel(row)" class="mt-1 text-[11px] text-slate-500">
                Removed {{ removedOnLabel(row) }}
              </p>
              <div class="mt-2 flex items-center justify-between gap-2 pt-1">
                <span
                  class="truncate text-xs"
                  :class="row.deleted ? 'text-slate-500' : 'text-slate-600'"
                >{{ row.category }}</span>
                <button
                  v-if="!row.deleted"
                  type="button"
                  class="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-800"
                  @click="deleteId = row.id"
                >
                  Remove
                </button>
                <button
                  v-else
                  type="button"
                  class="shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-900"
                  @click="restoreId = row.id"
                >
                  Restore
                </button>
              </div>
            </article>
          </li>
        </ul>
      </div>

      <!-- md+: table -->
      <div class="hidden overflow-x-auto md:block">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">When</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Description</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3 text-right">Amount</th>
              <th class="px-4 py-3 text-right">Remove / restore</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="row in filtered"
              :key="row.id"
              class="hover:bg-slate-50/80"
              :class="row.deleted ? 'bg-slate-50 text-slate-500' : ''"
            >
              <td class="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                {{ formatTransactionDateTime(row) }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  v-if="row.deleted"
                  class="inline-flex rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  Removed
                </span>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    row.type === 'Income'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800'
                  "
                >
                  {{ row.type }}
                </span>
              </td>
              <td
                class="max-w-xs truncate px-4 py-3"
                :class="row.deleted ? 'text-slate-500 line-through' : 'text-slate-800'"
              >
                {{ row.description }}
              </td>
              <td class="px-4 py-3 text-slate-600">{{ row.category }}</td>
              <td
                class="whitespace-nowrap px-4 py-3 text-right font-medium"
                :class="
                  row.deleted
                    ? 'text-slate-400 line-through'
                    : row.type === 'Income'
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                "
              >
                {{ money.format(Number(row.amount) || 0) }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <button
                  v-if="!row.deleted"
                  type="button"
                  class="text-sm font-medium text-rose-600 hover:text-rose-800"
                  @click="deleteId = row.id"
                >
                  Remove
                </button>
                <button
                  v-else
                  type="button"
                  class="text-sm font-medium text-teal-700 hover:text-teal-900"
                  @click="restoreId = row.id"
                >
                  Restore
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="7" class="px-4 py-10 text-center text-slate-500">
                No transactions match your filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <teleport to="body">
      <div
        v-if="deleteId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="del-title" class="text-lg font-semibold text-slate-900">
            Remove from ledger?
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            This hides the transaction from your lists and totals. The record is
            kept in the database (soft delete); it is not permanently erased.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              :disabled="deleteBusy"
              @click="deleteId = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              :disabled="deleteBusy"
              @click="confirmDelete"
            >
              {{ deleteBusy ? 'Removing…' : 'Remove' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <teleport to="body">
      <div
        v-if="restoreId"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-title"
      >
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="restore-title" class="text-lg font-semibold text-slate-900">
            Restore transaction?
          </h2>
          <p class="mt-2 text-sm text-slate-600">
            This puts the entry back in your ledger and includes it in totals again.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              :disabled="restoreBusy"
              @click="restoreId = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              :disabled="restoreBusy"
              @click="confirmRestore"
            >
              {{ restoreBusy ? 'Restoring…' : 'Restore' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </AppShell>
</template>
