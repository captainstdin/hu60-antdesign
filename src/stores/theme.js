import { computed, reactive, readonly, watch } from 'vue'
import antdTheme from 'ant-design-vue/es/theme'

import { storage } from '../services/storage'
import { webplugStorage } from '../services/webplugStorage'
import { session } from './session'

const LOCAL_THEME_KEY = 'theme'
const WEBPLUG_THEME_KEY = 'hu60-antdesign/theme'
const DEFAULT_THEME = 'light'

export const themeOptions = [
  {
    key: 'light',
    label: '明亮主题',
    shortLabel: '明亮',
    metaColor: '#53b1a8',
    swatches: ['#f3f5f4', '#53b1a8', '#237f9f'],
  },
  {
    key: 'cyberpunk',
    label: '赛博朋克2077主题',
    shortLabel: '赛博朋克2077',
    metaColor: '#fcee0a',
    swatches: ['#fcee0a', '#111007', '#5f5507'],
  },
  {
    key: 'dark',
    label: '黑暗主题',
    shortLabel: '黑暗',
    metaColor: '#102a28',
    swatches: ['#101414', '#4fd1c5', '#7dd3fc'],
  },
]

const themeKeys = new Set(themeOptions.map((item) => item.key))
const themeMap = Object.fromEntries(themeOptions.map((item) => [item.key, item]))

function isThemeKey(value) {
  return themeKeys.has(String(value || ''))
}

function normalizeTheme(value) {
  const key = String(value || '')
  return isThemeKey(key) ? key : DEFAULT_THEME
}

function applyDocumentTheme(themeKey) {
  if (typeof document === 'undefined') return
  const option = themeMap[themeKey] || themeMap[DEFAULT_THEME]
  const root = document.documentElement
  root.dataset.theme = option.key
  root.style.colorScheme = option.key === 'light' ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', option.metaColor)
}

const state = reactive({
  current: normalizeTheme(storage.get(LOCAL_THEME_KEY, DEFAULT_THEME)),
  syncing: false,
  remoteReady: false,
})

let syncStarted = false
let remoteVersion = null
let dirtySincePull = false
let writingRemote = false

applyDocumentTheme(state.current)

function persistLocal(themeKey) {
  storage.set(LOCAL_THEME_KEY, themeKey)
  applyDocumentTheme(themeKey)
}

function remoteThemeFrom(value) {
  const raw = typeof value === 'object' && value !== null ? value.theme : value
  return isThemeKey(raw) ? String(raw) : ''
}

async function pushRemoteTheme() {
  if (!session.isLoggedIn.value || writingRemote) return
  writingRemote = true
  state.syncing = true
  try {
    const result = await webplugStorage.setJson(WEBPLUG_THEME_KEY, {
      theme: state.current,
      updatedAt: new Date().toISOString(),
    }, remoteVersion)
    remoteVersion = result.version
    dirtySincePull = false
  } catch {
    // 插件存储同步失败不影响本机主题选择。
  } finally {
    writingRemote = false
    state.syncing = false
  }
}

async function pullRemoteTheme() {
  if (!session.isLoggedIn.value) return
  state.syncing = true
  try {
    const result = await webplugStorage.getJson(WEBPLUG_THEME_KEY)
    remoteVersion = result.version
    state.remoteReady = true
    const remoteTheme = remoteThemeFrom(result.value)
    if (!remoteTheme) {
      await pushRemoteTheme()
      return
    }
    if (dirtySincePull) {
      await pushRemoteTheme()
      return
    }
    if (remoteTheme !== state.current) {
      state.current = remoteTheme
      persistLocal(remoteTheme)
    }
  } catch {
    // 登录、网络或插件存储不可用时，保留本机主题。
  } finally {
    state.syncing = false
  }
}

const commonToken = {
  borderRadius: 6,
  borderRadiusLG: 6,
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
}

const commonComponents = {
  Button: { controlHeight: 38 },
  Card: { paddingLG: 22 },
  Input: { controlHeight: 40 },
  Menu: {
    itemHeight: 46,
    itemBorderRadius: 6,
    colorActiveBarWidth: 0,
    colorActiveBarHeight: 0,
    colorActiveBarBorderSize: 0,
  },
}

const antThemeConfigs = {
  light: {
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      ...commonToken,
      colorPrimary: '#168b7c',
      colorInfo: '#168b7c',
      colorLink: '#237f9f',
      colorBgLayout: '#f3f5f4',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorText: '#263633',
      colorTextSecondary: '#71807d',
      colorBorder: '#dfe7e5',
      colorBorderSecondary: '#e8eeec',
    },
    components: commonComponents,
  },
  cyberpunk: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      ...commonToken,
      colorPrimary: '#fcee0a',
      colorInfo: '#fcee0a',
      colorLink: '#fcee0a',
      colorSuccess: '#d6fb62',
      colorWarning: '#fcee0a',
      colorError: '#ff3b78',
      colorBgLayout: '#080805',
      colorBgContainer: '#111007',
      colorBgElevated: '#171507',
      colorText: '#fff8d6',
      colorTextSecondary: '#c8bd66',
      colorBorder: '#5f5507',
      colorBorderSecondary: '#383205',
      colorTextLightSolid: '#10131d',
      controlOutline: 'rgba(252, 238, 10, 0.32)',
    },
    components: commonComponents,
  },
  dark: {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      ...commonToken,
      colorPrimary: '#4fd1c5',
      colorInfo: '#4fd1c5',
      colorLink: '#7dd3fc',
      colorSuccess: '#65d69a',
      colorWarning: '#f2c96b',
      colorError: '#ff7c90',
      colorBgLayout: '#101414',
      colorBgContainer: '#171d1b',
      colorBgElevated: '#1d2522',
      colorText: '#eef4f1',
      colorTextSecondary: '#a9b8b3',
      colorBorder: '#34423e',
      colorBorderSecondary: '#26312e',
      controlOutline: 'rgba(79, 209, 197, 0.24)',
    },
    components: commonComponents,
  },
}

export const themeStore = {
  state: readonly(state),
  currentOption: computed(() => themeMap[state.current] || themeMap[DEFAULT_THEME]),
  options: themeOptions,

  setTheme(value) {
    const nextTheme = normalizeTheme(value)
    if (state.current === nextTheme) return
    state.current = nextTheme
    dirtySincePull = true
    persistLocal(nextTheme)
    pushRemoteTheme()
  },

  initSync() {
    if (syncStarted) return
    syncStarted = true
    watch(
      () => session.isLoggedIn.value,
      (isLoggedIn) => {
        if (isLoggedIn) {
          pullRemoteTheme()
          return
        }
        state.remoteReady = false
        remoteVersion = null
      },
      { immediate: true },
    )
  },
}

export function getAntDesignTheme(themeKey) {
  return antThemeConfigs[normalizeTheme(themeKey)]
}
