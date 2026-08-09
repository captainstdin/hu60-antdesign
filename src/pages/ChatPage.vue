<template>
  <a-card class="surface-card feature-card" :bordered="false">
    <div class="page-heading">
      <div>
        <h1><CommentOutlined /> 聊天室</h1>
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
          <a-list-item
            class="room-row"
            role="link"
            tabindex="0"
            @click="openRoom(item)"
            @keydown.enter.self="openRoom(item)"
          >
            <a-list-item-meta :title="roomName(item)" :description="roomDescription(item)">
              <template #avatar>
                <a-avatar :size="44" class="room-avatar"><CommentOutlined /></a-avatar>
              </template>
            </a-list-item-meta>
            <a-badge v-if="roomUnread(item)" :count="roomUnread(item)" />
            <span class="room-time">{{ formatTime(item.ztime || item.ctime) }}</span>
            <RightOutlined />
          </a-list-item>
        </template>
      </a-list>
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CommentOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import { forumApi } from '../services/forum'
import { formatTime } from '../utils/date'

const router = useRouter()
const rooms = ref([])
const loading = ref(true)
const error = ref('')

function roomName(item) {
  return item.name || item.room || item.chatRoom || '公共聊天室'
}

function roomDescription(item) {
  return item.description || item.notice || '公共聊天室'
}

function roomUnread(item) {
  return Number(item.newChats || item.unread || item.new_count || 0)
}

async function loadRooms() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getChatRooms()
    rooms.value = result.chatRomList || result.chatRoomList || result.rooms || []
  } catch (reason) {
    error.value = reason?.message || '聊天室加载失败'
  } finally {
    loading.value = false
  }
}

function openRoom(item) {
  router.push({ name: 'chat-room', params: { room: roomName(item) } })
}

onMounted(loadRooms)
</script>

<style scoped>
.feature-card :deep(.ant-card-body) {
  padding: 25px;
}

.page-heading h1 {
  display: flex;
  align-items: center;
  gap: 9px;
}

.room-list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.room-row {
  padding: 15px 17px !important;
  cursor: pointer;
}

.room-row:hover,
.room-row:focus-visible {
  background: var(--surface-hover);
  outline: none;
}

.room-avatar {
  color: var(--brand);
  background: var(--brand-soft);
}

.room-time {
  margin: 0 14px;
  color: var(--muted);
  font-size: 12px;
}
</style>
