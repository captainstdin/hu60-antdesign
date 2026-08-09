import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// ant-design-vue 表单/数据录入类组件，单独拆为一个 chunk。
const ANTD_FORM_DIRS = new Set([
  'form', 'input', 'input-number', 'checkbox', 'radio', 'switch', 'select',
  'auto-complete', 'tree-select', 'cascader', 'slider', 'rate', 'upload',
  'mentions', 'transfer', 'date-picker', 'time-picker', 'calendar',
])

// ant-design-vue 反馈/导航/弹层类组件，单独拆为一个 chunk。
const ANTD_OVERLAY_DIRS = new Set([
  'modal', 'drawer', 'popover', 'tooltip', 'dropdown', 'menu', 'tabs',
  'collapse', 'notification', 'message', 'spin', 'skeleton', 'empty',
  'result', 'progress', 'alert',
])

// ant-design-vue 数据展示类组件，单独拆为一个 chunk。
const ANTD_DISPLAY_DIRS = new Set([
  'table', 'list', 'tree', 'pagination', 'breadcrumb', 'card', 'avatar',
  'badge', 'tag', 'descriptions', 'segmented', 'layout', 'statistic',
  'timeline', 'steps', 'image', 'carousel', 'divider',
])

export default defineConfig({
  // 所有构建资源使用相对路径，dist 可直接部署到任意静态服务器二级目录。
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 80,
    allowedHosts: ['test.hu60.cn'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@vue/') || id.includes('/node_modules/vue/')) {
            return 'vue-vendor'
          }
          if (id.includes('/node_modules/vue-router/')) return 'vue-router'
          if (id.includes('/node_modules/@ant-design/icons')) return 'antd-icons'
          if (id.includes('/node_modules/ant-design-vue/')) {
            // 按组件目录把 antd 拆成多个 chunk，避免单个 vendor 过大。
            const match = id.match(/ant-design-vue\/(?:es|lib)\/([^/]+)/)
            const dir = match ? match[1] : ''
            if (ANTD_FORM_DIRS.has(dir)) return 'antd-form'
            if (ANTD_OVERLAY_DIRS.has(dir)) return 'antd-overlay'
            if (ANTD_DISPLAY_DIRS.has(dir)) return 'antd-display'
            return 'antd-base'
          }
          return undefined
        },
      },
    },
  },
})
