import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 所有构建资源使用相对路径，dist 可直接部署到任意静态服务器二级目录。
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
  },
})
