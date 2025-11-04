/**
 * Mengekstrak segmen pathname dari path URL.
 * Memisahkan path menjadi resource dan id jika ada.
 * @param {string} path - Pathname URL yang akan diekstrak.
 * @returns {Object} Objek dengan properti resource dan id.
 */
function extractPathnameSegments(path) {
  const splitUrl = path.split('/');

  return {
    resource: splitUrl[1] || null,
    id: splitUrl[2] || null,
  };
}

/**
 * Membangun rute dari segmen path.
 * Menggabungkan resource dan id menjadi format rute standar.
 * @param {Object} pathSegments - Objek segmen path dengan resource dan id.
 * @returns {string} Rute yang telah dibangun.
 */
function constructRouteFromSegments(pathSegments) {
  let pathname = '';

  if (pathSegments.resource) {
    pathname = pathname.concat(`/${pathSegments.resource}`);
  }

  if (pathSegments.id) {
    pathname = pathname.concat('/:id');
  }

  return pathname || '/';
}

/**
 * Mendapatkan pathname aktif dari hash URL.
 * @returns {string} Pathname aktif tanpa simbol hash.
 */
export function getActivePathname() {
  return location.hash.replace('#', '') || '/';
}

/**
 * Mendapatkan rute aktif berdasarkan pathname saat ini.
 * @returns {string} Rute aktif yang sesuai dengan pathname.
 */
export function getActiveRoute() {
  const pathname = getActivePathname();
  const urlSegments = extractPathnameSegments(pathname);
  return constructRouteFromSegments(urlSegments);
}

/**
 * Mengurai pathname aktif menjadi segmen.
 * @returns {Object} Objek segmen dari pathname aktif.
 */
export function parseActivePathname() {
  const pathname = getActivePathname();
  return extractPathnameSegments(pathname);
}

/**
 * Mendapatkan rute dari pathname tertentu.
 * @param {string} pathname - Pathname yang akan dikonversi ke rute.
 * @returns {string} Rute yang sesuai dengan pathname.
 */
export function getRoute(pathname) {
  const urlSegments = extractPathnameSegments(pathname);
  return constructRouteFromSegments(urlSegments);
}

/**
 * Mengurai pathname menjadi segmen.
 * @param {string} pathname - Pathname yang akan diurai.
 * @returns {Object} Objek segmen dari pathname.
 */
export function parsePathname(pathname) {
  return extractPathnameSegments(pathname);
}
