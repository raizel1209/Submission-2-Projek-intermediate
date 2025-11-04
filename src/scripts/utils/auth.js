import { getActiveRoute } from "../routes/url-parser";
import { ACCESS_TOKEN_KEY } from "../config";

/**
 * Mengambil token akses dari localStorage.
 * Memvalidasi token untuk memastikan tidak bernilai null atau undefined.
 * @returns {string|null} Token akses jika valid, null jika tidak.
 */
export function getAccessToken() {
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (accessToken === "null" || accessToken === "undefined") {
      return null;
    }

    return accessToken;
  } catch (error) {
    console.error("getAccessToken: error:", error);
    return null;
  }
}

/**
 * Menyimpan token akses ke localStorage.
 * @param {string} token - Token akses yang akan disimpan.
 * @returns {boolean} True jika berhasil, false jika gagal.
 */
export function putAccessToken(token) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error("putAccessToken: error:", error);
    return false;
  }
}

/**
 * Menghapus token akses dari localStorage.
 * @returns {boolean} True jika berhasil, false jika gagal.
 */
export function removeAccessToken() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error("removeAccessToken: error:", error);
    return false;
  }
}

/**
 * Daftar rute yang hanya dapat diakses oleh pengguna yang belum terautentikasi.
 */
const unauthenticatedRoutesOnly = ["/login", "/register"];

/**
 * Memeriksa apakah rute hanya untuk pengguna yang belum terautentikasi.
 * Jika pengguna sudah login dan mengakses rute ini, akan diarahkan ke halaman utama.
 * @param {Object} page - Objek halaman yang akan diperiksa.
 * @returns {Object|null} Objek halaman jika diizinkan, null jika dialihkan.
 */
export function checkUnauthenticatedRouteOnly(page) {
  const url = getActiveRoute();
  const isLogin = !!getAccessToken();

  if (unauthenticatedRoutesOnly.includes(url) && isLogin) {
    location.hash = "/";
    return null;
  }

  return page;
}

/**
 * Memeriksa apakah rute memerlukan autentikasi.
 * Jika pengguna belum login, akan diarahkan ke halaman login.
 * @param {Object} page - Objek halaman yang akan diperiksa.
 * @returns {Object|null} Objek halaman jika diizinkan, null jika dialihkan.
 */
export function checkAuthenticatedRoute(page) {
  const isLogin = !!getAccessToken();

  if (!isLogin) {
    location.hash = "/login";
    return null;
  }

  return page;
}

/**
 * Melakukan logout dengan menghapus token akses.
 * @deprecated Gunakan removeAccessToken() sebagai gantinya.
 */
export function getLogout() {
  removeAccessToken();
}
