<template>
  <a-list class="topic-list" :data-source="topics" item-layout="horizontal">
    <template #renderItem="{ item }">
      <a-list-item
        class="topic-row"
        role="link"
        tabindex="0"
        @click="openTopic(item)"
        @keydown.enter="openTopic(item)"
      >
        <a-list-item-meta>
          <template #avatar>
            <UserAvatar :avatar="item._u_avatar" :uid="item.uid" :size="46" />
          </template>
          <template #title>
            <div class="topic-title-line">
              <a-tag v-if="Number(item.essence) === 1" color="red">精华</a-tag>
              <span class="topic-title">{{ item.title || '无标题帖子' }}</span>
            </div>
          </template>
          <template #description>
            <div class="topic-meta">
              <button class="author-link" type="button" @click.stop="openUser(item)">
                {{ item.uinfo?.name || item._u_name || `UID ${item.uid || '--'}` }}
              </button>
              <a-tag v-if="item.forum_name" class="forum-tag" color="cyan">{{ item.forum_name }}</a-tag>
              <span><ClockCircleOutlined /> {{ formatTime(item.ctime) }}</span>
            </div>
          </template>
        </a-list-item-meta>

        <div class="topic-counts" aria-label="帖子统计">
          <span><EyeOutlined /> {{ item.read_count ?? 0 }}</span>
          <span><MessageOutlined /> {{ item.reply_count ?? 0 }}</span>
        </div>
        <RightOutlined class="row-arrow" />
      </a-list-item>
    </template>
  </a-list>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  ClockCircleOutlined,
  EyeOutlined,
  MessageOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import UserAvatar from './UserAvatar.vue'
import { formatTime } from '../utils/date'

defineProps({
  topics: { type: Array, default: () => [] },
})

const router = useRouter()

function topicId(item) {
  return item.topic_id || item.id
}

function openTopic(item) {
  const id = topicId(item)
  if (id) router.push({ name: 'topic', params: { id } })
}

function openUser(item) {
  if (item.uid) router.push({ name: 'user', params: { uid: item.uid } })
}
</script>
