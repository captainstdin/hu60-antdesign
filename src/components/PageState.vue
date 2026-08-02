<template>
  <div v-if="loading" class="page-state loading-state">
    <a-skeleton active avatar :paragraph="{ rows: rows }" />
    <a-skeleton v-if="rows > 3" active avatar :paragraph="{ rows: 2 }" />
  </div>
  <a-alert
    v-else-if="error"
    class="page-state"
    type="error"
    show-icon
    :message="title"
    :description="error"
  >
    <template #action>
      <a-button size="small" danger @click="$emit('retry')">重试</a-button>
    </template>
  </a-alert>
  <a-empty v-else-if="empty" class="page-state empty-state" :description="emptyText" />
  <slot v-else />
</template>

<script setup>
defineProps({
  loading: Boolean,
  error: { type: String, default: '' },
  empty: Boolean,
  emptyText: { type: String, default: '这里还没有内容' },
  title: { type: String, default: '加载失败' },
  rows: { type: Number, default: 4 },
})

defineEmits(['retry'])
</script>
