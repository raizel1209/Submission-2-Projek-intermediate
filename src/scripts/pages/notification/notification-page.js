import {
  isPushNotificationSupported,
  subscribePushNotification,
  unsubscribePushNotification,
  getSubscriptionStatus,
} from "../../utils/notification-helper";
// 1. IMPORT FUNGSI UNTUK MENGAMBIL TOKEN
import { getAccessToken } from "../../utils/auth"; 

export default class NotificationPage {
  #toggleButton = null;
  #statusMessage = null;
  #token = null; // 2. Tambahkan properti untuk menyimpan token

  async render() {
    const isSupported = isPushNotificationSupported();
    const token = getAccessToken();
    const initialButtonState = isSupported && token ? 'Memeriksa Status...' : 'Tidak Tersedia';
    const isDisabled = !isSupported || !token;

    return `
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1 class="page-title">Pengaturan Notifikasi</h1>
        <p class="page-subtitle">Aktifkan atau nonaktifkan notifikasi push di perangkat Anda.</p>
        
        <div class="notification-toggle-container">
          <label for="notification-toggle" class="notification-toggle-label">
            Langganan Notifikasi Push
          </label>
          <button id="notification-toggle" class="btn" aria-pressed="false" ${isDisabled ? 'disabled' : ''}>
            ${initialButtonState}
          </button>
        </div>
        <p id="notification-status" class="notification-status-message">
          ${!isSupported ? 'Notifikasi tidak didukung di browser ini.' :
            !token ? 'Anda harus login untuk mengatur notifikasi.' : 
            'Memeriksa status notifikasi...'}
        </p>
      </section>
    `;
  }

  async afterRender() {
    console.log("Halaman Notifikasi: afterRender dimulai.");
    this.#toggleButton = document.getElementById("notification-toggle");
    this.#statusMessage = document.getElementById("notification-status");
    
    if (!this.#toggleButton || !this.#statusMessage) {
      console.error("Elemen tombol atau status tidak ditemukan.");
      return;
    }

    // Periksa dukungan notifikasi terlebih dahulu
    if (!isPushNotificationSupported()) {
      this.#statusMessage.textContent = "Notifikasi Push tidak didukung di browser ini.";
      this.#toggleButton.disabled = true;
      this.#toggleButton.textContent = "Tidak Didukung";
      return;
    }

    // Ambil dan simpan token
    this.#token = getAccessToken();
    
    // Cek status login
    if (!this.#token) {
      this.#statusMessage.textContent = "Anda harus login untuk mengatur notifikasi.";
      this.#toggleButton.disabled = true;
      this.#toggleButton.textContent = "Login Diperlukan";
      return;
    }

    // Cek status notifikasi browser
    const permission = Notification.permission;
    if (permission === 'denied') {
      this.#statusMessage.textContent = "Notifikasi diblokir. Harap aktifkan notifikasi di pengaturan browser.";
      this.#toggleButton.disabled = true;
      this.#toggleButton.textContent = "Diblokir oleh Browser";
      return;
    }

    // Inisialisasi status subscription
    try {
      const isSubscribed = await getSubscriptionStatus();
      this.#updateToggleButtonUI(isSubscribed);
      this.#toggleButton.disabled = false;
      this.#statusMessage.textContent = isSubscribed 
        ? "Notifikasi aktif" 
        : "Notifikasi tidak aktif";
      
      this.#toggleButton.addEventListener("click", this.#handleToggleClick.bind(this));
      console.log("Tombol toggle notifikasi berhasil diinisialisasi.");
    } catch (error) {
      console.error("Gagal menginisialisasi status notifikasi:", error);
      this.#statusMessage.textContent = "Gagal memuat status notifikasi. Silakan coba lagi.";
      this.#toggleButton.textContent = "Coba Lagi";
      this.#toggleButton.disabled = false;
    }

    this.#addFadeInEffect();
  }

  #updateButtonState(isSubscribed, isDisabled = false, message = '') {
    this.#updateToggleButtonUI(isSubscribed);
    this.#toggleButton.disabled = isDisabled;
    if (message) {
      this.#statusMessage.textContent = message;
    }
  }

  async #handleToggleClick() {
    const isCurrentlySubscribed = this.#toggleButton.getAttribute("aria-pressed") === "true";
    this.#toggleButton.disabled = true;
    this.#statusMessage.textContent = isCurrentlySubscribed ? "Memproses berhenti langganan..." : "Memproses langganan...";

    try {
      if (isCurrentlySubscribed) {
        // 4. Kirim token saat unsubscribe
        await unsubscribePushNotification(this.#token); 
        this.#updateToggleButtonUI(false);
        this.#statusMessage.textContent = "Berhasil berhenti berlangganan notifikasi.";
        console.log("Berhasil unsubscribe.");
      } else {
        // Minta izin dulu (browser prompt)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Izin notifikasi tidak diberikan.');
        }
        
        // Coba subscribe dengan retry jika gagal
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            await subscribePushNotification(this.#token);
            this.#updateToggleButtonUI(true);
            this.#statusMessage.textContent = "Berhasil berlangganan notifikasi.";
            console.log("Berhasil subscribe.");
            return;
          } catch (error) {
            console.error(`Subscribe attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            
            if (error.message.includes('Service Worker') || error.name === 'AbortError') {
              if (retryCount <= maxRetries) {
                this.#statusMessage.textContent = `Mencoba ulang... (${retryCount}/${maxRetries})`;
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            }
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Aksi notifikasi gagal:", error);
      this.#statusMessage.textContent = `Gagal: ${error.message}`;
      this.#updateToggleButtonUI(isCurrentlySubscribed); 
    } finally {
      this.#toggleButton.disabled = false;
    }
  }

  #updateToggleButtonUI(isSubscribed) {
    if (this.#toggleButton) {
      this.#toggleButton.textContent = isSubscribed ? "Nonaktifkan Notifikasi" : "Aktifkan Notifikasi";
      this.#toggleButton.setAttribute("aria-pressed", isSubscribed.toString());
    }
  }

  #addFadeInEffect() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in"); 
    }
  }
}