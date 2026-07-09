/**
 * @param {string} value
 */
function encode(value) {
  return encodeURIComponent(value);
}

/**
 * @param {string} url
 * @param {string} text
 */
export function createShareLinks(url, text) {
  const combined = `${text} ${url}`.trim();
  return {
    x: `https://x.com/intent/tweet?text=${encode(text)}&url=${encode(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,
    whatsapp: `https://wa.me/?text=${encode(combined)}`,
    email: `mailto:?subject=${encode(text)}&body=${encode(`${text}\n\n${url}`)}`,
  };
}
