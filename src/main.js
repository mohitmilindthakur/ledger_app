import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './firebase/config.js'
import App from './App.vue'
import './style.css'
import router from './router'
import { initAuth } from './firebase/useAuth.js'

registerSW({ immediate: true })

initAuth(() => {
  router.replace({ name: 'AccessDenied' }).catch(() => {})
})

createApp(App).use(router).mount('#app')
