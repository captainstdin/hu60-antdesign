<template>
  <a-card class="surface-card not-found-card" :bordered="false">
    <a-result status="404" title="404" sub-title="你访问的页面不存在或已经移动。">
      <template #extra>
        <a-button type="primary" @click="router.replace('/')">返回论坛首页</a-button>
      </template>
    </a-result>
  </a-card>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.not-found-card {
  padding: 30px 0;
}
</style>
