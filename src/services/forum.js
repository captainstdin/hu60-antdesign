import { accessMultipart, accessPost, withQuery } from './http'

const originQuery = { _origin: '*' }

export const forumApi = {
  getSiteInfo() {
    return accessPost(withQuery('/site.info.json', originQuery))
  },

  getHome(page = 1) {
    return accessPost(
      withQuery('/index.index.json', {
        _uinfo: 'name,avatar',
        _myself: 'permissions,countReview,newMsg,newAtInfo,newChats',
        p: page,
        ...originQuery,
      }),
    )
  },

  search({ keywords = '', username = '', searchType = '', page = 1 }) {
    return accessPost(
      withQuery('/bbs.search.json', {
        _uinfo: 'name,avatar',
        p: page,
        keywords,
        username,
        searchType,
        ...originQuery,
      }),
    )
  },

  getTopic(topicId, page = 1, options = {}) {
    return accessPost(
      withQuery(`/bbs.topic.${topicId}.${page}.json`, {
        _content: 'html',
        _uinfo: 'name,avatar,signature,contact,permissions',
        _myself: 'permissions,newMsg,newAtInfo',
        floorReverse: options.floorReverse ? 1 : 0,
        pageSize: options.pageSize || 30,
        ...originQuery,
      }),
    )
  },

  replyTopic(topicId, content, token) {
    return accessPost(withQuery(`/bbs.newreply.${topicId}.1.json`, originQuery), {
      content,
      token,
      go: '评论该帖子',
    })
  },

  login(form) {
    return accessPost(withQuery('/user.login.json', originQuery), {
      ...form,
      type: '1',
      go: '1',
    })
  },

  getCurrentUser() {
    return accessPost(
      withQuery('/user.index.json', {
        _uinfo: 'name,avatar,signature,contact,permissions',
        _myself: 'permissions,countReview,newMsg,newAtInfo,newChats',
        ...originQuery,
      }),
    )
  },

  logout() {
    return accessPost(withQuery('/user.exit.json', originQuery))
  },

  getForums() {
    return accessPost(withQuery('/bbs.newtopic.json', originQuery))
  },

  getPublishToken(forumId) {
    return accessPost(withQuery(`/bbs.newtopic.${forumId}.json`, originQuery))
  },

  publishTopic(forumId, form) {
    return accessPost(withQuery(`/bbs.newtopic.${forumId}.json`, originQuery), {
      ...form,
      go: '确认发布帖子',
    })
  },

  getChatRooms() {
    return accessPost(withQuery('/addin.chat.json', { _myself: 'newChats', ...originQuery }))
  },

  getChatRoom(room, page = 1) {
    return accessPost(
      withQuery(`/addin.chat.${encodeURIComponent(room)}.json`, {
        _content: 'html',
        _uinfo: 'name,avatar,signature',
        _myself: 'permissions,newChats',
        pageSize: 30,
        p: page,
        ...originQuery,
      }),
    )
  },

  sendChatMessage(room, content, token) {
    return accessPost(withQuery(`/addin.chat.${encodeURIComponent(room)}.json`, originQuery), {
      content,
      token,
      go: '快速发言',
    })
  },

  getMessageOverview() {
    return accessPost(
      withQuery('/msg.index.send.json', {
        _myself: 'newMsg,newAtInfo',
        ...originQuery,
      }),
    )
  },

  getMessages({ box = 'inbox', state = 'all', page = 1 } = {}) {
    const safeBox = ['inbox', 'outbox', '@'].includes(box) ? box : 'inbox'
    const safeState = ['all', 'yes', 'no'].includes(state) ? state : 'all'
    return accessPost(
      withQuery(`/msg.index.${safeBox}.${safeState}.json`, {
        _content: 'html',
        _uinfo: 'name,avatar',
        _myself: 'newMsg,newAtInfo',
        p: page,
        pageSize: 30,
        ...originQuery,
      }),
    )
  },

  getMessageChat(uid, page = 1) {
    return accessPost(
      withQuery(`/msg.index.chat.${uid}.json`, {
        _content: 'html',
        _uinfo: 'name,avatar',
        p: page,
        pageSize: 50,
        ...originQuery,
      }),
    )
  },

  acknowledgeMessage(messageId) {
    return accessPost(withQuery(`/link.ack.msg.${messageId}.json`, originQuery))
  },

  sendMessage({ uid = '', name = '', content }) {
    return accessPost(withQuery(`/msg.index.send.${uid}.json`, originQuery), {
      name: uid ? undefined : name,
      content,
      go: uid ? '回复' : '确认发送',
    })
  },

  getFavorites(page = 1) {
    return accessPost(
      withQuery('/bbs.myfavorite.json', {
        _uinfo: 'name,avatar',
        p: page,
        pageSize: 30,
        ...originQuery,
      }),
    )
  },

  setFavorite(topicId, favorite) {
    const action = favorite ? 'setfavoritetopic' : 'unsetfavoritetopic'
    return accessPost(withQuery(`/bbs.${action}.${topicId}.json`, originQuery))
  },

  getPostEditor(topicId, postId, page = 1) {
    return accessPost(
      withQuery(`/bbs.edittopic.${topicId}.${postId}.${page}.json`, {
        _content: 'ubb',
        ...originQuery,
      }),
    )
  },

  savePost(topicId, postId, page, form) {
    return accessPost(
      withQuery(`/bbs.edittopic.${topicId}.${postId}.${page}.json`, originQuery),
      { ...form, go: '保存修改' },
    )
  },

  getDeletePost(topicId, postId) {
    return accessPost(withQuery(`/bbs.deltopic.${topicId}.${postId}.json`, originQuery))
  },

  deletePost(topicId, postId, token, delReason = '') {
    return accessPost(withQuery(`/bbs.deltopic.${topicId}.${postId}.json`, originQuery), {
      token,
      delReason,
      go: '确认删除',
    })
  },

  setTopicLocked(topicId, locked) {
    return accessPost(
      withQuery(`/bbs.lockreply.${topicId}.json`, { lock: locked ? 1 : 0, ...originQuery }),
    )
  },

  getSinkTopic(topicId) {
    return accessPost(withQuery(`/bbs.sinktopic.${topicId}.json`, originQuery))
  },

  sinkTopic(topicId, { token, reason = '' }) {
    return accessPost(withQuery(`/bbs.sinktopic.${topicId}.json`, originQuery), {
      token,
      reason,
      go: '确认下沉',
    })
  },

  getMoveTopic(topicId) {
    return accessPost(withQuery(`/bbs.movetopic.${topicId}.json`, originQuery))
  },

  moveTopic(topicId, newFid) {
    return accessPost(withQuery(`/bbs.movetopic.${topicId}.json`, originQuery), {
      newFid,
      go: 'go',
    })
  },

  getTopicEssenceForm(topicId, enabled) {
    const action = enabled ? 'setessencetopic' : 'unsetessencetopic'
    return accessPost(withQuery(`/bbs.${action}.${topicId}.json`, originQuery))
  },

  setTopicEssence(topicId, enabled, { token, reason = '' }) {
    const action = enabled ? 'setessencetopic' : 'unsetessencetopic'
    return accessPost(withQuery(`/bbs.${action}.${topicId}.json`, originQuery), {
      token,
      reason,
      go: enabled ? '确认加精' : '确认取消精华',
    })
  },

  getReviewQueue({ state = '1', page = 1 } = {}) {
    const safeState = ['1', '-1', '3', '2', '-2', '-3'].includes(String(state)) ? state : '1'
    return accessPost(
      withQuery('/bbs.search.json', {
        onlyReview: safeState,
        _content: 'html',
        _uinfo: 'name,avatar,signature',
        _myself: 'permissions,countReview',
        p: page,
        pageSize: 30,
        ...originQuery,
      }),
    )
  },

  reviewPost(contentId, { pass, comment = '' }) {
    return accessPost(withQuery(`/bbs.review.${contentId}.0.json`, originQuery), {
      pass: pass ? 1 : 0,
      comment,
    })
  },

  parseContent(content) {
    const data = JSON.stringify({ input: 'ubb', output: 'html', values: [content] })
    return accessPost(withQuery('/api.ubb.json', originQuery), { data })
  },

  getFaces() {
    return accessPost(withQuery('/api.face.json', originQuery))
  },

  uploadFile(file) {
    return accessMultipart(withQuery('/bbs.upload.json', originQuery), { file }, { timeout: 120_000 })
  },

  getUser(uid) {
    return accessPost(
      withQuery(`/user.info.${uid}.json`, {
        _uinfo: 'name,avatar,signature,contact,regtime,blockPostStat,isFollow,isBlock,isNoDisturb,hideUserCSS,permissions',
        ...originQuery,
      }),
    )
  },

  searchUsers(namePattern, offset = 0, limit = 10) {
    return accessPost(
      withQuery('/user.search.json', {
        namePattern,
        offset,
        limit,
        _uinfo: 'avatar',
        ...originQuery,
      }),
    )
  },

  getRelationships(type = 'follow', page = 1) {
    const safeType = ['follow', 'block', 'follow_me', 'block_me', 'no_disturb'].includes(type)
      ? type
      : 'follow'
    return accessPost(
      withQuery(`/user.relationship.${safeType}.json`, {
        _uinfo: 'name,avatar,signature,isFollow,isBlock,isNoDisturb,hideUserCSS',
        page,
        pageSize: 30,
        ...originQuery,
      }),
    )
  },

  setRelationship(targetUid, action) {
    const allowed = ['follow', 'unfollow', 'block', 'unblock', 'no_disturb', 'hideUserCSS']
    if (!allowed.includes(action)) throw new Error('不支持的关系操作')
    return accessPost(withQuery('/user.relationship.json', originQuery), { action, targetUid })
  },
}
