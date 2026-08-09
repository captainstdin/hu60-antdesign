import { createApp } from 'vue'
import {
  Alert,
  AutoComplete,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Pagination,
  Popover,
  Radio,
  Result,
  Segmented,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  TreeSelect,
} from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import { API_BASE_URL } from './config/app'
import router from './router'
import './styles/global.css'

function setApiFavicon() {
  const faviconUrl = `${API_BASE_URL}/favicon.ico`
  let icon = document.querySelector('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.href = faviconUrl
}

setApiFavicon()

const app = createApp(App)

const antdComponents = [
  Alert,
  AutoComplete,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Pagination,
  Popover,
  Radio,
  Result,
  Segmented,
  Select,
  Skeleton,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  TreeSelect,
]

antdComponents.forEach((component) => app.use(component))
app.use(router).mount('#app')
