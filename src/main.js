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

/**
 * 兜住组件生命周期/渲染里抛出的异常。
 *
 * 不设置 errorHandler 时，Vue 在开发模式下会把钩子里的异常重新抛出，
 * 直接中断当次 patch：表现出来就是「路由已经跳过去了（地址栏变了），
 * 但旧页面还留在屏幕上、新页面根本不挂载，也就不会发起任何接口请求」。
 * 这里统一记录，保证单个组件出错不会拖死整次页面切换。
 */
app.config.errorHandler = (err, instance, info) => {
  const name = instance?.$options?.name || instance?.type?.__name || 'unknown'
  console.error(`[hu60] 组件异常（${info}，${name}）`, err)
}

app.use(router).mount('#app')
