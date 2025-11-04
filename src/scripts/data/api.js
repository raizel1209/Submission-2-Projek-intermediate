import CONFIG from "../config";

/**
 * Kumpulan endpoint API.
 */
const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  NOTIFICATIONS: `${CONFIG.BASE_URL}/notifications`, 
};

/**
 * Mendaftarkan user baru.
 * @param {Object} credentials - Data registrasi user.
 * @param {string} credentials.name - Nama user.
 * @param {string} credentials.email - Email user.
 * @param {string} credentials.password - Password user.
 * @returns {Promise<Object>} Respon data atau objek error.
 */
export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Register failed");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Melakukan login user.
 * @param {Object} credentials - Data login user.
 * @param {string} credentials.email - Email user.
 * @param {string} credentials.password - Password user.
 * @returns {Promise<Object>} Respon data (termasuk token) atau objek error.
 */
export async function loginUser({ email, password }) {
  try {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    // Catatan: Penyimpanan token tidak dilakukan di sini.
    // Penanganan token didelegasikan ke presentation layer (misalnya auth.js)
    // untuk memusatkan logika otentikasi.

    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Mengambil daftar cerita dengan paginasi.
 * @param {Object} options - Opsi filter dan otentikasi.
 * @param {string} options.token - Token otorisasi.
 * @param {number} [options.page] - Nomor halaman.
 * @param {number} [options.size] - Ukuran halaman.
 * @param {number} [options.location=0] - Filter lokasi (0 atau 1).
 * @returns {Promise<Object>} Respon API atau objek error.
 */
export async function getAllStories({ token, page, size, location = 0 }) {
  try {
    if (!token) throw new Error("Token is required");
    const url = new URL(ENDPOINTS.STORIES);
    const params = new URLSearchParams();
    if (page !== undefined) params.append("page", page);
    if (size !== undefined) params.append("size", size);
    if (location !== undefined) params.append("location", location);
    url.search = params.toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch stories");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Menambahkan cerita baru.
 * @param {string} token - Token otorisasi.
 * @param {FormData} formData - Data cerita (description, photo, lat, lon).
 * @returns {Promise<Object>} Respon API atau objek error.
 */
export async function addStory(token, formData) {
  try {
    const response = await fetch(ENDPOINTS.STORIES, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to add story");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

// --- FUNGSI UNTUK NOTIFIKASI PUSH ---

/**
 * Mengirim data langganan (subscription) ke server API.
 * @param {string} token - Token otorisasi.
 * @param {PushSubscription} subscription - Objek push subscription dari browser.
 * @returns {Promise<Object>} Respon API atau objek error.
 */
export async function subscribeToNotifications(token, subscription) {
  try {
    const subscriptionJson = subscription.toJSON();
    const bodyPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      },
    };

    const response = await fetch(`${ENDPOINTS.NOTIFICATIONS}/subscribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
section
      },
      body: JSON.stringify(bodyPayload), 
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Gagal subscribe ke notifikasi");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Mengirim permintaan berhenti langganan ke server API.
 * @param {string} token - Token otorisasi.
 * @param {PushSubscription} subscription - Objek push subscription dari browser.
 * @returns {Promise<Object>} Respon API atau objek error.
 */
export async function unsubscribeFromNotifications(token, subscription) {
tran
  try {
    // Catatan: Menggunakan 'POST' untuk unsubscribe sebagai workaround
    // jika endpoint server tidak mendukung 'DELETE' atau mengalami kendala CORS.
    const response = await fetch(`${ENDPOINTS.NOTIFICATIONS}/unsubscribe`, {
      method: "POST", // Metode 'POST' digunakan sesuai kebutuhan server
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Gagal unsubscribe dari notifikasi");
    return data;
  } catch (error) {
    return { error: true, message: error.message };
  }
}