import { VAPID_PUBLIC_KEY } from "../config";
import * as ApiService from '../data/api';
import { getAccessToken } from './auth';

/**
 * Mengubah string VAPID public key (Base64) menjadi Uint8Array.
 * @param {string} base64String - String VAPID key dalam format Base64.
 * @returns {Uint8Array} Array byte dari VAPID key.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Memeriksa apakah browser mendukung Service Worker dan Push Manager.
 * @returns {boolean} True jika didukung, false jika tidak.
 */
export function isPushNotificationSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Mendapatkan service worker yang aktif atau mendaftarkan yang baru.
 * @returns {Promise<ServiceWorkerRegistration>} Promise yang resolve dengan registrasi service worker.
 */
async function getActiveServiceWorker() {
  try {
    let registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.log('Mendaftarkan service worker baru...');
      registration = await navigator.serviceWorker.register('/sw.js');

      if (registration.installing) {
        console.log('Menunggu service worker selesai diinstall...');
        await new Promise(resolve => {
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              resolve();
            }
          });
        });
      }
    }

    if (!registration.active) {
      throw new Error('Service worker tidak aktif setelah registrasi');
    }

    return registration;
  } catch (error) {
    console.error('Gagal mendapatkan service worker:', error);
    throw new Error('Gagal mempersiapkan service worker. Silakan muat ulang halaman.');
  }
}

/**
 * Meminta izin notifikasi kepada pengguna.
 * @returns {Promise<string>} Promise yang resolve dengan status izin.
 */
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Izin notifikasi tidak diberikan.");
    }
    return permission;
  } catch (error) {
    console.error('Gagal meminta izin notifikasi:', error);
    throw new Error('Gagal meminta izin notifikasi. Coba muat ulang halaman atau periksa pengaturan browser Anda.');
  }
}

/**
 * Mendaftarkan (subscribe) perangkat ke push notification server.
 * @returns {Promise<PushSubscription>} Promise yang resolve dengan subscription.
 */
export async function subscribePushNotification() {
  const token = getAccessToken();
  if (!isPushNotificationSupported()) {
    throw new Error("Push Notification tidak didukung di browser ini.");
  }
  if (!token) {
    throw new Error("Token autentikasi diperlukan untuk subscribe.");
  }

  await requestNotificationPermission();

  const registration = await getActiveServiceWorker();

  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    console.log("Menggunakan subscription yang sudah ada");
    return subscription;
  }

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Mencoba membuat subscription (percobaan ${attempt}/${maxRetries})...`);

      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      try {
        const keyUint8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        console.log('VAPID key length:', keyUint8.length);
        console.log('VAPID key prefix (hex):', Array.from(keyUint8.slice(0,8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      } catch (keyErr) {
        console.error('Gagal mengonversi VAPID key:', keyErr);
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('Subscription berhasil dibuat:', subscription);
      break;
    } catch (error) {
      console.error(`Gagal membuat subscription (percobaan ${attempt}):`, error);

      if (error.name !== 'AbortError') {
        throw new Error(`Gagal membuat subscription: ${error.message}`);
      }

      if (attempt === maxRetries) {
        throw new Error('Gagal terhubung ke layanan push setelah beberapa percobaan. ' +
          'Pastikan koneksi internet Anda stabil dan coba lagi nanti.');
      }
    }
  }

  try {
    console.log("Mengirim subscription ke server...");
    const response = await ApiService.subscribeToNotifications(token, subscription);

    if (response.error) {
      console.error('Server menolak subscription:', response.message);
      await subscription.unsubscribe();
      throw new Error(response.message);
    }

    console.log("Berhasil subscribe ke server:", response);
    return subscription;
  } catch (error) {
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (unsubError) {
        console.error('Gagal membatalkan subscription:', unsubError);
      }
    }

    throw new Error(`Gagal mendaftarkan ke server notifikasi: ${error.message}`);
  }
}

/**
 * Berhenti berlangganan (unsubscribe) dari push notification.
 * @returns {Promise<PushSubscription|null>} Promise yang resolve dengan subscription yang dihapus.
 */
export async function unsubscribePushNotification() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Token autentikasi diperlukan untuk unsubscribe.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    console.log("Mengirim permintaan unsubscribe ke server...");
    const response = await ApiService.unsubscribeFromNotifications(token, subscription);

    if (response.error) {
      throw new Error(response.message);
    }

    await subscription.unsubscribe();

    console.log("Berhasil unsubscribe dari server:", response);
    return subscription;
  }

  console.log("Tidak ada langganan untuk di-unsubscribe.");
  return null;
}

/**
 * Mengecek status langganan saat ini.
 * @returns {Promise<boolean>} Promise yang resolve dengan status langganan.
 */
export async function getSubscriptionStatus() {
  if (!isPushNotificationSupported()) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
