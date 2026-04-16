/* gallery.js — fetches /gallery and renders frames on the wall */

const TILTS = [-3.5, -2.5, -1.8, -1, 0.8, 1.5, 2.2, 3, -0.5, 1.2];
const isMobile = () => window.matchMedia('(max-width: 480px)').matches;
function nextTilt() {
  if (isMobile()) return 0;
  return TILTS[Math.floor(Math.random() * TILTS.length)];
}

// Frame style variants — randomised per frame so the wall looks varied
const FRAME_STYLES = ['', '--gold', '--ebony', '--white', '--rose'];
function nextFrameStyle() {
  return FRAME_STYLES[Math.floor(Math.random() * FRAME_STYLES.length)];
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function promptLabel(promptNum, firstName) {
  const name = capitalize(firstName);
  switch (promptNum) {
    case 1: return `one word ${name} thinks is best to describe you`;
    case 2: return `what ${name} is most grateful for`;
    case 3: return `${name}'s wish to you`;
    default: return '';
  }
}

function buildFrame(card) {
  const isVideo = !!card.videoUrl;
  const tilt = nextTilt();
  const styleVariant = nextFrameStyle();
  const isLandscape = card.landscape === true;

  const article = document.createElement('article');
  const styleClass = styleVariant ? ` frame${styleVariant}` : '';
  article.className = 'frame' + styleClass
    + (isLandscape ? ' frame--landscape' : '')
    + (isVideo ? ' frame--video' : '');
  article.style.transform = `rotate(${tilt}deg)`;

  const mat = document.createElement('div');
  mat.className = 'frame__mat';

  if (isVideo) {
    const wrap = document.createElement('div');
    wrap.className = 'frame__video-wrap';

    const video = document.createElement('video');
    video.className = 'frame__video';
    video.src = card.videoUrl;
    video.setAttribute('preload', 'metadata');
    video.setAttribute('playsinline', '');
    wrap.appendChild(video);

    const playBtn = document.createElement('div');
    playBtn.className = 'frame__play-btn';
    playBtn.textContent = '▶';
    wrap.appendChild(playBtn);

    mat.appendChild(wrap);

    const label = promptLabel(card.promptNum, card.firstName);
    if (label) {
      const p = document.createElement('p');
      p.className = 'frame__wish';
      p.textContent = label;
      mat.appendChild(p);
    }
  } else if (card.photoUrl) {
    const img = document.createElement('img');
    img.className = 'frame__photo';
    img.src = card.photoUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('load', () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const clamped = Math.min(2, Math.max(0.5, ratio));
      img.style.aspectRatio = clamped;
    });
    mat.appendChild(img);

    if (card.wish) {
      const wish = document.createElement('p');
      wish.className = 'frame__wish';
      wish.innerHTML = '&#8220;' + escHtml(card.wish) + '&#8221;';
      mat.appendChild(wish);
    }
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'frame__photo-placeholder';
    placeholder.textContent = '🌸';
    mat.appendChild(placeholder);
  }

  if (card.firstName) {
    const name = document.createElement('div');
    name.className = 'frame__name';
    name.textContent = '— ' + capitalize(card.firstName);
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

  // If the frame contains a video, enable controls and play it
  const lbVideo = lbFrame.querySelector('video');
  if (lbVideo) {
    lbVideo.controls = true;
    lbVideo.play().catch(() => {});
  }

  lightbox.classList.add('open');
  document.body.classList.add('lightbox-open');
  document.addEventListener('keydown', onLightboxKey);
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbVideo = lightbox.querySelector('video');
  if (lbVideo) lbVideo.pause();
  lightbox.classList.remove('open');
  document.body.classList.remove('lightbox-open');
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

  // Close button (important for mobile — no Escape key)
  lightbox.querySelector('.lb-close').addEventListener('click', closeLightbox);
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
