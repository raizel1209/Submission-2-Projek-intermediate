import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Amankan aset-aset penting yang ada di 'manifest'.
// Ini adalah fondasi PWA kita.
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Strategi Caching untuk Aset Eksternal ---

// 1. Google Fonts (Stylesheets)
//    Pakai StaleWhileRevalidate: Cepat dari cache, tapi tetap update di background.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// 2. Google Fonts (File Webfonts)
//    Pakai CacheFirst: Sekali download, simpan selamanya (atau setahun).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }), // Tahan selama setahun
    ],
  })
);

// 3. API Data Cerita (Story API)
//    Pakai NetworkFirst: Selalu coba cari data baru dulu.
//    Kalau jaringan lambat (timeout 3 detik) atau mati, baru kasih data dari cache.
registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/v1/stories'),
  new NetworkFirst({
    cacheName: 'story-api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }), // Hanya cache jika sukses
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }), // Simpan data 1 hari
    ],
    networkTimeoutSeconds: 3, // Batas waktu tunggu jaringan
  })
);

// 4. API Gambar Cerita (Story Images)
//    Pakai CacheFirst: Gambar jarang berubah. Sekali lihat, langsung simpan.
registerRoute(
  ({ request, url }) => request.destination === 'image' && url.origin === 'https://story-api.dicoding.dev',
  new CacheFirst({
    cacheName: 'story-image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }), // Simpan gambar 30 hari
    ],
  })
);

// --- Bagian Ajaib: Logika Push Notification ---

// 5. Listener saat 'push' diterima (Server mengirim sesuatu)
self.addEventListener('push', (event) => {
  console.log('Push event diterima!', event);

  let notificationData;
  try {
    // Coba olah data sebagai JSON
    notificationData = event.data.json();
  } catch (e) {
    // Jaga-jaga kalau datanya cuma teks biasa
    notificationData = {
      title: 'Notifikasi Baru',
      body: event.data.text(),
      data: { url: '/#' } // Kasih URL default biar aman
    };
  }

  const title = notificationData.title || 'Story App';
  const options = {
    body: notificationData.body || 'Ada konten baru untuk Anda.',
    icon: 'public/images/logo-192.png', // Pastikan path ikon ini benar ya!
    badge: 'public/images/logo-192.png', // Path ikon ini juga!
    data: {
      url: notificationData.data.url || '/#', // URL yang akan dibuka saat diklik
    },
    actions: [
      { action: 'explore', title: 'Buka Aplikasi' } // Tombol aksi
    ]
  };

  // Tampilkan notifikasinya ke hadapan user
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 6. Listener saat notifikasi di-klik (User merespon)
self.addEventListener('notificationclick', (event) => {
  // Tutup notifikasi yang tadi diklik
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Cek dulu, jangan-jangan tab-nya udah kebuka?
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        if (clientUrl.href === targetUrl.href && 'focus' in client) {
          // Jika sudah, fokus ke tab itu aja
          return client.focus();
        }
      }
      // Kalau belum ada tab yang sama, buka jendela baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});