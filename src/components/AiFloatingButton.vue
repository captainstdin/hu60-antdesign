<template>
  <button
    v-show="visible"
    ref="buttonRef"
    class="ai-fab"
    :class="{ 'is-dragging': dragging, 'is-unconfigured': unconfigured }"
    :style="{ right: `${position.right}px`, bottom: `${position.bottom}px` }"
    type="button"
    :aria-label="unconfigured ? '打开 AI 助手（尚未配置）' : '打开 AI 助手'"
    @pointerdown="startPointer"
    @click="handleClick"
  >
    <RobotOutlined />
    <span class="ai-fab-label">AI</span>
    <i v-if="unconfigured" class="ai-fab-dot" aria-hidden="true"></i>
  </button>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RobotOutlined } from '@ant-design/icons-vue'
import { storage } from '../services/storage'

defineProps({
  visible: { type: Boolean, default: true },
  unconfigured: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const POSITION_KEY = 'aiButtonPos'
const SIZE = 54
const EDGE = 8
const DRAG_THRESHOLD = 5

const buttonRef = ref()
const dragging = ref(false)
const position = ref(loadPosition())

let startX = 0
let startY = 0
let startRight = 0
let startBottom = 0
let moved = false

function loadPosition() {
  const saved = storage.get(POSITION_KEY, null)
  if (saved && Number.isFinite(saved.right) && Number.isFinite(saved.bottom)) {
    return clamp(saved)
  }
  return clamp({ right: 18, bottom: 84 })
}

function clamp(value) {
  if (typeof window === 'undefined') return value
  const maxRight = Math.max(EDGE, window.innerWidth - SIZE - EDGE)
  const maxBottom = Math.max(EDGE, window.innerHeight - SIZE - EDGE)
  return {
    right: Math.min(Math.max(Number(value.right) || 0, EDGE), maxRight),
    bottom: Math.min(Math.max(Number(value.bottom) || 0, EDGE), maxBottom),
  }
}

function startPointer(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  startX = event.clientX
  startY = event.clientY
  startRight = position.value.right
  startBottom = position.value.bottom
  moved = false
  dragging.value = false

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function handlePointerMove(event) {
  const dx = event.clientX - startX
  const dy = event.clientY - startY

  if (!moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    moved = true
    dragging.value = true
  }

  // 用 right/bottom 记录位置，窗口尺寸变化时按钮会贴着右下角收缩，不会跑出屏幕。
  position.value = clamp({ right: startRight - dx, bottom: startBottom - dy })
}

function handlePointerUp() {
  releasePointer()
  dragging.value = false
  if (moved) storage.set(POSITION_KEY, position.value)
}

function releasePointer() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

function handleClick() {
  if (moved) {
    moved = false
    return
  }
  emit('open')
}

function handleResize() {
  position.value = clamp(position.value)
}

onMounted(() => window.addEventListener('resize', handleResize))

onBeforeUnmount(() => {
  releasePointer()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.ai-fab {
  position: fixed;
  z-index: 900;
  display: flex;
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 0;
  color: var(--on-brand);
  border: 1px solid rgba(var(--brand-rgb), 0.35);
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  box-shadow: 0 10px 24px rgba(var(--brand-rgb), 0.32);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow 0.16s ease;
  gap: 1px;
}

.ai-fab:hover,
.ai-fab:focus-visible {
  box-shadow: 0 14px 30px rgba(var(--brand-rgb), 0.42);
  outline: none;
}

.ai-fab:active,
.ai-fab.is-dragging {
  cursor: grabbing;
  transition: none;
}

.ai-fab :deep(.anticon) {
  font-size: 20px;
  line-height: 1;
  pointer-events: none;
}

.ai-fab-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  pointer-events: none;
}

.ai-fab-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 11px;
  height: 11px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: #ff4d4f;
  pointer-events: none;
}

@media (max-width: 620px) {
  .ai-fab {
    width: 48px;
    height: 48px;
  }

  .ai-fab :deep(.anticon) {
    font-size: 18px;
  }
}
</style>
