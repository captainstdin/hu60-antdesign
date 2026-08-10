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

        <a-tooltip title="压缩并上传图片">
          <a-button
            type="text"
            size="small"
            aria-label="压缩并上传图片"
            :disabled="disabled"
            @click="openImageUploader"
          >
            <PictureOutlined />
          </a-button>
        </a-tooltip>

        <a-tooltip title="上传任意文件">
          <a-button
            type="text"
            size="small"
            aria-label="上传任意文件"
            :disabled="disabled"
            :loading="uploading"
            @click="chooseFile"
          >
            <UploadOutlined />
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

    <a-modal
      :open="imageModalOpen"
      :width="560"
      :closable="!imageUploading"
      :mask-closable="!imageUploading"
      @cancel="closeImageUploader"
    >
      <template #title>
        <span class="image-modal-title">
          上传图片
          <a-tooltip title="图片会在浏览器中重新编码并移除 EXIF、GPS 等元信息；动图会转为静态图。">
            <InfoCircleOutlined class="privacy-tip" tabindex="0" />
          </a-tooltip>
        </span>
      </template>

      <div class="image-upload-content">
        <div class="image-upload-editor">
          <div class="image-preview">
            <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="待上传图片预览" />
            <div v-else class="image-preview-empty">
              <PictureOutlined />
              <span>{{ imageCompressing ? '正在压缩…' : '尚未选择图片' }}</span>
            </div>
          </div>

          <div class="image-upload-controls">
            <a-button :disabled="imageUploading" @click="chooseImage">
              <PictureOutlined />
              {{ selectedImageFile ? '重新选择' : '选择图片' }}
            </a-button>
            <input
              ref="imageInput"
              class="file-input"
              type="file"
              accept="image/*"
              @change="selectImageFile"
            />

            <div v-if="selectedImageFile" class="image-file-name" :title="selectedImageFile.name">
              {{ selectedImageFile.name }}
            </div>

            <div class="image-quality">
              <div class="image-quality-label">
                <span>压缩质量</span>
                <strong>{{ imageQuality }}%</strong>
              </div>
              <a-slider
                :value="imageQuality"
                :min="10"
                :max="100"
                :step="5"
                :disabled="!selectedImageFile || imageUploading"
                @change="changeImageQuality"
                @after-change="compressSelectedImage"
              />
            </div>

            <div v-if="compressedImageFile" class="image-file-stats">
              <span>原图 {{ formatFileSize(selectedImageFile.size) }}</span>
              <span>压缩后 {{ formatFileSize(compressedImageFile.size) }}</span>
              <span>{{ imageDimensions.width }} × {{ imageDimensions.height }}</span>
            </div>
          </div>
        </div>

        <a-progress
          v-if="imageUploading || imageUploadProgress > 0"
          :percent="imageUploadProgress"
          :status="imageProgressStatus"
          size="small"
        />

        <div v-if="uploadedImageUbb" class="generated-ubb">
          <label for="uploaded-image-ubb">已生成 UBB</label>
          <a-textarea id="uploaded-image-ubb" :value="uploadedImageUbb" :rows="3" readonly />
        </div>
      </div>

      <template #footer>
        <a-button :disabled="imageUploading" @click="closeImageUploader">取消</a-button>
        <a-button
          v-if="!uploadedImageUbb"
          type="primary"
          :loading="imageUploading"
          :disabled="!compressedImageFile || imageCompressing"
          @click="uploadCompressedImage"
        >
          上传图片
        </a-button>
        <a-button v-else type="primary" @click="insertUploadedImage">插入内容</a-button>
      </template>
    </a-modal>

    <a-modal v-model:open="previewOpen" title="内容预览" :footer="null" :width="760">
      <a-empty v-if="!previewHtml" description="没有可预览的内容" />
      <RichContent v-else :html="previewHtml" />
    </a-modal>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BoldOutlined,
  CodeOutlined,
  EyeOutlined,
  FileImageOutlined,
  InfoCircleOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  SmileOutlined,
  UnorderedListOutlined,
  UploadOutlined,
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
const imageInput = ref()
const uploading = ref(false)
const imageModalOpen = ref(false)
const imageCompressing = ref(false)
const imageUploading = ref(false)
const imageUploadFailed = ref(false)
const imageUploadProgress = ref(0)
const imageQuality = ref(80)
const selectedImageFile = ref()
const compressedImageFile = ref()
const imagePreviewUrl = ref('')
const uploadedImageUbb = ref('')
const imageDimensions = ref({ width: 0, height: 0 })
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
  { key: 'imageUbb', label: '插入图片 UBB', icon: markRaw(FileImageOutlined), ubb: ['《图片：', '》'], md: ['![图片](', ')'] },
  { key: 'code', label: '代码', icon: markRaw(CodeOutlined), ubb: ['[code]', '[/code]'], md: ['```\n', '\n```'] },
  { key: 'ordered', label: '有序列表', icon: markRaw(OrderedListOutlined), line: '1. ' },
  { key: 'unordered', label: '无序列表', icon: markRaw(UnorderedListOutlined), line: '- ' },
])

const editorValue = computed(() => String(props.modelValue || '').replace(MARKDOWN_PATTERN, ''))
const imageProgressStatus = computed(() => {
  if (imageUploadFailed.value) return 'exception'
  if (imageUploading.value) return 'active'
  if (uploadedImageUbb.value) return 'success'
  return 'normal'
})

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
  insertText(before, after, tool.key === 'imageUbb' ? 'https://' : '文字')
}

function insertFace(face) {
  insertText(`{${face.name}}`)
}

let imageCompressionVersion = 0

function clearImagePreview() {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = ''
}

function resetImageUploader() {
  imageCompressionVersion += 1
  clearImagePreview()
  imageQuality.value = 80
  imageCompressing.value = false
  imageUploading.value = false
  imageUploadFailed.value = false
  imageUploadProgress.value = 0
  selectedImageFile.value = undefined
  compressedImageFile.value = undefined
  uploadedImageUbb.value = ''
  imageDimensions.value = { width: 0, height: 0 }
  if (imageInput.value) imageInput.value.value = ''
}

function openImageUploader() {
  resetImageUploader()
  imageModalOpen.value = true
}

function closeImageUploader() {
  if (imageUploading.value) return
  imageModalOpen.value = false
  resetImageUploader()
}

function chooseImage() {
  imageInput.value?.click()
}

async function selectImageFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件')
    return
  }

  selectedImageFile.value = file
  await compressSelectedImage()
}

function changeImageQuality(value) {
  imageQuality.value = Number(value)
  imageUploadFailed.value = false
  imageUploadProgress.value = 0
  uploadedImageUbb.value = ''
}

async function decodeImage(file) {
  if (typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      }
    } catch {
      // 部分图片格式只能通过浏览器图片元素解码。
    }
  }

  const sourceUrl = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(sourceUrl),
    })
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(new Error('浏览器无法读取这张图片'))
    }
    image.src = sourceUrl
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function compressedImageName(file, type) {
  const stem = file.name.replace(/\.[^.]+$/, '') || 'image'
  const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'
  return `${stem}.${extension}`
}

async function compressImage(file, quality) {
  const decoded = await decodeImage(file)
  try {
    if (!decoded.width || !decoded.height) throw new Error('图片尺寸无效')

    const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
    const canvas = document.createElement('canvas')
    canvas.width = decoded.width
    canvas.height = decoded.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持图片压缩')

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(decoded.source, 0, 0, decoded.width, decoded.height)

    const blob = await canvasToBlob(canvas, outputType, quality / 100)
    canvas.width = 0
    canvas.height = 0
    if (!blob) throw new Error('图片压缩失败')

    return {
      file: new File([blob], compressedImageName(file, blob.type), {
        type: blob.type,
        lastModified: Date.now(),
      }),
      width: decoded.width,
      height: decoded.height,
    }
  } finally {
    decoded.cleanup()
  }
}

async function compressSelectedImage() {
  const sourceFile = selectedImageFile.value
  if (!sourceFile) return

  const version = ++imageCompressionVersion
  imageCompressing.value = true
  imageUploadFailed.value = false
  imageUploadProgress.value = 0
  uploadedImageUbb.value = ''
  compressedImageFile.value = undefined
  clearImagePreview()

  try {
    const compressed = await compressImage(sourceFile, imageQuality.value)
    if (version !== imageCompressionVersion) return

    compressedImageFile.value = compressed.file
    imageDimensions.value = { width: compressed.width, height: compressed.height }
    imagePreviewUrl.value = URL.createObjectURL(compressed.file)
  } catch (reason) {
    if (version === imageCompressionVersion) message.error(reason?.message || '图片压缩失败')
  } finally {
    if (version === imageCompressionVersion) imageCompressing.value = false
  }
}

async function uploadCompressedImage() {
  const file = compressedImageFile.value
  if (!file || imageCompressing.value || imageUploading.value) return

  imageUploading.value = true
  imageUploadFailed.value = false
  imageUploadProgress.value = 0
  try {
    const result = await forumApi.uploadFile(file, {
      onUploadProgress({ percent }) {
        if (Number.isFinite(percent)) imageUploadProgress.value = percent
      },
    })
    if (result.success === false || !result.url) throw new Error(result.notice || '图片上传失败')

    uploadedImageUbb.value = result.content || `《图片：${result.url}，${fileLabel(file)}》`
    imageUploadProgress.value = 100
    message.success('图片上传成功')
  } catch (reason) {
    imageUploadFailed.value = true
    message.error(reason?.message || '图片上传失败')
  } finally {
    imageUploading.value = false
  }
}

function insertUploadedImage() {
  if (!uploadedImageUbb.value) return
  insertText(uploadedImageUbb.value)
  closeImageUploader()
}

function chooseFile() {
  fileInput.value?.click()
}

function formatFileSize(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileLabel(file) {
  return `${file.name}（${formatFileSize(file.size)}）`
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

onBeforeUnmount(() => {
  imageCompressionVersion += 1
  clearImagePreview()
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

.image-modal-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.privacy-tip {
  color: var(--muted-soft);
  font-size: 14px;
  cursor: help;
}

.image-upload-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-upload-editor {
  display: grid;
  grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.image-preview {
  display: grid;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-soft);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--muted-soft);
  font-size: 12px;
  gap: 8px;
}

.image-preview-empty :deep(.anticon) {
  font-size: 28px;
}

.image-upload-controls {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.image-upload-controls > .ant-btn {
  align-self: flex-start;
}

.image-file-name {
  overflow: hidden;
  color: var(--text-subtle);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-quality-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-subtle);
  font-size: 12px;
}

.image-file-stats {
  display: grid;
  color: var(--muted-soft);
  font-size: 12px;
  gap: 3px;
}

.generated-ubb {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.generated-ubb label {
  color: var(--text-subtle);
  font-size: 12px;
}

@media (max-width: 620px) {
  .editor-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .format-tools {
    order: 3;
    flex: 1 0 100%;
    flex-wrap: wrap;
    width: 100%;
  }

  .image-upload-editor {
    grid-template-columns: 1fr;
  }

  .image-preview {
    max-height: 220px;
  }
}
</style>
