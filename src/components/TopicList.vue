<template>
  <a-list class="classic-topic-list" :data-source="topics">
    <template #renderItem="{ item }">
      <a-list-item
        class="classic-topic-row"
        role="link"
        tabindex="0"
        @click="openTopic(item)"
        @keydown.enter.self="openTopic(item)"
      >
        <div class="classic-author" @click.stop>
          <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="36" shape="square" />
          <button type="button" @click="openUser(item)">
            {{ authorName(item) }}
          </button>
        </div>

        <div class="classic-topic-main">
          <div class="classic-title-line">
            <span class="classic-title">{{ item.title || item.topic?.title || '无标题帖子' }}</span>
          </div>
          <div class="classic-meta">
            <span>{{ item.read_count ?? item.topic?.read_count ?? 0 }} 点击</span>
            <span>/</span>
            <span>{{ formatTime(item.topic?.ctime || item.ctime) }}发布</span>
            <span>/</span>
            <span>{{ item.reply_count ?? item.topic?.reply_count ?? 0 }} 评论</span>
          </div>
        </div>

        <div class="classic-replies" aria-label="回复数">
          <strong>{{ item.reply_count ?? item.topic?.reply_count ?? 0 }}</strong>
          <span>回复</span>
        </div>

        <span class="classic-forum">{{ item.forum_name || item.topic?.forum_name || '综合讨论' }}</span>
      </a-list-item>
    </template>
  </a-list>
</template>

<script setup>
import { useRouter } from 'vue-router'
import UserAvatar from './UserAvatar.vue'
import { formatTime } from '../utils/date'

defineProps({
  topics: { type: Array, default: () => [] },
})

const router = useRouter()

function topicId(item) {
  return item.topic_id || item.id
}

function authorName(item) {
  return item.uinfo?.name || item._u_name || `UID ${item.uid || '--'}`
}

function openTopic(item) {
  const id = topicId(item)
  if (!id) return
  const floor = item.floor ?? item.floor_num
  router.push({
    name: 'topic',
    params: { id },
    hash: floor !== undefined ? `#floor-${floor}` : '',
  })
}

function openUser(item) {
  if (item.uid) router.push({ name: 'user', params: { uid: item.uid } })
}
</script>

<style scoped>
.classic-topic-list :deep(.ant-list-items) {
  overflow: hidden;
}

.classic-topic-row {
  display: grid !important;
  grid-template-columns: 150px minmax(0, 1fr) 72px 120px;
  min-height: 64px;
  padding: 7px 18px !important;
  cursor: pointer;
  transition: background-color 0.15s ease;
  gap: 0 16px;
}

.classic-topic-row:hover,
.classic-topic-row:focus-visible {
  background: #f6fbfa;
  outline: none;
}

.classic-author {
  display: flex;
  flex-direction: column;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.classic-author button {
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  color: #677572;
  border: 0;
  background: transparent;
  font-size: 12px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.classic-author button:hover,
.classic-author button:focus-visible {
  color: var(--brand);
  text-decoration: underline;
  outline: none;
}

.classic-topic-main {
  align-self: center;
  min-width: 0;
}

.classic-title-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.classic-title {
  overflow: hidden;
  color: #237f9f;
  font-size: 15px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.classic-meta {
  display: flex;
  align-items: center;
  margin-top: 3px;
  color: #929c9a;
  font-size: 11px;
  gap: 4px;
}

.classic-replies {
  display: flex;
  align-self: center;
  flex-direction: column;
  color: #8d9896;
  text-align: center;
}

.classic-replies strong {
  font-size: 20px;
  font-weight: 400;
  line-height: 1.15;
}

.classic-replies span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.classic-forum {
  overflow: hidden;
  align-self: center;
  color: #7c8785;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .classic-topic-row {
    grid-template-columns: 56px minmax(0, 1fr) 46px;
    min-height: 66px;
    padding: 8px 12px !important;
    gap: 0 9px;
  }

  .classic-forum {
    display: none;
  }

  .classic-author button {
    font-size: 11px;
  }

  .classic-title {
    font-size: 12px;
  }

  .classic-replies strong {
    font-size: 17px;
  }
}

@media (max-width: 460px) {
  .classic-topic-row {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .classic-replies {
    display: none;
  }

  .classic-meta {
    overflow: hidden;
    white-space: nowrap;
  }
}
</style>
