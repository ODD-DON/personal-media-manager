// PMP Service Worker
const CACHE_NAME = "pmp-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Handle push events — fires even when the app is closed
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New Notification", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Personal Media Manager";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    requireInteraction: false,
    // vibrate pattern: buzz-pause-buzz
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Update the home screen badge count from the push payload
      typeof navigator !== "undefined" && "setAppBadge" in navigator && data.pendingCount != null
        ? navigator.setAppBadge(data.pendingCount)
        : Promise.resolve(),
    ])
  );
});

// On notification click: focus or open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
