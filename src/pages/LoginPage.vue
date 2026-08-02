<template>
  <div class="auth-page">
    <a-card class="surface-card auth-card" :bordered="false">
      <div class="auth-heading">
        <div class="auth-mark"><CrownOutlined /></div>
        <h1>欢迎回到虎绿林</h1>
        <p>登录后即可发帖、回复、查看内信和聊天室。</p>
      </div>

      <a-alert
        v-if="isLoggedIn"
        class="already-alert"
        type="success"
        show-icon
        message="当前账号已经登录"
      />

      <a-form
        :model="form"
        layout="vertical"
        :disabled="submitting"
        @finish="submitLogin"
      >
        <a-form-item label="用户名" name="name" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="form.name" size="large" autocomplete="username" placeholder="用户名">
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>

        <a-form-item label="密码" name="pass" :rules="[{ required: true, message: '请输入密码' }]">
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

      <p class="agreement">
        登录代表同意
        <a href="https://hu60.cn" target="_blank" rel="noopener noreferrer">
          {{ siteName }}用户守则
        </a>
      </p>
    </a-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CrownOutlined, LockOutlined, UserOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { forumApi } from '../services/forum'
import { session } from '../stores/session'

const route = useRoute()
const router = useRouter()
const form = reactive({ name: '', pass: '' })
const siteInfo = ref({})
const submitting = ref(false)
const error = ref('')
const isLoggedIn = session.isLoggedIn
const siteName = computed(() => siteInfo.value.SITE_SIMPLE_NAME || '')

function redirectAfterLogin() {
  const redirect = String(route.query.redirect || '/')
  const isSafeRelativePath = redirect.startsWith('/') && !redirect.startsWith('//')
  router.replace(isSafeRelativePath ? redirect : '/')
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
      // 登录已经成功，用户详情可以稍后在个人中心重新获取。
    }
    session.setUser(user)
    message.success(`欢迎回来，${user.name || form.name}`)
    redirectAfterLogin()
  } catch (reason) {
    error.value = reason?.message || '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    siteInfo.value = await forumApi.getSiteInfo()
  } catch {
    // 站点信息是辅助内容，不阻断登录。
  }
})
</script>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 140px);
  place-items: center;
  padding: 20px 0 60px;
}

.auth-card {
  width: min(100%, 470px);
}

.auth-card :deep(.ant-card-body) {
  padding: 34px 38px;
}

.auth-heading {
  margin-bottom: 28px;
  text-align: center;
}

.auth-mark {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 15px;
  place-items: center;
  color: #fff;
  font-size: 22px;
  border-radius: 16px;
  background: linear-gradient(135deg, #2baa99, #11766b);
  box-shadow: 0 10px 20px rgba(23, 143, 128, 0.2);
}

.auth-heading h1 {
  margin: 0;
  color: #233b37;
  font-size: 25px;
}

.auth-heading p {
  margin: 8px 0 0;
  color: #7a8986;
  font-size: 13px;
}

.already-alert,
.login-error {
  margin-bottom: 20px;
}

.agreement {
  margin: 17px 0 0;
  color: #8a9794;
  font-size: 12px;
  text-align: center;
}

@media (max-width: 620px) {
  .auth-card :deep(.ant-card-body) {
    padding: 28px 22px;
  }
}
</style>
