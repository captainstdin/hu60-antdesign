import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

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
          if (id.includes('/node_modules/ant-design-vue/')) return 'antd-vendor'
          return undefined
        },
      },
    },
  },
})
