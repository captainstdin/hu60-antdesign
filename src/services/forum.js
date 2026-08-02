import { accessPost, withQuery } from './http'

const originQuery = { _origin: '*' }

export const forumApi = {
  getSiteInfo() {
    return accessPost(withQuery('/site.info.json', originQuery))
  },

  getHome(page = 1) {
    return accessPost(
      withQuery('/index.index.json', { _uinfo: 'name,avatar', p: page, ...originQuery }),
    )
  },

  search({ keywords = '', username = '', page = 1 }) {
    return accessPost(
      withQuery('/bbs.search.json', {
        _uinfo: 'name,avatar',
        p: page,
        keywords,
        username,
        ...originQuery,
      }),
    )
  },

  getTopic(topicId, page = 1) {
    return accessPost(
      withQuery(`/bbs.topic.${topicId}.${page}.json`, {
        _content: 'html',
        _uinfo: 'name,avatar,sign,contact',
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
        _uinfo: 'name,avatar,sign,contact',
        _myself: 'newMsg,newAtInfo',
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

  getMessageOverview() {
    return accessPost(
      withQuery('/msg.index.send.json', {
        _myself: 'newMsg,newAtInfo',
        ...originQuery,
      }),
    )
  },

  getUser(uid) {
    return accessPost(
      withQuery(`/user.info.${uid}.json`, {
        _uinfo: 'name,avatar,sign,contact',
        ...originQuery,
      }),
    )
  },
}
