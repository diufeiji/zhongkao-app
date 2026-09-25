// 离线缓存：静态资源缓存优先，页面网络优先（断网时回退缓存）
// 全部使用相对路径，兼容根路径和子路径部署（如 GitHub Pages）
const CACHE = 'zk-cache-v2'
const CORE = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return // 云同步请求不拦截

  if (url.pathname.includes('/assets/')) {
    // 带哈希的静态资源：缓存优先
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request)
        if (hit) return hit
        const res = await fetch(e.request)
        if (res.ok) c.put(e.request, res.clone())
        return res
      })
    )
    return
  }

  if (e.request.mode === 'navigate') {
    // 页面导航：网络优先，断网回退
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('./index.html', res.clone()))
          return res
        })
        .catch(() => caches.match('./index.html'))
    )
  }
})
