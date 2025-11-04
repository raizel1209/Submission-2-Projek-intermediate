/**
 * Kelas presenter untuk menangani logika pengiriman cerita.
 * Bertanggung jawab atas interaksi antara view dan model untuk fitur tambah cerita.
 */
export default class AddStoryPresenter {
  #view;
  #model;
  #token;

  /**
   * Konstruktor untuk menginisialisasi presenter dengan view, model, dan token.
   * @param {Object} params - Parameter inisialisasi.
   * @param {Object} params.view - Objek view untuk interaksi UI.
   * @param {Object} params.model - Objek model untuk operasi data.
   * @param {string} params.token - Token autentikasi untuk API.
   */
  constructor({ view, model, token }) {
    this.#view = view;
    this.#model = model;
    this.#token = token;
  }

  /**
   * Mengirimkan data cerita ke server secara asinkron.
   * Menampilkan indikator loading, menangani respons, dan memberikan umpan balik kepada pengguna.
   * @param {FormData} formData - Data formulir cerita yang akan dikirim.
   */
  async submitStory(formData) {
    this.#view.showSubmitLoadingButton();

    try {
      // Mengirim data cerita menggunakan token autentikasi
      const response = await this.#model.addStory(this.#token, formData);

      if (response.error) {
        throw new Error(response.message || "Gagal mengirim cerita.");
      }

      this.#view.showSubmitSuccess(
        response.message || "Cerita berhasil dikirim."
      );
    } catch (error) {
      this.#view.showSubmitError(error.message);
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }
}
