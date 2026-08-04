<template>
  <a-modal
    :open="authDialog.state.open"
    :footer="null"
    :closable="!submitting"
    :keyboard="!submitting"
    :mask-closable="!submitting"
    :width="420"
    centered
    destroy-on-close
    @cancel="close"
  >
    <div class="login-heading">
      <span class="login-mark"><LockOutlined /></span>
      <div>
        <h2>登录虎绿林</h2>
        <p>登录后继续访问当前功能</p>
      </div>
    </div>

    <a-form
      :model="form"
      layout="vertical"
      :disabled="submitting"
      @finish="submitLogin"
    >
      <a-form-item
        label="用户名"
        name="name"
        :rules="[{ required: true, message: '请输入用户名' }]"
      >
        <a-input
          v-model:value="form.name"
          size="large"
          autocomplete="username"
          placeholder="用户名"
          autofocus
        >
          <template #prefix><UserOutlined /></template>
        </a-input>
      </a-form-item>

      <a-form-item
        label="密码"
        name="pass"
        :rules="[{ required: true, message: '请输入密码' }]"
      >
        <a-input-password
          v-model:value="form.pass"
          size="large"
          autocomplete="current-password"
          placeholder="密码"
        >
          <template #prefix><LockOutlined /></template>
        </a-input-password>
      </a-form-item>

      <a-alert v-if="error" class="login-error" type="error" show-icon :message="error" />

      <a-button block size="large" type="primary" html-type="submit" :loading="submitting">
        登录
      </a-button>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { forumApi } from '../services/forum'
import { authDialog } from '../stores/authDialog'
import { session } from '../stores/session'

const router = useRouter()
const form = reactive({ name: '', pass: '' })
const submitting = ref(false)
const error = ref('')

function close() {
  if (submitting.value) return
  authDialog.hide()
}

async function submitLogin() {
  submitting.value = true
  error.value = ''

  try {
    const result = await forumApi.login(form)
    if (result.success !== true || !result.sid) {
      error.value = result.notice || '用户名或密码错误'
      return
    }

    session.setSession(result.sid)
    let user = { name: form.name }
    try {
      user = await forumApi.getCurrentUser()
    } catch {
      // 登录凭证已经生效，用户资料可在个人中心重新获取。
    }
    session.setUser(user)

    const redirect = authDialog.takeRedirect()
    form.pass = ''
    message.success(`欢迎回来，${user.name || form.name}`)
    await router.push(redirect)
  } catch (reason) {
    error.value = reason?.message || '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

watch(
  () => authDialog.state.open,
  (open) => {
    if (open) error.value = ''
    else form.pass = ''
  },
)
</script>

<style scoped>
.login-heading {
  display: flex;
  align-items: center;
  margin: 2px 0 24px;
  gap: 13px;
}

.login-mark {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  color: #fff;
  font-size: 18px;
  border-radius: 6px;
  background: var(--brand);
}

.login-heading h2 {
  margin: 0;
  color: #263b37;
  font-size: 20px;
}

.login-heading p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.login-error {
  margin-bottom: 20px;
}
</style>
