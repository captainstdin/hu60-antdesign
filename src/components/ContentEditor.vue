<template>
  <div class="content-editor">
    <div class="editor-toolbar">
      <a-segmented :value="mode" :options="modeOptions" size="small" @change="setMode" />

      <div class="format-tools">
        <a-tooltip v-for="tool in formatTools" :key="tool.key" :title="tool.label">
          <a-button type="text" size="small" :aria-label="tool.label" @click="applyTool(tool)">
            <component :is="tool.icon" />
          </a-button>
        </a-tooltip>

        <a-popover trigger="click" placement="bottomLeft">
          <template #content>
            <div class="face-grid">
              <button v-for="face in faces" :key="face.name" type="button" @click="insertFace(face)">
                <img v-if="face.url" :src="face.url" :alt="face.name" />
                <span v-else>{{ face.name }}</span>
              </button>
            </div>
          </template>
          <a-tooltip title="插入表情">
            <a-button type="text" size="small" aria-label="插入表情">
              <SmileOutlined />
            </a-button>
          </a-tooltip>
        </a-popover>

        <a-tooltip title="添加附件">
          <a-button type="text" size="small" aria-label="添加附件" :loading="uploading" @click="chooseFile">
            <PaperClipOutlined />
          </a-button>
        </a-tooltip>
        <input ref="fileInput" class="file-input" type="file" @change="uploadSelectedFile" />
      </div>

      <a-button type="text" size="small" :loading="previewing" @click="showPreview">
        <EyeOutlined /> 预览
      </a-button>
    </div>

    <a-textarea
      ref="textareaRef"
      :value="editorValue"
      :disabled="disabled"
      :auto-size="{ minRows, maxRows }"
      :placeholder="placeholder"
      @paste="handlePaste"
      @update:value="updateBody"
    />

    <div class="editor-footer">
      <span>{{ mode === 'markdown' ? 'Markdown' : 'UBB' }}</span>
      <span>{{ editorValue.length }} 字</span>
    </div>

    <a-modal v-model:open="previewOpen" title="内容预览" :footer="null" :width="760">
      <a-empty v-if="!previewHtml" description="没有可预览的内容" />
      <RichContent v-else :html="previewHtml" />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BoldOutlined,
  CodeOutlined,
  EyeOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PictureOutlined,
  SmileOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import RichContent from './RichContent.vue'
import { forumApi } from '../services/forum'

const MARKDOWN_PREFIX = '<!-- markdown -->\n'
const MARKDOWN_PATTERN = /^(?:<!--\s*markdown\s*-->|<!md>)(?:\r?\n)?/i
const DEFAULT_FACES = ['冷', '哈哈', '开心', '滑稽', '疑问', '真棒', '泪', '怒', '惊讶', '汗', '酷', '睡觉']

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  minRows: { type: Number, default: 7 },
  maxRows: { type: Number, default: 20 },
  placeholder: { type: String, default: '写点什么吧……' },
})

const emit = defineEmits(['update:modelValue'])
const mode = ref(MARKDOWN_PATTERN.test(props.modelValue) ? 'markdown' : 'ubb')
const textareaRef = ref()
const fileInput = ref()
const uploading = ref(false)
const previewing = ref(false)
const previewOpen = ref(false)
const previewHtml = ref('')
const faces = ref(DEFAULT_FACES.map((name) => ({ name, url: '' })))
const modeOptions = [
  { label: 'UBB', value: 'ubb' },
  { label: 'Markdown', value: 'markdown' },
]

const formatTools = computed(() => [
  { key: 'bold', label: '加粗', icon: markRaw(BoldOutlined), ubb: ['[b]', '[/b]'], md: ['**', '**'] },
  { key: 'italic', label: '斜体', icon: markRaw(ItalicOutlined), ubb: ['[i]', '[/i]'], md: ['*', '*'] },
  { key: 'link', label: '链接', icon: markRaw(LinkOutlined), ubb: ['[url=https://]', '[/url]'], md: ['[', '](https://)'] },
  { key: 'image', label: '图片', icon: markRaw(PictureOutlined), ubb: ['《图片：', '》'], md: ['![图片](', ')'] },
  { key: 'code', label: '代码', icon: markRaw(CodeOutlined), ubb: ['[code]', '[/code]'], md: ['```\n', '\n```'] },
  { key: 'ordered', label: '有序列表', icon: markRaw(OrderedListOutlined), line: '1. ' },
  { key: 'unordered', label: '无序列表', icon: markRaw(UnorderedListOutlined), line: '- ' },
])

const editorValue = computed(() => String(props.modelValue || '').replace(MARKDOWN_PATTERN, ''))

function serialized(body, nextMode = mode.value) {
  return nextMode === 'markdown' ? `${MARKDOWN_PREFIX}${body}` : body
}

function updateBody(value) {
  emit('update:modelValue', serialized(value))
}

function setMode(nextMode) {
  if (nextMode === mode.value) return
  mode.value = nextMode
  emit('update:modelValue', serialized(editorValue.value, nextMode))
}

function nativeTextarea() {
  return textareaRef.value?.resizableTextArea?.textArea || textareaRef.value?.$el?.querySelector('textarea')
}

function insertText(before, after = '', fallback = '') {
  const input = nativeTextarea()
  const body = editorValue.value
  const start = input?.selectionStart ?? body.length
  const end = input?.selectionEnd ?? start
  const selected = body.slice(start, end) || fallback
  const nextBody = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`
  emit('update:modelValue', serialized(nextBody))

  nextTick(() => {
    const textarea = nativeTextarea()
    const cursorStart = start + before.length
    textarea?.focus()
    textarea?.setSelectionRange(cursorStart, cursorStart + selected.length)
  })
}

function applyTool(tool) {
  if (tool.line) {
    const input = nativeTextarea()
    const body = editorValue.value
    const start = input?.selectionStart ?? body.length
    const lineStart = body.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const prefix = mode.value === 'markdown' ? tool.line : tool.key === 'ordered' ? '[list=1]\n[*]' : '[list]\n[*]'
    const suffix = mode.value === 'markdown' ? '' : '\n[/list]'
    const nextBody = `${body.slice(0, lineStart)}${prefix}${body.slice(lineStart)}${suffix}`
    emit('update:modelValue', serialized(nextBody))
    return
  }
  const [before, after] = mode.value === 'markdown' ? tool.md : tool.ubb
  insertText(before, after, tool.key === 'image' ? 'https://' : '文字')
}

function insertFace(face) {
  insertText(`{${face.name}}`)
}

function chooseFile() {
  fileInput.value?.click()
}

function fileLabel(file) {
  const bytes = Number(file.size || 0)
  const size = bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${file.name}（${size}）`
}

async function uploadSelectedFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  await uploadFile(file)
}

async function uploadFile(file) {
  if (uploading.value) return

  uploading.value = true
  try {
    const result = await forumApi.uploadFile(file)
    if (result.success === false || !result.url) throw new Error(result.notice || '附件上传失败')
    const fallback = file.type.startsWith('image/')
      ? `《图片：${result.url}，${fileLabel(file)}》`
      : `《链接：${result.url}，${fileLabel(file)}》`
    insertText(result.content || fallback)
    message.success('附件已插入')
  } catch (reason) {
    message.error(reason?.message || '附件上传失败')
  } finally {
    uploading.value = false
  }
}

function handlePaste(event) {
  const file = Array.from(event.clipboardData?.items || [])
    .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile()
  if (!file) return
  event.preventDefault()
  uploadFile(file)
}

async function showPreview() {
  if (!props.modelValue.trim()) {
    previewHtml.value = ''
    previewOpen.value = true
    return
  }

  previewing.value = true
  try {
    const result = await forumApi.parseContent(props.modelValue)
    previewHtml.value = result.values?.[0] || ''
    previewOpen.value = true
  } catch (reason) {
    message.error(reason?.message || '预览生成失败')
  } finally {
    previewing.value = false
  }
}

function collectFaces(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectFaces(item, output))
    return output
  }
  if (!value || typeof value !== 'object') return output

  const name = value.name || value.face || value.title
  const url = value.url || value.src || value.path
  if (name) output.push({ name: String(name), url: String(url || '') })
  else Object.entries(value).forEach(([key, item]) => {
    if (typeof item === 'string' && /^(?:https?:|\/)/.test(item)) output.push({ name: key, url: item })
    else collectFaces(item, output)
  })
  return output
}

onMounted(async () => {
  try {
    const result = await forumApi.getFaces()
    const loaded = collectFaces(result)
    if (loaded.length) faces.value = loaded.slice(0, 80)
  } catch {
    // 默认表情名称仍可生成有效 UBB。
  }
})

watch(() => props.modelValue, (value) => {
  const nextMode = MARKDOWN_PATTERN.test(value) ? 'markdown' : 'ubb'
  if (mode.value !== nextMode) mode.value = nextMode
})
</script>

<style scoped>
.content-editor {
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--surface);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-soft);
  gap: 8px;
}

.format-tools {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 1px;
}

.format-tools :deep(.ant-btn) {
  width: 30px;
  height: 30px;
  padding: 0;
}

.content-editor :deep(.ant-input) {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  resize: vertical;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  color: var(--muted-soft);
  font-size: 11px;
  border-top: 1px solid var(--line-soft);
}

.face-grid {
  display: grid;
  grid-template-columns: repeat(6, 36px);
  max-height: 230px;
  overflow-y: auto;
  gap: 4px;
}

.face-grid button {
  display: grid;
  width: 36px;
  height: 36px;
  overflow: hidden;
  place-items: center;
  padding: 2px;
  color: var(--text-subtle);
  font-size: 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.face-grid button:hover {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.face-grid img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.file-input {
  display: none;
}

@media (max-width: 620px) {
  .editor-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .format-tools {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }
}
</style>
