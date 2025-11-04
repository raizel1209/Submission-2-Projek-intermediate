// ISI FILE: src/scripts/pages/about/about-page.js (Dengan Gambar & Deskripsi)

export default class AboutPage {
  async render() {
    return `
      <section class="container fade-in" id="main-content" tabindex="-1">
        <h1 class="page-title">Tentang Pembuat Aplikasi</h1>
        
        <div class="about-content">
          <div class="profile-section">
            <img src="public/images/hero.jpg" alt="Foto Profil [Izzat Farahidy Fadlur Rachman]" class="profile-picture"> 
            
            <h2>Izzat Farahidy Fadlur Rachman</h2> 
            <p class="profile-description">
              Hero
            </p>
          </div>

          <hr class="section-divider"> 

          <h2>Tentang Aplikasi Ini</h2>
          <p>Where's your motivation</p>
          
          <h2>Teknologi yang Digunakan:</h2>
          <ul>
            <li>HTML, CSS, JavaScript</li>
            <li>Webpack</li>
            <li>LeafletJS</li>
            <li>Workbox (untuk PWA)</li>
            <li>IndexedDB (melalui library 'idb')</li>
            </ul>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log("Halaman About berhasil di-render.");
    this.#addFadeInEffect(); 
  }

  #addFadeInEffect() {
    const container = document.querySelector(".container");
    if (container) {
      container.classList.add("fade-in");
    }
  }
}