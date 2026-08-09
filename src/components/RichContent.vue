<template>
  <div class="rich-content-shell" :style="contentStyle">
    <div
      class="rich-content"
      :class="{
        collapsed: collapsible && canCollapse && !expanded,
        'has-image-width': imageWidth,
        'image-previewable': imagePreview,
      }"
      v-html="safeHtml"
      @click="handleContentClick"
    />
    <button
      v-if="collapsible && canCollapse"
      class="content-fold-button"
      type="button"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起内容' : '查看全部' }}
      <UpOutlined v-if="expanded" />
      <DownOutlined v-else />
    </button>
    <a-modal
      v-model:open="previewOpen"
      centered
      destroy-on-close
      :footer="null"
      :width="960"
      wrap-class-name="rich-content-preview-modal"
    >
      <img v-if="previewSrc" class="rich-content-preview-image" :src="previewSrc" :alt="previewAlt" />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { API_BASE_URL } from '../config/app'
import { sanitizeHtml } from '../utils/content'

const props = defineProps({
  html: { type: String, default: '' },
  collapsible: { type: Boolean, default: false },
  imagePreview: { type: Boolean, default: false },
  imageWidth: { type: String, default: '' },
})

const router = useRouter()
const expanded = ref(false)
const previewOpen = ref(false)
const previewSrc = ref('')
const previewAlt = ref('图片预览')
const safeHtml = computed(() => sanitizeHtml(props.html))
const canCollapse = computed(() => String(props.html || '').length > 5000)
const contentStyle = computed(() => (
  props.imageWidth ? { '--rich-content-image-width': props.imageWidth } : undefined
))

function handleContentClick(event) {
  const image = event.target?.closest?.('img')
  if (props.imagePreview && image && !image.classList?.contains('hu60_face')) {
    const src = image.currentSrc || image.getAttribute('src') || image.src
    if (src) {
      event.preventDefault()
      previewSrc.value = src
      previewAlt.value = image.getAttribute('alt') || '图片预览'
      previewOpen.value = true
      return
    }
  }

  const anchor = event.target?.closest?.('a[href]')
  if (!anchor) return

  let url
  try {
    url = new URL(anchor.href, API_BASE_URL)
  } catch {
    return
  }
  if (url.origin !== new URL(API_BASE_URL).origin) return

  const topicMatch = url.pathname.match(/bbs\.topic\.(\d+)/)
  if (topicMatch) {
    event.preventDefault()
    router.push({ name: 'topic', params: { id: topicMatch[1] }, hash: url.hash })
    return
  }

  const userMatch = url.pathname.match(/user\.info\.(-?\d+)/)
  if (userMatch) {
    event.preventDefault()
    router.push({ name: 'user', params: { uid: userMatch[1] } })
  }
}

watch(() => props.html, () => {
  expanded.value = false
  previewOpen.value = false
  previewSrc.value = ''
})
</script>

<style scoped>
.rich-content-shell {
  min-width: 0;
}

.rich-content {
  min-height: 36px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.rich-content.collapsed {
  position: relative;
  max-height: 680px;
  overflow: hidden;
}

.rich-content.collapsed::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 72px;
  background: linear-gradient(transparent, var(--surface));
  content: '';
  pointer-events: none;
}

.rich-content :deep(img),
.rich-content :deep(video),
.rich-content :deep(iframe) {
  max-width: 100% !important;
  height: auto;
  border-radius: 4px;
}

.rich-content.has-image-width :deep(img:not(.hu60_face)) {
  display: block;
  width: min(var(--rich-content-image-width), 100%) !important;
  height: auto !important;
}

.rich-content.image-previewable :deep(img:not(.hu60_face)) {
  cursor: zoom-in;
}

.rich-content :deep(iframe) {
  width: min(100%, 760px);
  min-height: 360px;
  border: 1px solid var(--line-strong);
}

.rich-content :deep(pre) {
  max-width: 100%;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--surface-code);
}

.rich-content :deep(code) {
  padding: 2px 5px;
  border-radius: 3px;
  background: var(--surface-code-inline);
  font-family: Consolas, Monaco, monospace;
}

.rich-content :deep(pre code) {
  padding: 0;
  background: transparent;
}

.rich-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 14px;
  color: var(--text-subtle);
  border-left: 3px solid var(--quote-border);
  background: var(--surface-quote);
}

.rich-content :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.rich-content :deep(th),
.rich-content :deep(td) {
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
}

.rich-content :deep(.hu60_face) {
  width: 28px !important;
  height: 28px !important;
  vertical-align: middle;
}

.rich-content :deep(.userat),
.rich-content :deep(.userinfo) {
  color: var(--brand);
  border-radius: 3px;
  background: var(--brand-soft);
}

.content-fold-button {
  display: flex;
  align-items: center;
  margin: 8px auto 0;
  padding: 5px 10px;
  color: var(--link);
  font-size: 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  gap: 5px;
}

.rich-content-preview-image {
  display: block;
  max-width: 100%;
  max-height: calc(90vh - 96px);
  margin: 0 auto;
  object-fit: contain;
}

:global(.rich-content-preview-modal .ant-modal-body) {
  padding: 12px;
}
</style>
