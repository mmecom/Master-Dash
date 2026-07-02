// Service worker — web-push notifications for the dashboard.
// Shows the notification and, on click, opens/focuses the target page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'Dashboard', body: '', url: '/daily.html' };
  try { if (event.data) data = Object.assign(data, event.data.json()); }
  catch (e) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    data: { url: data.url || '/daily.html' },
    tag: data.tag,
    renotify: true
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/daily.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) { if ('focus' in c) { try { c.navigate(url); } catch (e) {} return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
