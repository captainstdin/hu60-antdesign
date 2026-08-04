import { reactive, readonly } from 'vue'

const state = reactive({
  open: false,
  redirect: '/',
})

function normalizeRedirect(value) {
  const redirect = String(value || '/')
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

export const authDialog = {
  state: readonly(state),

  show(redirect = '/') {
    state.redirect = normalizeRedirect(redirect)
    state.open = true
  },

  hide() {
    state.open = false
  },

  takeRedirect() {
    const redirect = state.redirect
    state.open = false
    state.redirect = '/'
    return redirect
  },
}
