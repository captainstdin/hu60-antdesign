<template>
  <a-config-provider :theme="theme" :locale="zhCN">
    <AppShell />
  </a-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppShell from './layouts/AppShell.vue'
import { getAntDesignTheme, themeStore } from './stores/theme'

const theme = computed(() => getAntDesignTheme(themeStore.state.current))

onMounted(() => {
  themeStore.initSync()
})
</script>
