<template>
  <footer class="site-footer">
    <div class="site-footer-line">
      <span>本站由</span>
      <a
        v-if="driverUrl"
        :href="driverUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ driverName }}
      </a>
      <span>驱动 . 主题:</span>
      <nav v-if="themeLinks.length" class="site-theme-links" aria-label="站点版本">
        <template v-for="(link, index) in themeLinks" :key="link.name">
          <span v-if="index" class="site-theme-separator"> / </span>
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ link.name }}
          </a>
        </template>
      </nav>
      <span> . </span>
      <a
        v-if="siteUrl"
        :href="siteUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        首页
      </a>
    </div>
    <div v-if="recordHtml" class="site-footer-record" v-html="recordHtml" />
  </footer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { forumApi } from '../services/forum'
import { sanitizeHtml } from '../utils/content'

const fallbackSiteInfo = {
  SITE_URL_PREFIX: 'https://hu60.cn',
  SITE_DRIVER_NAME: 'hu60wap6',
  SITE_DRIVER_URL: 'https://gitee.com/hu60t/hu60wap6',
  SITE_RECORD_NUMBER: '备案号: <a href="https://beian.miit.gov.cn/" target="_blank">京ICP备18041936号-1</a>',
  SITE_THEME_LINKS: {
    Jhin: 'https://hu60.cn/q.php/link.tpl.jhin.html',
    经典: 'https://hu60.cn/q.php/link.tpl.classic.html',
    Next: 'https://next.hu60.cn/',
    Antd: 'https://hu60.cn/antd/',
  },
}

const siteInfo = ref(fallbackSiteInfo)

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

const siteUrl = computed(() => safeHttpUrl(siteInfo.value.SITE_URL_PREFIX))
const driverName = computed(() => siteInfo.value.SITE_DRIVER_NAME || fallbackSiteInfo.SITE_DRIVER_NAME)
const driverUrl = computed(() => safeHttpUrl(siteInfo.value.SITE_DRIVER_URL || fallbackSiteInfo.SITE_DRIVER_URL))
const recordHtml = computed(() => sanitizeHtml(siteInfo.value.SITE_RECORD_NUMBER || ''))
const themeLinks = computed(() => {
  const configuredLinks = siteInfo.value.SITE_THEME_LINKS || {}
  const links = Object.keys(configuredLinks).length
    ? configuredLinks
    : fallbackSiteInfo.SITE_THEME_LINKS
  return Object.entries(links)
    .filter(([name]) => name !== 'Jhin')
    .map(([name, url]) => ({ name, url: safeHttpUrl(url) }))
    .filter((link) => link.name && link.url)
})

onMounted(async () => {
  try {
    const result = await forumApi.getSiteInfo()
    if (result && typeof result === 'object') {
      siteInfo.value = { ...fallbackSiteInfo, ...result }
    }
  } catch {
    // 站点信息不影响主流程，请求失败时保留默认版权信息。
  }
})
</script>

<style scoped>
.site-footer {
  width: 100%;
  margin-top: 15px;
  padding: 0 28px 15px;
  color: #333;
  font-size: 13px;
  background: #fff;
}

.site-footer-line,
.site-footer-record {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  max-width: 1170px;
  gap: 4px;
}

.site-theme-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.site-footer a {
  color: #666;
  text-decoration: none;
}

.site-footer a:hover,
.site-footer a:focus-visible,
.site-footer-record :deep(a:hover),
.site-footer-record :deep(a:focus-visible) {
  color: #08c;
  text-decoration: underline;
  outline: none;
}

.site-theme-separator {
  margin: 0 5px;
  color: #999;
}

.site-footer-record {
  margin-top: 7px;
  color: #333;
}

.site-footer-record :deep(a) {
  margin-left: 4px;
  color: #666;
  text-decoration: none;
}

@media (max-width: 620px) {
  .site-footer {
    padding: 0 12px 15px;
  }

  .site-footer-line {
    flex-wrap: wrap;
  }

  .site-footer-record {
    flex-wrap: wrap;
  }
}
</style>
