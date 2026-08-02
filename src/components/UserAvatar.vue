<template>
  <a-avatar :size="size" :src="currentSrc" :shape="shape" @error="handleError">
    <UserOutlined />
  </a-avatar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { normalizeAvatar } from '../config/app'

const props = defineProps({
  avatar: { type: String, default: '' },
  uid: { type: [String, Number], default: '' },
  size: { type: [String, Number], default: 44 },
  shape: { type: String, default: 'circle' },
})

const currentSrc = ref(normalizeAvatar(props.avatar, props.uid))

watch(
  () => [props.avatar, props.uid],
  () => {
    currentSrc.value = normalizeAvatar(props.avatar, props.uid)
  },
)

function handleError() {
  const fallback = normalizeAvatar('', '')
  if (currentSrc.value === fallback) return false
  currentSrc.value = fallback
  return false
}
</script>
