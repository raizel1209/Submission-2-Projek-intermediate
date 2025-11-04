import HomePresenter from "./home-presenter";
import * as ApiService from "../../data/api";

// 1. Import logika database (IndexedDB) untuk fitur bookmark
import BookmarkIdb from "../../data/database"; 
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 2. Import key yang benar untuk access token
import { ACCESS_TOKEN_KEY } from "../../config";

export default class HomePage {
  // Properti private untuk menyimpan instance
  #presenter = null;
  #map = null;
  #markers = [];
  #stories = []; // <-- Menyimpan data cerita saat ini untuk referensi (cth: bookmark)

  async render() {
    // 3. Periksa token otentikasi dari localStorage
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    const skipLink = `<a href="#first-story" class="skip-to-content">Skip to main content</a>`;

    // Jika tidak ada token, tampilkan pesan untuk login
    if (!token) {
      return `
        ${skipLink}
        <section class="container fade-in" id="main-content" tabindex="-1">
          <h1>Home Page</h1>
          <p>Tolong login dahulu.</p>
        </section>
      `;
    }

    // Jika ada token, render layout lengkap halaman utama
    return `
      ${skipLink}
      <section class="container fade-in" id="main-content" tabindex="-1">
        <div class="header-bar">
          <h1>Home Page</h1>
        <div id="map" style="height: 400px; margin-bottom: 20px;"></div>
        <div class="story-list-wrapper">
          <div id="stories-list" class="story-list">Loading stories...</div>
          <div style="margin-top: 1rem;">
            <button id="loadMoreBtn" class="load-more-btn" aria-label="Muat lebih banyak story">Load More</button>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    // 4. Jalankan setelah HTML di-render ke DOM. Cek ulang token.
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      window.location.hash = "#/login"; // Redirect ke login jika tidak ada token
      return;
    }

    // 5. Atur event listener untuk tombol logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        // Hapus token dan data user dari localStorage
        localStorage.removeItem(ACCESS_TOKEN_KEY); 
        localStorage.removeItem("user_id"); 
        window.location.hash = "#/login"; // Redirect ke login
      });
    }

    try {
      // Inisialisasi Presenter dengan view, model, dan token
      this.#presenter = new HomePresenter({
        view: this,
        model: ApiService,
        token: token,
      });

      await this.initialMap(); // Siapkan peta Leaflet
      await this.#presenter.loadInitialStories(); // Muat data cerita awal
      this.#addFadeInEffect(); // Tambahkan efek visual
      
      // 6. Pasang event listener untuk tombol 'Save' yang ada
      this.#attachSaveButtonsHandler(); 

      // Atur listener untuk tombol 'Load More'
      const loadMoreBtn = document.getElementById("loadMoreBtn");
      loadMoreBtn?.addEventListener("click", () => {
        this.#presenter.loadMoreStories();
      });

      // Listener global untuk klik pada item cerita
      document.addEventListener("click", (e) => {
        const storyItem = e.target.closest(".story-item");
        if (storyItem) {
          const lat = parseFloat(storyItem.dataset.lat);
          const lng = parseFloat(storyItem.dataset.lng);
          const storyId = storyItem.dataset.storyId;
          // Jika item cerita memiliki koordinat, fokuskan peta
          if (!isNaN(lat) && !isNaN(lng)) {
            this.#focusMapToStory(lat, lng, storyId);
          }
        }
      });
    } catch (error) {
      this.showError(error.message);
    }
  }

  async initialMap() {
    // Inisialisasi peta Leaflet dan pusatkan di Indonesia
    this.#map = L.map("map").setView([-2.5489, 118.0149], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.#map);

    // (Opsional) Menambahkan marker saat peta diklik
    this.#map.on("click", (e) => {
      const coordinate = e.latlng;
      this.#addMarker({
        coordinate: [coordinate.lat, coordinate.lng],
        title: "Lokasi Baru",
        description: "Lokasi dipilih!",
        isCurrentUser: true,
      });
    });
  }

  showStories(stories) {
    // 7. Simpan data cerita ke properti privat (#stories)
    this.#stories = stories; 
    
    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!stories || stories.length === 0) {
      container.innerHTML = "<p>Tidak ada story tersedia.</p>";
      return;
    }

    // Hapus marker lama dari peta
    this.#markers.forEach((marker) => marker.remove());
    this.#markers = [];

    // Render semua item cerita ke dalam kontainer
    container.innerHTML = stories
      .map((story, index) => this.#generateStoryItem(story, currentUserId, index))
      .join("");

    this.#addMarkersFromStories(stories, currentUserId); // Tambahkan marker baru ke peta
    
    // 8. Pasang ulang listener tombol 'Save' setelah render
    this.#attachSaveButtonsHandler(); 
  }

  appendStories(stories) {
    // 9. Tambahkan cerita baru ke array #stories (untuk 'load more')
    this.#stories.push(...stories); 

    const container = document.getElementById("stories-list");
    const currentUserId = String(localStorage.getItem("user_id"));

    if (!stories || stories.length === 0) return;

    // Buat HTML untuk cerita baru
    const newContent = stories
      .map((story) => this.#generateStoryItem(story, currentUserId))
      .join("");

    // Tambahkan HTML baru ke akhir list (lebih efisien daripada innerHTML)
    container.insertAdjacentHTML("beforeend", newContent);
    this.#addMarkersFromStories(stories, currentUserId); // Tambahkan marker baru ke peta
    
    // 10. Pasang ulang listener tombol 'Save' untuk item baru
    this.#attachSaveButtonsHandler(); 
  }

  // Menghasilkan string HTML untuk satu item cerita
  #generateStoryItem(story, currentUserId, index = -1) {
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
          Save Story
        </button>
      </div>`;
  }

  // 12. Fungsi untuk memasang event listener ke semua tombol 'Save'
  #attachSaveButtonsHandler() {
    const buttons = document.querySelectorAll(".save-story-btn");
    buttons.forEach((btn) => {
      // Teknik kloning untuk menghapus listener lama agar tidak duplikat
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Pasang listener baru ke tombol yang sudah di-kloning
    document.querySelectorAll(".save-story-btn").forEach((btn) => {
        btn.addEventListener('click', async (event) => {
          const id = event.target.getAttribute("data-id");
          if (!this.#stories || this.#stories.length === 0) {
              console.error('Data #stories kosong, tidak bisa menyimpan bookmark.');
              alert('Data cerita tidak tersedia untuk disimpan.');
              return;
          }
          // Cari data lengkap cerita dari array #stories
          const storyToSave = this.#stories.find((s) => String(s.id) === id);

          if (!storyToSave) {
            alert("Cerita tidak ditemukan untuk disimpan.");
            return;
          }

          event.target.disabled = true; // Nonaktifkan tombol
          event.target.textContent = 'Menyimpan...';

          try {
            // Simpan cerita ke IndexedDB
            await BookmarkIdb.saveBookmark(storyToSave);
            alert("Cerita berhasil disimpan ke bookmark!");
            event.target.textContent = 'Tersimpan'; // Ubah teks tombol
          } catch (error) {
            alert("Gagal menyimpan cerita: " + error.message);
            event.target.disabled = false; // Aktifkan kembali jika gagal
            event.target.textContent = 'Save Story';
          }
        });
    });
  }

  // Menambahkan marker ke peta dari data cerita
  #addMarkersFromStories(stories, currentUserId) {
      stories.forEach((story) => {
      const lat = story.lat || (story.location && story.location.latitude);
      const lon = story.lon || (story.location && story.location.longitude);
      const storyUserId = String(story.userId || (story.user && story.user.id));
      const isCurrentUser = storyUserId === currentUserId;

      // Hanya tambahkan marker jika ada koordinat lat/lon
      if (lat && lon) {
        this.#addMarker({
          coordinate: [parseFloat(lat), parseFloat(lon)],
          title: story.name || "Tidak ada judul",
          description: story.description || "Tidak ada deskripsi",
          photoUrl: story.photoUrl,
          isCurrentUser,
          id: story.id,
        });
      }
    });

    // Sesuaikan zoom peta agar semua marker terlihat
    if (this.#markers.length > 0) {
      const group = L.featureGroup(this.#markers);
      this.#map.fitBounds(group.getBounds());
    }
  }

  // Fungsi internal untuk membuat satu marker
  #addMarker({ coordinate, title, description, photoUrl = null, isCurrentUser = false, id = null }) {
    // Tentukan ikon marker (biru untuk user saat ini, merah untuk user lain)
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

    // Konten HTML untuk popup marker
    const popupContent = `
      <div class="marker-popup" style="max-width: 200px;">
        <h4 class="marker-title" style="margin: 0 0 8px 0; color: ${isCurrentUser ? "#2563eb" : "#dc2626"}">${title}</h4>
        ${photoUrl ? `<img src="${photoUrl}" alt="Foto cerita" style="width: 100%; border-radius: 4px; margin: 8px 0;" />` : ""}
        <p style="margin: 8px 0;">${description}</p>
        <p style="margin: 4px 0; font-size: 0.875rem; color: ${isCurrentUser ? "#2563eb" : "#dc2626"}">
          <strong>${isCurrentUser ? "Story Saya" : "Story User"}</strong>
        </p>
      </div>
    `;

    const marker = L.marker(coordinate, { icon }).bindPopup(popupContent).addTo(this.#map);
    if (id) marker.storyId = id; // Simpan ID cerita di marker untuk referensi
    this.#markers.push(marker);
  }

  // Memfokuskan peta ke lokasi cerita tertentu
  #focusMapToStory(lat, lng, storyId) {
    if (!this.#map) return;

    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    this.#map.setView([lat, lng], 14); // Atur view peta dan zoom

    // Cari marker yang sesuai dan buka popup-nya
    const marker = this.#markers.find((m) => m.storyId === storyId);
    if (marker) marker.openPopup();
  }

  // Menampilkan pesan error di area daftar cerita
  showError(message) {
    const container = document.getElementById("stories-list");
    container.innerHTML = `<p class="error-message">Error: ${message}</p>`;

    // 13. Tangani error 401 (Unauthorized) dengan me-logout user
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      localStorage.removeItem(ACCESS_TOKEN_KEY); 
      setTimeout(() => {
        window.location.hash = "#/login"; // Redirect ke login
      }, 2000);
    }
  }

  // Menambahkan efek fade-in sederhana
  #addFadeInEffect() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}