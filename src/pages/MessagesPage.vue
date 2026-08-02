<template>
  <a-card class="surface-card messages-card" :bordered="false">
    <div class="page-heading">
      <div>
        <h1><MailOutlined /> 内信</h1>
        <p>查看社区通知和用户之间的站内消息。</p>
      </div>
      <a-button :loading="loading" @click="loadOverview"><ReloadOutlined /> 刷新</a-button>
    </div>

    <PageState :loading="loading" :error="error" @retry="loadOverview">
      <div class="message-overview">
        <button type="button" class="message-tile active-tile" @click="comingSoon('未读信件')">
          <span class="tile-icon"><BellOutlined /></span>
          <span>
            <strong>未读信件</strong>
            <small>需要你关注的新消息</small>
          </span>
          <a-badge :count="overview.newMsg || 0" :show-zero="true" />
        </button>

        <button type="button" class="message-tile" @click="comingSoon('已读信件')">
          <span class="tile-icon"><ReadOutlined /></span>
          <span><strong>已读信件</strong><small>查看已经读过的消息</small></span>
          <RightOutlined />
        </button>

        <button type="button" class="message-tile" @click="comingSoon('全部信件')">
          <span class="tile-icon"><InboxOutlined /></span>
          <span><strong>全部信件</strong><small>完整的内信记录</small></span>
          <RightOutlined />
        </button>

        <button type="button" class="message-tile" @click="comingSoon('发送内信')">
          <span class="tile-icon"><SendOutlined /></span>
          <span><strong>发送内信</strong><small>给社区用户写一封信</small></span>
          <RightOutlined />
        </button>
      </div>

      <a-alert
        class="stage-notice"
        type="info"
        show-icon
        message="未读计数已接入；信件列表、会话详情和发送内信将在后续模块补全。"
      />
    </PageState>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  BellOutlined,
  InboxOutlined,
  MailOutlined,
  ReadOutlined,
  ReloadOutlined,
  RightOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import PageState from '../components/PageState.vue'
import { forumApi } from '../services/forum'

const overview = reactive({ newMsg: 0, newAtInfo: 0 })
const loading = ref(true)
const error = ref('')

async function loadOverview() {
  loading.value = true
  error.value = ''
  try {
    const result = await forumApi.getMessageOverview()
    Object.assign(overview, result._myself || result)
  } catch (reason) {
    error.value = reason?.message || '内信状态加载失败'
  } finally {
    loading.value = false
  }
}

function comingSoon(name) {
  message.info(`${name}模块正在开发中`)
}

onMounted(loadOverview)
</script>

<style scoped>
.messages-card :deep(.ant-card-body) {
  padding: 26px;
}

.page-heading h1 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.message-overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.message-tile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 18px;
  text-align: left;
  border: 1px solid #e3ebe9;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}

.message-tile:hover {
  border-color: #8fc8c0;
  background: #f8fcfb;
}

.tile-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #178f80;
  font-size: 18px;
  border-radius: 12px;
  background: #e8f5f2;
}

.message-tile > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.message-tile strong {
  color: #344b47;
  font-size: 14px;
}

.message-tile small {
  margin-top: 3px;
  color: #8a9895;
  font-size: 11px;
}

.stage-notice {
  margin-top: 18px;
}

@media (max-width: 620px) {
  .message-overview {
    grid-template-columns: 1fr;
  }
}
</style>
