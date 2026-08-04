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
import router from './router'
import './styles/global.css'

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
