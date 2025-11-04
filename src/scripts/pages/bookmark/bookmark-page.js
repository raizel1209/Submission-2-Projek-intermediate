import BookmarkIdb from "../../data/database";

export default class BookmarkPage {
  #bookmarkListContainer = null;

  async render() {
    return `
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1 class="page-title">Cerita Tersimpan (Bookmarks)</h1>
        <p class="page-subtitle">Daftar cerita yang telah Anda simpan secara lokal.</p>
        
        <div id="bookmark-list" class="story-list bookmark-list">
          <p>Memuat bookmark...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log("Halaman Bookmark berhasil di-render.");
    this.#bookmarkListContainer = document.getElementById("bookmark-list");

    if (!this.#bookmarkListContainer) {
      console.error("Elemen #bookmark-list tidak ditemukan.");
      return;
    }

    await this.#loadBookmarks();
    this.#addFadeInEffect();
  }


  async #loadBookmarks() {
    try {
      const bookmarks = await BookmarkIdb.getAllBookmarks();
      this.#displayBookmarks(bookmarks);
    } catch (error) {
      console.error("Gagal memuat bookmark:", error);
      this.#bookmarkListContainer.innerHTML = '<p class="error-message">Gagal memuat bookmark. Coba lagi nanti.</p>';
    }
  }

  /**
   * Menampilkan bookmark di halaman.
   * @param {Array} bookmarks 
   */
  #displayBookmarks(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
      this.#bookmarkListContainer.innerHTML = '<p>Anda belum menyimpan bookmark cerita.</p>';
      return;
    }

    this.#bookmarkListContainer.innerHTML = bookmarks
      .map((story) => this.#generateBookmarkItem(story))
      .join("");


    this.#bookmarkListContainer.querySelectorAll('.delete-bookmark-btn').forEach(button => {
      button.addEventListener('click', async (event) => {
        const storyId = event.target.dataset.id;
        await this.#handleDeleteBookmark(storyId, event.target);
      });
    });
  }

  /**
   * Membuat HTML untuk satu item bookmark.
   * @param {object} story 
   */
  #generateBookmarkItem(story) {
    return `
      <div class="story-item bookmark-item" data-story-id="${story.id}">
        ${story.photoUrl ? `<img src="${story.photoUrl}" alt="Foto cerita ${story.name || ''}" class="story-image">` : ''}
        <h3>${story.name || "Nama tidak tersedia"}</h3>
        <p>${story.description || "Deskripsi tidak tersedia"}</p>
        <p><small>Disimpan dari ID: ${story.id}</small></p>
        <button class="btn btn-danger delete-bookmark-btn" data-id="${story.id}" aria-label="Hapus bookmark untuk cerita ${story.name || ''}">
          Hapus Bookmark
        </button>
      </div>
    `;
  }

  /**
   * Menangani aksi penghapusan bookmark.
   * @param {string} storyId
   * @param {HTMLElement} buttonElement
   */
  async #handleDeleteBookmark(storyId, buttonElement) {
    if (!storyId) return;

    const confirmation = confirm(`Anda yakin ingin menghapus bookmark untuk cerita ini (${storyId})?`);
    if (!confirmation) return;

    buttonElement.disabled = true;
    buttonElement.textContent = 'Menghapus...';

    try {
      await BookmarkIdb.deleteBookmark(storyId);
      console.log(`Bookmark ${storyId} berhasil dihapus.`);
      
      const itemToRemove = this.#bookmarkListContainer.querySelector(`.bookmark-item[data-story-id="${storyId}"]`);
      if (itemToRemove) {
        itemToRemove.remove();
      }
      if (this.#bookmarkListContainer.childElementCount === 0) {
         this.#bookmarkListContainer.innerHTML = '<p>Anda belum menyimpan bookmark cerita.</p>';
      }
      alert('Bookmark berhasil dihapus!');

    } catch (error) {
      console.error(`Gagal menghapus bookmark ${storyId}:`, error);
      alert('Gagal menghapus bookmark. Coba lagi nanti.');
      buttonElement.disabled = false;
      buttonElement.textContent = 'Hapus Bookmark';
    }
  }

  #addFadeInEffect() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}