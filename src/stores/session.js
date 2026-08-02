import { computed, reactive, readonly } from 'vue'
import { storage } from '../services/storage'

const state = reactive({
  accessToken: storage.get('accessToken', ''),
  user: storage.get('user', null),
})

export const session = {
  state: readonly(state),
  isLoggedIn: computed(() => Boolean(state.accessToken)),

  getToken() {
    return state.accessToken || ''
  },

  setSession(accessToken, user = null) {
    state.accessToken = accessToken || ''
    state.user = user
    storage.set('accessToken', state.accessToken)
    if (user) storage.set('user', user)
  },

  setUser(user) {
    state.user = user
    if (user) storage.set('user', user)
    else storage.remove('user')
  },

  clear() {
    state.accessToken = ''
    state.user = null
    storage.clearSession()
  },
}
