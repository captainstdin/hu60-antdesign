import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import { API_BASE_URL } from './config/app'
import router from './router'
import './styles/global.css'

function setApiFavicon() {
  const faviconUrl = `${API_BASE_URL}/favicon.ico`
  let icon = document.querySelector('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.href = faviconUrl
}

setApiFavicon()

const app = createApp(App)

app.use(router).mount('#app')
