<template>
  <a-card class="surface-card publish-card" :bordered="false">
    <div class="page-heading">
      <div>
        <h1>发布帖子</h1>
        <p>选择合适的版块，写下想和大家分享的内容。</p>
      </div>
      <a-button @click="router.back()">取消</a-button>
    </div>

    <PageState :loading="loadingForums" :error="loadError" @retry="loadForums">
      <a-form ref="formRef" :model="form" layout="vertical" @finish="confirmPublish">
        <a-form-item
          label="发布版块"
          name="forumId"
          :rules="[{ required: true, message: '请选择发布版块' }]"
        >
          <a-tree-select
            v-model:value="form.forumId"
            :tree-data="forumTree"
            tree-default-expand-all
            show-search
            allow-clear
            tree-node-filter-prop="label"
            placeholder="选择一个可发帖的版块"
          />
        </a-form-item>

        <a-form-item
          label="帖子标题"
          name="title"
          :rules="[
            { required: true, message: '请输入帖子标题' },
            { min: 2, message: '标题至少 2 个字' },
          ]"
        >
          <a-input
            v-model:value="form.title"
            allow-clear
            :maxlength="100"
            show-count
            placeholder="一句话说明你想讨论的内容"
          />
        </a-form-item>

        <a-form-item
          label="正文"
          name="content"
          :rules="[{ required: true, message: '请输入帖子正文' }]"
        >
          <a-textarea
            v-model:value="form.content"
            :auto-size="{ minRows: 12, maxRows: 24 }"
            placeholder="写点什么吧……基础版支持纯文本和服务器可识别的 UBB 内容。"
          />
        </a-form-item>

        <a-alert
          class="publish-tip"
          type="info"
          show-icon
          message="帖子在审核通过前，可能只有你自己可以看到。图片、附件和表情编辑将在下一阶段补充。"
        />

        <a-alert v-if="submitError" class="publish-error" type="error" show-icon :message="submitError" />

        <div class="publish-actions">
          <a-button @click="router.back()">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="submitting">
            <template #icon><SendOutlined /></template>
            确认发布
          </a-button>
        </div>
      </a-form>
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import { forumApi } from '../services/forum'

const router = useRouter()
const formRef = ref()
const form = reactive({ forumId: undefined, title: '', content: '' })
const forumTree = ref([])
const loadingForums = ref(true)
const loadError = ref('')
const submitError = ref('')
const submitting = ref(false)

function mapForums(items = [], parents = []) {
  return items.map((item) => {
    const path = [...parents, item.name].filter(Boolean)
    const disabled = Number(item.notopic) === 1
    return {
      value: String(item.id),
      label: path.join(' / '),
      title: item.name,
      selectable: !disabled,
      children: mapForums(item.child || [], path),
    }
  })
}

async function loadForums() {
  loadingForums.value = true
  loadError.value = ''
  try {
    const result = await forumApi.getForums()
    forumTree.value = mapForums(result.forums || [])
  } catch (reason) {
    loadError.value = reason?.message || '版块列表加载失败'
  } finally {
    loadingForums.value = false
  }
}

function confirmPublish() {
  Modal.confirm({
    title: '确定发布帖子吗？',
    content: '帖子在审核通过前可能只有你自己可以看到。',
    okText: '确认发布',
    cancelText: '再检查一下',
    onOk: publish,
  })
}

async function publish() {
  submitting.value = true
  submitError.value = ''
  try {
    const access = await forumApi.getPublishToken(form.forumId)
    if (!access?.token) throw new Error(access?.notice || '未能取得发布凭证')

    const result = await forumApi.publishTopic(form.forumId, {
      title: form.title.trim(),
      content: form.content,
      token: access.token,
    })
    if (result?.success === false) throw new Error(result.notice || '发布失败')

    message.success('帖子已提交')
    const topicId = result?.topic_id || result?.id || result?.tMeta?.id
    if (topicId) router.replace({ name: 'topic', params: { id: topicId } })
    else router.replace('/')
  } catch (reason) {
    submitError.value = reason?.message || '发布帖子失败，请稍后重试'
    throw reason
  } finally {
    submitting.value = false
  }
}

onMounted(loadForums)
</script>

<style scoped>
.publish-card :deep(.ant-card-body) {
  padding: 28px 30px;
}

.publish-tip,
.publish-error {
  margin-bottom: 20px;
}

.publish-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 620px) {
  .publish-card :deep(.ant-card-body) {
    padding: 22px 18px;
  }
}
</style>
