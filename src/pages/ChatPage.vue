<template>
  <a-card class="surface-card feature-card" :bordered="false">
    <div class="page-heading">
      <div>
        <h1><CommentOutlined /> 公共聊天室</h1>
        <p>选择房间，看看大家正在聊什么。</p>
      </div>
      <a-button :loading="loading" @click="loadRooms"><ReloadOutlined /> 刷新</a-button>
    </div>

    <PageState
      :loading="loading"
      :error="error"
      :empty="!loading && !error && rooms.length === 0"
      empty-text="暂时没有可用聊天室"
      @retry="loadRooms"
    >
      <a-list class="room-list" :data-source="rooms">
        <template #renderItem="{ item }">
          <a-list-item class="room-row" @click="showComingSoon(item)">
            <a-list-item-meta :title="item.name || '公共聊天室'" description="公共聊天室">
              <template #avatar>
                <a-avatar :size="46" class="room-avatar"><CommentOutlined /></a-avatar>
              </template>
            </a-list-item-meta>
            <div class="room-time">{{ formatTime(item.ztime) }}</div>
            <RightOutlined />
          </a-list-item>
        </template>
      </a-list>
      <a-alert
        class="stage-notice"
        type="info"
        show-icon
        message="聊天室房间列表已接入；实时消息页将在下一阶段继续开发。"
      />
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CommentOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import { forumApi } from '../services/forum'
import { formatTime } from '../utils/date'

const rooms = ref([])
const loading = ref(true)
const error = ref('')

async function loadRooms() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getChatRooms()
    rooms.value = result.chatRomList || []
  } catch (reason) {
    error.value = reason?.message || '聊天室加载失败'
  } finally {
    loading.value = false
  }
}

function showComingSoon(item) {
  message.info(`${item.name || '该聊天室'}的消息页正在开发中`)
}

onMounted(loadRooms)
</script>

<style scoped>
.feature-card :deep(.ant-card-body) {
  padding: 26px;
}

.page-heading h1 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.room-list {
  overflow: hidden;
  border: 1px solid #e5ecea;
  border-radius: 12px;
}

.room-row {
  padding: 17px 19px !important;
  cursor: pointer;
}

.room-row:hover {
  background: #f6fbfa;
}

.room-avatar {
  color: #178f80;
  background: #e3f3ef;
}

.room-time {
  margin-right: 14px;
  color: #8a9895;
  font-size: 12px;
}

.stage-notice {
  margin-top: 18px;
}
</style>
