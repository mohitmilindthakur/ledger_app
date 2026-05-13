<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import AppShell from '../components/AppShell.vue'
import { db } from '../firebase/config.js'
import {
  awaitFirestoreUser,
  firestoreWithTimeout,
  formatFirestoreErrorWithHints,
} from '../lib/transactions.js'

const COLLECTION = 'transactions'

const router = useRouter()

const incomeCategories = ['Sales', 'Service', 'Other']
const expenseCategories = [
  'Rent',
  'Electricity',
  'Supplies',
  'Salaries',
  'Transport',
  'Other',
]

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowHm() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const date = ref(todayYmd())
const time = ref(nowHm())
const type = ref('Income')
const description = ref('')
const amount = ref('')
const category = ref('Sales')
const submitting = ref(false)
const formError = ref('')

const categoryOptions = computed(() =>
  type.value === 'Income' ? incomeCategories : expenseCategories,
)

watch(type, (t) => {
  category.value = t === 'Income' ? incomeCategories[0] : expenseCategories[0]
})

async function submit() {
  formError.value = ''
  const amt = Number(amount.value)
  if (!description.value.trim()) {
    formError.value = 'Please enter a description.'
    return
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    formError.value = 'Enter a valid amount greater than zero.'
    return
  }
  if (!date.value) {
    formError.value = 'Pick a date.'
    return
  }
  if (!time.value) {
    formError.value = 'Pick a time.'
    return
  }

  submitting.value = true
  try {
    await awaitFirestoreUser()
    await firestoreWithTimeout(
      addDoc(collection(db, COLLECTION), {
        date: date.value,
        time: time.value,
        type: type.value,
        description: description.value.trim(),
        amount: amt,
        category: category.value,
        deleted: false,
        createdAt: serverTimestamp(),
      }),
      'Save transaction',
    )
    await router.push({ name: 'Transactions' }).catch(() => {})
  } catch (e) {
    formError.value = await formatFirestoreErrorWithHints(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppShell title="Add transaction">
    <div class="mx-auto max-w-6xl">
      <form
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        @submit.prevent="submit"
      >
        <p
          v-if="formError"
          class="mb-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {{ formError }}
        </p>

        <div
          class="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-end md:gap-3"
        >
          <div class="flex shrink-0 flex-col gap-1">
            <label class="text-xs font-medium text-slate-600" for="tx-date">Date</label>
            <input
              id="tx-date"
              v-model="date"
              type="date"
              required
              class="w-full min-w-[10.5rem] rounded-lg border border-slate-200 px-2 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 md:w-auto"
            />
          </div>

          <div class="flex w-full shrink-0 flex-col gap-1 sm:w-28 md:w-24">
            <label class="text-xs font-medium text-slate-600" for="tx-time">Time</label>
            <input
              id="tx-time"
              v-model="time"
              type="time"
              required
              class="w-full min-w-[6.5rem] rounded-lg border border-slate-200 px-2 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div class="flex shrink-0 flex-col gap-1">
            <span class="text-xs font-medium text-slate-600">Type</span>
            <div class="flex h-[2.375rem] items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3">
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-800">
                <input v-model="type" type="radio" value="Income" class="text-teal-600" />
                Income
              </label>
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-800">
                <input v-model="type" type="radio" value="Expense" class="text-teal-600" />
                Expense
              </label>
            </div>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-1 lg:basis-0">
            <label class="text-xs font-medium text-slate-600" for="tx-desc">Description</label>
            <input
              id="tx-desc"
              v-model="description"
              type="text"
              autocomplete="off"
              placeholder="e.g. Wholesale stock, June rent"
              class="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div class="flex w-full shrink-0 flex-col gap-1 sm:w-32 md:w-28">
            <label class="text-xs font-medium text-slate-600" for="tx-amt">Amount</label>
            <input
              id="tx-amt"
              v-model="amount"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              placeholder="0.00"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div class="flex w-full shrink-0 flex-col gap-1 sm:w-40 md:w-36">
            <label class="text-xs font-medium text-slate-600" for="tx-cat">Category</label>
            <select
              id="tx-cat"
              v-model="category"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <button
            type="submit"
            class="h-[2.375rem] w-full shrink-0 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0 md:w-auto md:self-end"
            :disabled="submitting"
          >
            {{ submitting ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </AppShell>
</template>
