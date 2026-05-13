import { createRouter, createWebHistory } from 'vue-router'
import { whenAuthReady, user, isAllowedUser } from '../firebase/useAuth.js'

const Login = () => import('../views/LoginView.vue')
const AccessDenied = () => import('../views/AccessDeniedView.vue')
const Dashboard = () => import('../views/DashboardView.vue')
const Transactions = () => import('../views/TransactionsView.vue')
const AddTransaction = () => import('../views/AddTransactionView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { public: true },
    },
    {
      path: '/access-denied',
      name: 'AccessDenied',
      component: AccessDenied,
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: Transactions,
      meta: { requiresAuth: true },
    },
    {
      path: '/transactions/add',
      name: 'AddTransaction',
      component: AddTransaction,
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await whenAuthReady

  if (to.name === 'AccessDenied') return true

  const signedIn = !!user.value
  const allowed = isAllowedUser()

  if (to.meta.public) {
    if (signedIn && allowed && to.name === 'Login') {
      return { name: 'Dashboard' }
    }
    return true
  }

  if (!signedIn || !allowed) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  return true
})

export default router
