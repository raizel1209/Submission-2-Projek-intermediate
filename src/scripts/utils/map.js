import L, { map, tileLayer, marker, icon } from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "leaflet/dist/leaflet.css";

/**
 * Kelas wrapper untuk peta Leaflet dengan fitur tambahan.
 * Menyediakan antarmuka yang lebih sederhana untuk membuat dan mengelola peta.
 */
export default class Map {
  #zoom = 5;
  #map = null;

  /**
   * Mengecek apakah Geolocation API tersedia di browser.
   * @returns {boolean} True jika tersedia, false jika tidak.
   */
  static isGeolocationAvailable() {
    return "geolocation" in navigator;
  }

  /**
   * Mendapatkan posisi geografis saat ini pengguna.
   * @param {Object} options - Opsi untuk getCurrentPosition.
   * @returns {Promise<GeolocationPosition>} Promise yang resolve dengan posisi.
   */
  static getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!Map.isGeolocationAvailable()) {
        reject("Geolocation API unsupported");
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Membangun instance Map dengan opsi yang ditentukan.
   * @param {string} selector - Selector CSS untuk elemen peta.
   * @param {Object} options - Opsi untuk pembuatan peta.
   * @returns {Promise<Map>} Promise yang resolve dengan instance Map.
   */
  static async build(selector, options = {}) {
    if ("center" in options && options.center) {
      return new Map(selector, options);
    }
    const jakartaCoordinate = [-6.2, 106.816666];
    if ("locate" in options && options.locate) {
      try {
        const position = await Map.getCurrentPosition();
        const coordinate = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        return new Map(selector, { ...options, center: coordinate });
      } catch (error) {
        console.error("build: error:", error);
        return new Map(selector, { ...options, center: jakartaCoordinate });
      }
    }
    return new Map(selector, { ...options, center: jakartaCoordinate });
  }

  /**
   * Konstruktor untuk membuat instance Map.
   * @param {string} selector - Selector CSS untuk elemen peta.
   * @param {Object} options - Opsi untuk inisialisasi peta.
   */
  constructor(selector, options = {}) {
    this.#zoom = options.zoom ?? this.#zoom;
    const tileOsm = tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }
    );
    const satellite = tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri'
    });
    this.#map = map(document.querySelector(selector), {
      zoom: this.#zoom,
      scrollWheelZoom: false,
      layers: [tileOsm],
      ...options,
    });
    const baseMaps = {
      "Street": tileOsm,
      "Satellite": satellite
    };
    L.control.layers(baseMaps).addTo(this.#map);
  }

  /**
   * Membuat ikon marker dengan opsi kustom.
   * @param {Object} options - Opsi untuk ikon marker.
   * @returns {L.Icon} Instance ikon Leaflet.
   */
  createIcon(options = {}) {
    return icon({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      ...options,
    });
  }

  /**
   * Menambahkan marker ke peta pada koordinat tertentu.
   * @param {Array<number>} coordinates - Koordinat [latitude, longitude].
   * @param {Object} markerOptions - Opsi untuk marker.
   * @param {Object|null} popupOptions - Opsi untuk popup (harus memiliki properti content).
   * @returns {L.Marker} Instance marker yang ditambahkan.
   */
  addMarker(coordinates, markerOptions = {}, popupOptions = null) {
    const newMarker = marker(coordinates, {
      icon: this.createIcon(),
      ...markerOptions,
    });
    if (popupOptions) {
      if (typeof popupOptions !== "object" || !("content" in popupOptions)) {
        throw new Error("popupOptions must be an object with a `content` property.");
      }
      newMarker.bindPopup(popupOptions.content);
    }
    newMarker.addTo(this.#map);
    return newMarker;
  }

  /**
   * Mendaftarkan event listener pada peta.
   * @param {string} event - Nama event.
   * @param {Function} callback - Fungsi callback untuk event.
   */
  on(event, callback) {
    this.#map.on(event, callback);
  }

  /**
   * Menghapus layer dari peta.
   * @param {L.Layer} layer - Layer yang akan dihapus.
   */
  removeLayer(layer) {
    this.#map.removeLayer(layer);
  }
}

