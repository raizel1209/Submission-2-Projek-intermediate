/**
 * Memformat tanggal menjadi string yang dapat dibaca manusia.
 * @param {string|Date} date - Tanggal yang akan diformat.
 * @param {string} locale - Lokal bahasa untuk format (default: 'en-US').
 * @param {Object} options - Opsi tambahan untuk formatting.
 * @returns {string} Tanggal yang telah diformat.
 */
export function showFormattedDate(date, locale = 'en-US', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Menunda eksekusi selama waktu tertentu.
 * @param {number} time - Waktu penundaan dalam milidetik (default: 1000ms).
 * @returns {Promise} Promise yang akan resolve setelah waktu tertentu.
 */
export function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * Mengecek apakah Service Worker didukung oleh browser.
 * @returns {boolean} True jika didukung, false jika tidak.
 */
export function isServiceWorkerSupported() {
  return "serviceWorker" in navigator;
}

/**
 * Mendaftarkan Service Worker untuk aplikasi.
 * @param {string} swUrl - Path ke file service worker (default: '/sw.js').
 * @returns {Promise<void>} Promise yang resolve ketika pendaftaran selesai.
 */
export async function registerServiceWorker(swUrl = '/sw.js') {
  if (!isServiceWorkerSupported()) {
    console.log("Service Worker tidak didukung di browser ini.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    console.log("Service Worker berhasil terdaftar dengan scope:", registration.scope);
  } catch (error) {
    console.error("Gagal mendaftar Service Worker:", error);
  }
}
