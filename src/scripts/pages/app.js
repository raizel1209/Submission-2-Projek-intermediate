import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";
import { getAccessToken, removeAccessToken, ACCESS_TOKEN_KEY } from "../utils/auth";

/**
 * Kelas utama aplikasi untuk mengelola navigasi, drawer, dan rendering halaman.
 * Bertanggung jawab atas interaksi antara elemen UI dan logika routing.
 */
class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  /**
   * Konstruktor untuk menginisialisasi aplikasi dengan elemen DOM utama.
   * @param {Object} params - Parameter inisialisasi.
   * @param {HTMLElement} params.navigationDrawer - Elemen drawer navigasi.
   * @param {HTMLElement} params.drawerButton - Tombol untuk membuka/tutup drawer.
   * @param {HTMLElement} params.content - Elemen kontainer untuk konten halaman.
   */
  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._setupLogout();
  }

  /**
   * Mengatur event listener untuk drawer navigasi.
   * Menangani pembukaan dan penutupan drawer melalui tombol hamburger dan klik di luar.
   */
  _setupDrawer() {
    if (!this.#drawerButton || !this.#navigationDrawer) return;

    // Membuka atau menutup drawer dengan tombol hamburger
    this.#drawerButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.#navigationDrawer.classList.toggle("open");
    });

    // Menutup drawer jika klik di luar atau pada link di dalam drawer
    document.body.addEventListener("click", (event) => {
      const navDrawer = this.#navigationDrawer;
      const drawerBtn = this.#drawerButton;

      if (navDrawer && navDrawer.classList.contains('open')) {
        // Menutup jika klik di luar drawer dan bukan tombol hamburger
        if (drawerBtn && !navDrawer.contains(event.target) && !drawerBtn.contains(event.target)) {
          navDrawer.classList.remove("open");
        }
        // Menutup jika link di dalam drawer diklik
        else if (navDrawer.contains(event.target) && event.target.closest('a')) {
          navDrawer.classList.remove("open");
        }
      }
    });
  }

  /**
   * Mengatur event listener untuk tombol logout.
   * Menghapus token autentikasi, memperbarui visibilitas navbar, dan mengarahkan ke halaman login.
   */
  _setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
      removeAccessToken();
      localStorage.removeItem("user_id");

      this._updateNavbarVisibility(false);

      window.location.hash = "#/login";
    });
  }

  /**
   * Memperbarui visibilitas item navbar berdasarkan status login.
   * @param {boolean} isLogin - Status login pengguna.
   */
  _updateNavbarVisibility(isLogin) {
    const navItemsLoggedIn = [
      document.getElementById("nav-beranda"),
      document.getElementById("nav-tambah"),
      document.getElementById("nav-notifikasi"),
      document.getElementById("nav-bookmark"),
      document.getElementById("nav-about"),
      document.getElementById("nav-logout"),
    ];
    const navItemsLoggedOut = [
      document.getElementById("nav-login"),
      document.getElementById("nav-register"),
    ];

    if (isLogin) {
      navItemsLoggedIn.forEach(item => item?.classList.remove('hidden'));
      navItemsLoggedOut.forEach(item => item?.classList.add('hidden'));
    } else {
      navItemsLoggedIn.forEach(item => item?.classList.add('hidden'));
      navItemsLoggedOut.forEach(item => item?.classList.remove('hidden'));
    }

    if (this.#navigationDrawer) {
      this.#navigationDrawer.classList.remove('open');
    }
  }

  /**
   * Merender halaman aktif berdasarkan rute saat ini.
   * Mengecek status login, memperbarui navbar, dan menangani rendering halaman.
   */
  async renderPage() {
    const isLogin = !!getAccessToken();
    const url = getActiveRoute();

    this._updateNavbarVisibility(isLogin);

    let pageLoader = routes[url];

    if (!pageLoader) {
      console.warn(`Rute tidak ditemukan: ${url}`);
      location.hash = isLogin ? "#/" : "#/login";
      return;
    }

    let page = typeof pageLoader === "function" ? pageLoader() : pageLoader;

    if (!page) {
      console.warn(`Halaman tidak bisa dimuat untuk rute: ${url}. Mungkin karena checkAuth gagal/redirect.`);
      return;
    }

    try {
      this.#content.innerHTML = await page.render();
      if (page.afterRender && typeof page.afterRender === 'function') {
        await page.afterRender();
      } else {
        console.warn(`Metode afterRender tidak ditemukan atau bukan fungsi di halaman untuk rute: ${url}`);
      }
    } catch (error) {
      console.error(`Error saat merender atau afterRender halaman ${url}:`, error);
      this.#content.innerHTML = `<p class="error-message">Terjadi kesalahan saat memuat halaman.</p>`;
    }
  }
}

export default App;
