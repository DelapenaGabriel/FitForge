self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: 'FitForge', message: event.data.text() }
  }

  const title = data.title || 'FitForge Activity'
  const options = {
    body: data.message || 'You have new activity!',
    icon: '/fitforge_lime.png',
    badge: '/fitforge_lime.png',
    vibrate: [200, 100, 200],
    data: data.route ? { route: data.route } : {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const route = event.notification.data?.route || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // If the app is already open, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', route: route })
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(route)
      }
    })
  )
})
