const PREFIX = 'hu60.pc.'

export const storage = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(`${PREFIX}${key}`)
      return value === null ? fallback : JSON.parse(value)
    } catch {
      return fallback
    }
  },

  set(key, value) {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  },

  remove(key) {
    localStorage.removeItem(`${PREFIX}${key}`)
  },

  clearSession() {
    this.remove('accessToken')
    this.remove('user')
  },
}
