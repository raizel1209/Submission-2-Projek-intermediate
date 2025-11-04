import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Mengamankan aset-aset penting yang terdapat dalam 'manifest'.
// Ini merupakan fondasi dari Progressive Web App (PWA) kami.
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Strategi Caching untuk Aset Eksternal ---

// 1. Google Fonts (Stylesheets)
//    Menggunakan strategi StaleWhileRevalidate: Mengambil dari cache untuk kecepatan, namun tetap memperbarui di latar belakang.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// 2. Google Fonts (File Webfonts)
//    Menggunakan strategi CacheFirst: Setelah diunduh sekali, simpan selama satu tahun.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 }), // Simpan selama satu tahun
    ],
  })
);

// 3. API Data Cerita (Story API)
//    Menggunakan strategi NetworkFirst: Selalu mencoba mengambil data terbaru dari jaringan terlebih dahulu.
//    Jika jaringan lambat (timeout 3 detik) atau tidak tersedia, gunakan data dari cache.
registerRoute(
  ({ url }) => url.href.startsWith('https://story-api.dicoding.dev/v1/stories'),
  new NetworkFirst({
    cacheName: 'story-api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }), // Hanya cache jika respons berhasil
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }), // Simpan data selama satu hari
    ],
    networkTimeoutSeconds: 3, // Batas waktu tunggu jaringan
  })
);

// 4. API Gambar Cerita (Story Images)
//    Menggunakan strategi CacheFirst: Gambar jarang berubah. Setelah dilihat sekali, langsung disimpan.
registerRoute(
  ({ request, url }) => request.destination === 'image' && url.origin === 'https://story-api.dicoding.dev',
  new CacheFirst({
    cacheName: 'story-image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }), // Simpan gambar selama 30 hari
    ],
  })
);

// --- Logika Push Notification ---

// 5. Event listener untuk menerima push notification (server mengirim data)
self.addEventListener('push', (event) => {
  console.log('Push event diterima!', event);

  let notificationData;
  try {
    // Mencoba mengurai data sebagai JSON
    notificationData = event.data.json();
  } catch (e) {
    // Sebagai fallback jika data berupa teks biasa
    notificationData = {
      title: 'Notifikasi Baru',
      body: event.data.text(),
      data: { url: '/#' } // Berikan URL default untuk keamanan
    };
  }

  const title = notificationData.title || 'Story App';
  const options = {
    body: notificationData.body || 'Terdapat konten baru untuk Anda.',
    icon: 'public/images/logo-192.png', // Pastikan path ikon ini benar
    badge: 'public/images/logo-192.png', // Path ikon ini juga
    data: {
      url: notificationData.data.url || '/#', // URL yang akan dibuka saat diklik
    },
    actions: [
      { action: 'explore', title: 'Buka Aplikasi' } // Tombol aksi
    ]
  };

  // Menampilkan notifikasi kepada pengguna
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 6. Event listener saat notifikasi diklik (pengguna merespons)
self.addEventListener('notificationclick', (event) => {
  // Menutup notifikasi yang diklik
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Periksa apakah tab sudah terbuka
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        if (clientUrl.href === targetUrl.href && 'focus' in client) {
          // Jika sudah terbuka, fokus ke tab tersebut
          return client.focus();
        }
      }
      // Jika belum ada tab yang sama, buka jendela baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
