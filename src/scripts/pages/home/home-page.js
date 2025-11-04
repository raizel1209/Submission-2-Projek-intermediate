/**
 * Kelas HomePage menangani logika rendering dan interaksi untuk halaman utama,
 * termasuk inisialisasi peta, tampilan cerita, penyimpanan bookmark, dan pemeriksaan autentikasi pengguna.
 */
export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = [];
  #stories = [];

  /**
   * Merender HTML halaman utama berdasarkan status autentikasi pengguna.
   * @returns {string} String HTML untuk halaman utama.
   */
  async render() {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const skipLink = `<a href="#first-story" class="skip-to-content">Lewati ke konten utama</a>`;

    if (!token) {
      return `
        ${skipLink}
        <section class="container fade-in" id="main-content" tabindex="-1">
          <h1>Halaman Utama</h1>
          <p>Silakan login terlebih dahulu.</p>
        </section>
      `;
    }

    return `
      ${skipLink}
      <section class="container fade-in" id="main-content" tabindex="-1">
        <div class="header-bar">
          <h1>Halaman Utama</h1>
        </div>
        <div id="map" style="height: 400px; margin-bottom: 20px;"></div>
        <div class="story-list-wrapper">
          <div id="stories-list" class="story-list">Memuat cerita...</div>
          <div style="margin-top: 1rem;">
            <button id="loadMoreBtn" class="load-more-btn" aria-label="Muat lebih banyak cerita">Muat Lebih Banyak</button>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Menginisialisasi halaman setelah rendering, menyiapkan event listener dan memuat data awal.
   */
  async afterRender() {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      window.location.hash = "#/login";
      return;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem("user_id");
        window.location.hash = "#/login";
      });
    }

    try {
      this.#presenter = new HomePresenter({
        view: this,
        model: ApiService,
        token,
      });

      await this.#inisialisasiPeta();
      await this.#presenter.loadInitialStories();
      this.#terapkanEfekFadeIn();
      this.#pasangHandlerTombolSimpan();

      const loadMoreBtn = document.getElementById("loadMoreBtn");
      loadMoreBtn?.addEventListener("click", () => {
        this.#presenter.loadMoreStories();
      });

      document.addEventListener("click", (e) => {
        const storyItem = e.target.closest(".story-item");
        if (storyItem) {
          const lat = parseFloat(storyItem.dataset.lat);
          const lng = parseFloat(storyItem.dataset.lng);
          const storyId = storyItem.dataset.storyId;
          if (!isNaN(lat) && !isNaN(lng)) {
            this.#fokusPetaKeCerita(lat, lng, storyId);
          }
        }
      });
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * Menginisialisasi peta Leaflet dengan pengaturan default dan event handler.
   */
  async #inisialisasiPeta() {
    this.#map = L.map("map").setView([-2.5489, 118.0149], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© Kontributor OpenStreetMap",
    }).addTo(this.#map);

    this.#map.on("click", (e) => {
      const coordinate = e.latlng;
      this.#tambahkanMarker({
        coordinate: [coordinate.lat, coordinate.lng],
        title: "Lokasi Baru",
        description: "Lokasi dipilih!",
        isCurrentUser: true,
      });
    });
  }

  /**
   * Menampilkan daftar cerita, memperbarui UI dan marker peta.
   * @param {Array} stories - Array objek cerita untuk ditampilkan.
   */
  showStories(stories) {
    this.#stories = stories;
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!stories || stories.length === 0) {
      container.innerHTML = "<p>Tidak ada cerita tersedia.</p>";
      return;
    }

    this.#markers.forEach((marker) => marker.remove());
    this.#markers = [];

    container.innerHTML = stories
      .map((story, index) => this.#buatItemCerita(story, currentUserId, index))
      .join("");

    this.#tambahkanMarkerDariCerita(stories, currentUserId);
    this.#pasangHandlerTombolSimpan();
  }

  /**
   * Menambahkan cerita tambahan ke daftar yang ada tanpa menghapus yang sebelumnya.
   * @param {Array} stories - Array objek cerita baru untuk ditambahkan.
   */
  appendStories(stories) {
    this.#stories.push(...stories);
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!stories || stories.length === 0) return;

    const newContent = stories
      .map((story) => this.#buatItemCerita(story, currentUserId))
      .join("");

    container.insertAdjacentHTML("beforeend", newContent);
    this.#tambahkanMarkerDariCerita(stories, currentUserId);
    this.#pasangHandlerTombolSimpan();
  }

  /**
   * Membuat HTML untuk satu item cerita.
   * @param {Object} story - Objek cerita.
   * @param {string} currentUserId - ID pengguna saat ini.
   * @param {number} index - Indeks cerita dalam daftar.
   * @returns {string} String HTML untuk item cerita.
   */
  #buatItemCerita(story, currentUserId, index = -1) {
    const storyUserId = String(story.userId || (story.user && story.user.id));
    const isCurrentUser = storyUserId === currentUserId;
    const lat = story.lat || "";
    const lon = story.lon || "";

    return `
      <div
        class="story-item ${isCurrentUser ? "my-story" : "other-story"}"
        ${index === 0 ? 'id="first-story" tabindex="0"' : ""}
        data-story-id="${story.id}"
        data-lat="${lat}"
        data-lng="${lon}"
      >
        <img src="${story.photoUrl}" alt="Foto cerita" class="story-image">
        <h3>${story.name || "Nama tidak tersedia"}</h3>
        <p>${story.description || "Deskripsi tidak tersedia"}</p>
        <p><strong>Dibuat pada:</strong> ${new Date(
          story.createdAt
        ).toLocaleString("id-ID", {
          dateStyle: "full",
          timeStyle: "short",
        })}</p>
        ${lat && lon ? `<p><strong>Lokasi:</strong> ${lat}, ${lon}</p>` : ""}
        <button class="btn save-story-btn" data-id="${story.id}" aria-label="Simpan cerita ${story.name || ''}">
          Simpan Cerita
        </button>
      </div>`;
  }

  /**
   * Memasang event listener pada tombol simpan untuk menyimpan bookmark cerita.
   */
  #pasangHandlerTombolSimpan() {
    const buttons = document.querySelectorAll(".save-story-btn");
    buttons.forEach((btn) => {
      btn.replaceWith(btn.cloneNode(true));
    });

    document.querySelectorAll(".save-story-btn").forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        const id = event.target.getAttribute("data-id");
        if (!this.#stories || this.#stories.length === 0) {
          console.error('Data cerita kosong, tidak dapat menyimpan bookmark.');
          alert('Data cerita tidak tersedia untuk disimpan.');
          return;
        }
        const storyToSave = this.#stories.find((s) => String(s.id) === id);

        if (!storyToSave) {
          alert("Cerita tidak ditemukan untuk disimpan.");
          return;
        }

        event.target.disabled = true;
        event.target.textContent = 'Menyimpan...';

        try {
          await BookmarkIdb.saveBookmark(storyToSave);
          alert("Cerita berhasil disimpan ke bookmark!");
          event.target.textContent = 'Tersimpan';
        } catch (error) {
          alert("Gagal menyimpan cerita: " + error.message);
          event.target.disabled = false;
          event.target.textContent = 'Simpan Cerita';
        }
      });
    });
  }

  /**
   * Menambahkan marker ke peta berdasarkan cerita yang diberikan.
   * @param {Array} stories - Array objek cerita.
   * @param {string} currentUserId - ID pengguna saat ini.
   */
  #tambahkanMarkerDariCerita(stories, currentUserId) {
    stories.forEach((story) => {
      const lat = story.lat || (story.location && story.location.latitude);
      const lon = story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = storyUserId === currentUserId;

      if (lat && lon) {
        this.#tambahkanMarker({
          coordinate: [parseFloat(lat), parseFloat(lon)],
          title: story.name || "Tidak ada judul",
          description: story.description || "Tidak ada deskripsi",
          photoUrl: story.photoUrl,
          isCurrentUser,
          id: story.id,
        });
      }
    });

    if (this.#markers.length > 0) {
      const group = L.featureGroup(this.#markers);
      this.#map.fitBounds(group.getBounds());
    }
  }

  /**
   * Menambahkan satu marker ke peta.
   * @param {Object} params - Parameter untuk marker.
   * @param {Array} params.coordinate - Koordinat [lat, lng].
   * @param {string} params.title - Judul marker.
   * @param {string} params.description - Deskripsi marker.
   * @param {string} [params.photoUrl] - URL foto opsional.
   * @param {boolean} [params.isCurrentUser] - Apakah marker milik pengguna saat ini.
   * @param {string} [params.id] - ID cerita.
   */
  #tambahkanMarker({ coordinate, title, description, photoUrl = null, isCurrentUser = false, id = null }) {
    const icon = L.icon({
      iconUrl: isCurrentUser
        ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
        : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    });

    const popupContent = `
      <div class="marker-popup" style="max-width: 200px;">
        <h4 class="marker-title" style="margin: 0 0 8px 0; color: ${isCurrentUser ? "#2563eb" : "#dc2626"}">${title}</h4>
        ${photoUrl ? `<img src="${photoUrl}" alt="Foto cerita" style="width: 100%; border-radius: 4px; margin: 8px 0;" />` : ""}
        <p style="margin: 8px 0;">${description}</p>
        <p style="margin: 4px 0; font-size: 0.875rem; color: ${isCurrentUser ? "#2563eb" : "#dc2626"}">
          <strong>${isCurrentUser ? "Cerita Saya" : "Cerita Pengguna"}</strong>
        </p>
      </div>
    `;

    const marker = L.marker(coordinate, { icon }).bindPopup(popupContent).addTo(this.#map);
    if (id) marker.storyId = id;
    this.#markers.push(marker);
  }

  /**
   * Memfokuskan tampilan peta pada lokasi cerita tertentu dan membuka popup-nya.
   * @param {number} lat - Lintang.
   * @param {number} lng - Bujur.
   * @param {string} storyId - ID cerita.
   */
  #fokusPetaKeCerita(lat, lng, storyId) {
    if (!this.#map) return;

    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    this.#map.setView([lat, lng], 14);

    const marker = this.#markers.find((m) => m.storyId === storyId);
    if (marker) marker.openPopup();
  }

  /**
   * Menampilkan pesan error dan menangani error autentikasi.
   * @param {string} message - Pesan error.
   */
  showError(message) {
    const container = document.getElementById("stories-list");
    container.innerHTML = `<p class="error-message">Error: ${message}</p>`;

    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setTimeout(() => {
        window.location.hash = "#/login";
      }, 2000);
    }
  }

  /**
   * Menerapkan efek fade-in pada kontainer utama.
   */
  #terapkanEfekFadeIn() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}

// Pernyataan import dipindahkan ke akhir untuk organisasi yang lebih baik
import HomePresenter from "./home-presenter";
import * as ApiService from "../../data/api";
import BookmarkIdb from "../../data/database";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ACCESS_TOKEN_KEY } from "../../config";
