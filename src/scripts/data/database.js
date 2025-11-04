// Modul database untuk pengelolaan bookmark cerita menggunakan IndexedDB

import { openDB } from 'idb';

// Konstanta untuk nama database, object store, dan versi
const DB_NAME = 'story-bookmarks-db';
const BOOKMARK_STORE_NAME = 'bookmarks';
const DB_VERSION = 1;

// Membuka atau membuat database dengan konfigurasi upgrade
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Membuat object store jika belum ada
    if (!db.objectStoreNames.contains(BOOKMARK_STORE_NAME)) {
      // 'id' akan menjadi kunci utama
      db.createObjectStore(BOOKMARK_STORE_NAME, { keyPath: 'id' });
      console.log(`Object store '${BOOKMARK_STORE_NAME}' berhasil dibuat.`);
    }
  },
});

const BookmarkIdb = {
  /**
   * Mengambil satu bookmark berdasarkan ID.
   * @param {string} id - ID cerita yang akan diambil.
   * @returns {Promise<Object|undefined>} Objek bookmark atau undefined jika tidak ditemukan.
   */
  async getBookmark(id) {
    if (!id) {
      console.error('ID tidak boleh kosong untuk getBookmark');
      return undefined;
    }
    const db = await dbPromise;
    return db.get(BOOKMARK_STORE_NAME, id);
  },

  /**
   * Mengambil semua bookmark yang tersimpan.
   * @returns {Promise<Array>} Array dari semua objek bookmark.
   */
  async getAllBookmarks() {
    const db = await dbPromise;
    return db.getAll(BOOKMARK_STORE_NAME);
  },

  /**
   * Menyimpan atau memperbarui bookmark (operasi Create/Update).
   * @param {Object} story - Objek cerita yang akan disimpan atau diperbarui.
   * @returns {Promise} Promise yang menunjukkan hasil operasi penyimpanan.
   */
  async saveBookmark(story) {
    if (!story || !story.id) {
      console.error('Data cerita tidak valid untuk saveBookmark');
      return undefined;
    }
    const db = await dbPromise;
    // Operasi 'put' akan menambahkan jika belum ada, atau memperbarui jika sudah ada
    return db.put(BOOKMARK_STORE_NAME, story);
  },

  /**
   * Menghapus bookmark berdasarkan ID (operasi Delete).
   * @param {string} id - ID cerita yang akan dihapus.
   * @returns {Promise} Promise yang menunjukkan hasil operasi penghapusan.
   */
  async deleteBookmark(id) {
    if (!id) {
      console.error('ID tidak boleh kosong untuk deleteBookmark');
      return undefined;
    }
    const db = await dbPromise;
    return db.delete(BOOKMARK_STORE_NAME, id);
  },
};

export default BookmarkIdb;