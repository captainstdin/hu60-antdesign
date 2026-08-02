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
    colorPrimary: '#178f80',
    colorInfo: '#178f80',
    colorLink: '#178f80',
    colorBgLayout: '#f4f7f6',
    colorText: '#263633',
    colorTextSecondary: '#71807d',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Button: { controlHeight: 38 },
    Card: { paddingLG: 22 },
    Input: { controlHeight: 40 },
    Menu: { itemHeight: 46, itemBorderRadius: 10 },
  },
}
</script>
