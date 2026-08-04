<template>
  <a-config-provider :theme="theme" :locale="zhCN">
    <AppShell />
  </a-config-provider>
</template>

<script setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppShell from './layouts/AppShell.vue'

const theme = {
  token: {
    colorPrimary: '#168b7c',
    colorInfo: '#168b7c',
    colorLink: '#237f9f',
    colorBgLayout: '#f3f5f4',
    colorText: '#263633',
    colorTextSecondary: '#71807d',
    borderRadius: 6,
    borderRadiusLG: 6,
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Button: { controlHeight: 38 },
    Card: { paddingLG: 22 },
    Input: { controlHeight: 40 },
    Menu: { itemHeight: 46, itemBorderRadius: 6 },
  },
}
</script>
