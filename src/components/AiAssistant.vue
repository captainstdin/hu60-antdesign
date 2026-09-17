<template>
  <template v-if="enabled">
    <AiFloatingButton
      :visible="!open"
      :unconfigured="loaded && !configured"
      @open="openPanel"
    />
    <!--
      面板用到不少 Ant Design 组件，等用户第一次点开再加载，避免拖慢首屏。
      加载后一直保留组件实例：关闭弹窗只是把它藏起来，已生成的结果、账号、
      滚动位置都还在，下次打开不用重新加载。
    -->
    <AiPanel v-if="panelLoaded" v-model:open="open" />
  </template>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AiFloatingButton from './AiFloatingButton.vue'
import { aiConfig } from '../services/aiConfig'

const AiPanel = defineAsyncComponent(() => import('./AiPanel.vue'))

const route = useRoute()
const open = ref(false)
const panelLoaded = ref(false)
// 只在帖子首页和帖子详情页提供 AI 助手。
const enabled = computed(() => route.name === 'home' || route.name === 'topic')
const loaded = computed(() => aiConfig.state.loaded)
const configured = computed(() => aiConfig.configured)

function openPanel() {
  panelLoaded.value = true
  open.value = true
}

watch(
  enabled,
  (value) => {
    if (!value) {
      open.value = false
      return
    }
    // 提前读一次配置：未配置时悬浮按钮上会显示一个红点提示。
    if (!aiConfig.state.loaded) aiConfig.load()
  },
  { immediate: true },
)
</script>
