import AddStoryPresenter from "./addStory-presenter";
import * as ApiService from "../../data/api";
import Map from "../../utils/map";
import "leaflet/dist/leaflet.css";

// 1. Import konstanta key untuk access token
import { ACCESS_TOKEN_KEY } from "../../config"; 

export default class AddStory {
  // Properti privat untuk internal state management
  #presenter = null;
  #form = null;
  #stream = null; // Menyimpan stream kamera untuk dihentikan nanti
  #map = null;
  #capturedImage = null; // Menyimpan file gambar hasil tangkapan kamera

  async render() {
    // 2. Validasi token otentikasi sebelum merender
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    // Jika tidak terotentikasi, tampilkan pesan error
    if (!token) {
      return `
        <section class="container">
          <h2>Tambah Cerita</h2>
          <p>Silakan login terlebih dahulu untuk mengakses fitur ini.</p>
        </section>
      `;
    }

    // Render form tambah cerita jika terotentikasi
    return `
      <section class="container fade-in">
        <h2>Tambah Cerita Baru</h2>
        <div id="notification-area" style="display: none;"></div>
        <form id="add-story-form" enctype="multipart/form-data">
          <div class="form-control">
            <label for="description">Deskripsi</label>
            <textarea id="description" name="description" placeholder="Tulis cerita Anda..." required></textarea>
          </div>
          <div class="form-control">
            <label>Ambil Gambar dari Kamera:</label><br>
            <video id="camera-stream" autoplay playsinline width="100%" aria-label="Stream kamera untuk mengambil foto"></video>
            <button type="button" id="capture-btn" class="btn">Ambil Foto</button>
            <canvas id="photo-canvas" style="display:none;" aria-label="Canvas untuk menampilkan foto hasil tangkapan kamera"></canvas>
            <label for="photo" class="mt-3 d-block">Atau pilih foto dari perangkat:</label>
            <input type="file" id="photo" name="photo" accept="image/jpeg,image/png" />
          </div>
          <div class="form-control">
            <label>
              <input type="checkbox" id="use-location" name="useLocation">
              Gunakan Lokasi Otomatis (GPS)
            </label>
          </div>
          <div class="form-control">
            <label>Pilih Lokasi Manual (Opsional):</label>
            <div id="map" style="height: 300px;"></div>
            <input type="hidden" id="lat" name="lat" />
            <input type="hidden" id="lon" name="lon" />
          </div>
          <div class="form-buttons">
            <span id="submit-button-container">
              <button type="submit" class="btn">Kirim Cerita</button>
            </span>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    // 3. Validasi token pasca-render
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      window.location.hash = "#/login"; // 4. Redirect ke halaman login
      return;
    }

    // 5. Inisialisasi presenter dan teruskan token otentikasi
    this.#presenter = new AddStoryPresenter({
      view: this,
      model: ApiService,
      token: token, // <-- Teruskan token ke presenter
    });
    
    this.#form = document.getElementById("add-story-form");
    
    // Inisialisasi fungsionalitas pendukung
    this.#setupCamera();
    this.#setupMap();
    this.#addFadeInEffect();

    // Tambahkan listener untuk event submit form
    this.#form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Cegah submit form bawaan
      
      // Ambil nilai dari form
      const description = this.#form.description.value.trim();
      const imageFile = this.#form.photo.files[0] || this.#capturedImage;
      const useLocation = this.#form.useLocation.checked;

      // Validasi input
      if (!description || !imageFile) {
        this.#showNotification("Deskripsi dan foto wajib diisi.", "error");
        return;
      }
      // Validasi ukuran file (batas 1MB)
      if (imageFile.size > 1_000_000) {
        this.#showNotification("Ukuran foto melebihi 1MB.", "error");
        return;
      }

      // Logika penanganan lokasi
      let lat = document.getElementById("lat").value;
      let lon = document.getElementById("lon").value;
      
      // Jika user memilih lokasi otomatis dan data lat/lon belum ada
      if (useLocation && (!lat || !lon)) {
        try {
          const position = await Map.getCurrentPosition();
          lat = position.coords.latitude;
          lon = position.coords.longitude;
        } catch {
          this.#showNotification("Gagal mendapatkan lokasi otomatis.", "error");
        }
      }
      
      // Siapkan FormData untuk dikirim
      const formData = new FormData();
      formData.append("description", description);
      formData.append("photo", imageFile);
      if (lat && lon) {
        formData.append("lat", lat);
        formData.append("lon", lon);
      }

      // Kirim data melalui presenter
      await this.#presenter.submitStory(formData);
      this.#stopCamera(); // Hentikan stream kamera setelah submit
    });

    // Tambahkan event listener untuk membersihkan resource kamera
    window.addEventListener("beforeunload", this.#stopCamera.bind(this));
    window.addEventListener("hashchange", this.#stopCamera.bind(this));
    document.addEventListener("visibilitychange", this.#handleVisibilityChange.bind(this));
  }

  // --- Implementasi Fungsi Internal ---

  /**
   * Menginisialisasi stream kamera untuk mengambil foto.
   */
  #setupCamera() {
    const video = document.getElementById("camera-stream");
    const photoInput = document.getElementById("photo");
    
    // Meminta akses ke kamera user
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      this.#stream = stream;
      video.srcObject = stream;
    }).catch(() => {
      this.#showNotification("Kamera tidak tersedia. Izinkan akses kamera di browser.", "error");
    });

    // Event listener untuk tombol 'Ambil Foto'
    document.getElementById("capture-btn").addEventListener("click", () => {
      const canvas = document.getElementById("photo-canvas");
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      
      // Menggambar frame video saat ini ke canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Konversi canvas ke Blob, lalu ke File
      canvas.toBlob((blob) => {
        // Validasi ukuran file sekali lagi
        if (blob.size > 1_000_000) {
          this.#showNotification("Ukuran foto dari kamera melebihi 1MB.", "error");
          return;
        }
        // Simpan gambar sebagai file
        this.#capturedImage = new File([blob], "capture.jpg", { type: "image/jpeg" });
        this.#showNotification("Foto berhasil diambil dari kamera.", "success");
        photoInput.value = ""; // Reset input file
        this.#stopCamera(); // Matikan kamera setelah berhasil
        video.style.display = 'none'; // Sembunyikan elemen video
      }, "image/jpeg", 0.8); // Kompresi JPEG 80%
    });
  }

  /**
   * Menginisialisasi peta Leaflet untuk pemilihan lokasi.
   */
  async #setupMap() {
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Elemen #map tidak ditemukan. Peta tidak bisa diinisialisasi.");
      this.#showNotification("Elemen peta tidak ditemukan. Coba muat ulang halaman.", "error");
      return;
    }
      
    try {
      // Menggunakan Map utility untuk membangun peta
      this.#map = await Map.build("#map", {
        center: [-6.2, 106.8], // Default: Jakarta
        zoom: 13,
      });

      let marker;
      // Event listener untuk klik pada peta
      this.#map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        if (marker) {
          this.#map.removeLayer(marker); // Hapus marker sebelumnya
        }
        // Tambahkan marker baru di lokasi klik
        marker = this.#map.addMarker([lat, lng], {}, {
          content: `Lokasi dipilih:<br>Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`,
        });
        marker.openPopup();
        // Set nilai input hidden
        document.getElementById("lat").value = lat;
        document.getElementById("lon").value = lng;
      });
    } catch (error) {
      console.error("Terjadi error saat memuat peta:", error);
      this.#showNotification(`Gagal memuat peta: ${error.message}`, "error");
    }
  }

  /**
   * Menghentikan stream kamera untuk melepaskan resource.
   */
  #stopCamera() {
    if (this.#stream) {
      this.#stream.getTracks().forEach((track) => track.stop());
      this.#stream = null;
    }
  }
  
  /**
   * Menangani perubahan visibilitas tab (misal: user ganti tab).
   */
  #handleVisibilityChange() {
    if (document.hidden) {
      this.#stopCamera(); // Hentikan kamera jika tab tidak aktif
    }
  }
  
  /**
   * Menambahkan efek visual fade-in.
   */
  #addFadeInEffect() {
    const container = document.querySelector(".container");
    container.classList.add("fade-in");
  }
  
  /**
   * Menampilkan notifikasi sementara kepada user.
   * @param {string} message - Pesan yang akan ditampilkan.
   * @param {string} [type="info"] - Tipe notifikasi ('info', 'success', 'error').
   */
  #showNotification(message, type = "info") {
    const notificationArea = document.getElementById("notification-area");
    if (!notificationArea) return;
    notificationArea.textContent = message;
    notificationArea.className = `notification ${type}`;
    notificationArea.style.display = "block";
    
    // Sembunyikan notifikasi setelah 4 detik
    setTimeout(() => {
      notificationArea.style.display = "none";
    }, 4000);
  }

  // --- Fungsi Callback untuk Presenter ---

  /**
   * Dipanggil oleh Presenter saat submit berhasil.
   * @param {string} message - Pesan sukses.
   */
  showSubmitSuccess(message) {
    this.#showNotification(message, "success");
    this.#form.reset();
    
    // 6. Redirect ke halaman utama setelah sukses
    setTimeout(() => {
      // Gunakan View Transitions jika didukung
      if ("startViewTransition" in document) {
        document.startViewTransition(() => { location.hash = "#/"; });
      } else {
        location.hash = "#/";
      }
    }, 100);
  }

  /**
   * Dipanggil oleh Presenter saat submit gagal.
   * @param {string} message - Pesan error.
   */
  showSubmitError(message) {
    this.#showNotification(message, "error");
    this.hideSubmitLoadingButton(); // Kembalikan tombol ke state normal
  }
  
  /**
   * Menampilkan state loading pada tombol submit.
   */
  showSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button type="submit" class="btn" disabled>
        <i class="fas fa-spinner loader-button"></i> Mengirim...
      </button>
    `;
  }

  /**
   * Mengembalikan tombol submit ke state normal.
   */
  hideSubmitLoadingButton() {
    document.getElementById("submit-button-container").innerHTML = `
      <button type="submit" class="btn">Kirim Cerita</button>
    `;
  }
}