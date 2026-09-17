import { reactive, readonly } from 'vue'

/**
 * AI 助手与当前页面之间的数据桥。
 *
 * 页面负责把已经取到的数据塞进来（帖子正文、楼层、首页列表），
 * AI 弹窗只读取这里的数据，不重复请求接口。
 * 回复框相关的操作由帖子详情页注册成 bridge，弹窗通过它读写草稿、发送评论。
 */

let currentBridge = null

const state = reactive({
  page: '',
  topic: null,
  mainPost: '',
  floors: [],
  homeTopics: [],
  ready: false,
})

export const aiContext = {
  state: readonly(state),

  setTopic({ topic, mainPost, floors }) {
    state.page = 'topic'
    state.topic = topic || null
    state.mainPost = mainPost || ''
    state.floors = Array.isArray(floors) ? floors : []
    state.ready = Boolean(topic)
  },

  setHomeTopics(topics) {
    state.page = 'home'
    state.homeTopics = Array.isArray(topics) ? topics : []
    state.ready = true
  },

  /** 只清理自己写进去的数据，避免页面切换时误清另一个页面的上下文。 */
  reset(page) {
    if (page && state.page !== page) return
    state.page = ''
    state.topic = null
    state.mainPost = ''
    state.floors = []
    state.homeTopics = []
    state.ready = false
  },

  registerReplyBridge(bridge) {
    currentBridge = bridge
  },

  releaseReplyBridge(bridge) {
    if (currentBridge === bridge) currentBridge = null
  },

  replyBridge() {
    return currentBridge
  },
}
