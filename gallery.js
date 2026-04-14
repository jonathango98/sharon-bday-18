/* gallery.js — fetches /gallery and renders frames on the wall */

const TILTS = [-3.5, -2.5, -1.8, -1, 0.8, 1.5, 2.2, 3, -0.5, 1.2];
let tiltIndex = 0;
function nextTilt() {
  const t = TILTS[tiltIndex % TILTS.length];
  tiltIndex++;
  return t;
}

// Frame style variants — spread evenly so the wall looks varied
const FRAME_STYLES = ['', '--gold', '--ebony', '--white', '--rose'];
let styleIndex = 0;
function nextFrameStyle() {
  const s = FRAME_STYLES[styleIndex % FRAME_STYLES.length];
  styleIndex++;
  return s;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFrame(card) {
  const tilt = nextTilt();
  const styleVariant = nextFrameStyle();
  const isLandscape = card.landscape === true;

  const article = document.createElement('article');
  const styleClass = styleVariant ? ` frame${styleVariant}` : '';
  article.className = 'frame' + styleClass + (isLandscape ? ' frame--landscape' : '');
  article.style.transform = `rotate(${tilt}deg)`;

  const mat = document.createElement('div');
  mat.className = 'frame__mat';

  if (card.photoUrl) {
    const img = document.createElement('img');
    img.className = 'frame__photo';
    img.src = card.photoUrl;
    img.alt = '';
    img.loading = 'lazy';
    // If image turns out to be landscape, flip the class
    img.addEventListener('load', () => {
      if (img.naturalWidth > img.naturalHeight) {
        article.classList.add('frame--landscape');
        article.classList.remove('frame--portrait');
      }
    });
    mat.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'frame__photo-placeholder';
    placeholder.textContent = '🌸';
    mat.appendChild(placeholder);
  }

  if (card.wish) {
    const wish = document.createElement('p');
    wish.className = 'frame__wish';
    wish.innerHTML = '&#8220;' + escHtml(card.wish) + '&#8221;';
    mat.appendChild(wish);
  }

  if (card.firstName) {
    const name = document.createElement('div');
    name.className = 'frame__name';
    name.textContent = '— ' + card.firstName;
    mat.appendChild(name);
  }

  article.appendChild(mat);

  article.addEventListener('click', () => openLightbox(article));

  return article;
}

/* ── Lightbox ───────────────────────────────────────── */
function openLightbox(frameEl) {
  const lightbox = document.getElementById('lightbox');
  const lbFrame  = lightbox.querySelector('.lb-frame');

  // Mirror the card's frame variant on the lightbox frame
  const variantClasses = ['frame--gold', 'frame--ebony', 'frame--white', 'frame--rose'];
  lbFrame.classList.remove(...variantClasses);
  variantClasses.forEach(cls => {
    if (frameEl.classList.contains(cls)) lbFrame.classList.add(cls);
  });

  // Deep-clone the frame's inner mat so the lightbox shows identical content
  lbFrame.innerHTML = '';
  lbFrame.appendChild(frameEl.querySelector('.frame__mat').cloneNode(true));

  lightbox.classList.add('open');
  document.addEventListener('keydown', onLightboxKey);
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('open');
  document.removeEventListener('keydown', onLightboxKey);
}

function onLightboxKey(e) {
  if (e.key === 'Escape') closeLightbox();
}

document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  // Close when clicking the backdrop (not the frame itself)
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
});

async function loadGallery() {
  const status = document.getElementById('status');
  const wall   = document.getElementById('gallery-wall');

  try {
    const res = await fetch(window.BACKEND_URL + '/gallery');
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const { cards } = await res.json();

    if (!cards || cards.length === 0) {
      status.innerHTML = '<p>No messages yet — check back soon!</p>';
      return;
    }

    status.hidden = true;
    wall.hidden = false;

    // Shuffle so the wall looks different each load
    const shuffled = cards.slice().sort(() => Math.random() - 0.5);
    shuffled.forEach(card => wall.appendChild(buildFrame(card)));

  } catch (err) {
    console.error(err);
    status.innerHTML =
      '<p>Couldn\'t load the gallery right now.</p>' +
      '<p style="margin-top:.5rem;font-size:.85rem">Please refresh to try again.</p>';
  }
}

loadGallery();
