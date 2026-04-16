/* gallery.js — fetches /gallery and renders frames on the wall */

// Exposed by initMusic so hideLoadingScreen can trigger playback on button click.
let _tryPlayMusic = null;

/* ── Loading screen messages ────────────────────────── */
const LOADING_TEXTS = [
  'baking a bday cake…',
  'blowing up balloons…',
  'adding gifts to cart…',
  'writing birthday cards…',
  'picking the perfect playlist…',
  'lighting the candles…',
  'tying the ribbons…',
  'hiding all the presents…',
  'perfecting the icing…',
  'teaching everyone the dance moves…',
  'ordering the confetti…',
  'assembling the party crew…',
  'hanging up the streamers…',
  'setting up the surprise…',
  'making a birthday wish…',
];

function startLoadingTextCycle() {
  const el = document.getElementById('ls-text');
  if (!el) return null;
  let idx = 0;

  function showNext() {
    el.classList.add('hidden');
    setTimeout(() => {
      idx = (idx + 1) % LOADING_TEXTS.length;
      el.textContent = LOADING_TEXTS[idx];
      el.classList.remove('hidden');
    }, 350);
  }

  el.textContent = LOADING_TEXTS[0];
  const interval = setInterval(showNext, 1800);
  return interval;
}

function hideLoadingScreen(intervalId) {
  if (intervalId != null) clearInterval(intervalId);
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  // Fade out the spinner/text
  const inner = screen.querySelector('.ls-inner');
  if (inner) inner.classList.add('fade-out');

  // Fade in the "open your present" button
  const wrap = document.getElementById('ls-reveal-wrap');
  if (wrap) {
    // Double rAF ensures the transition fires after the element is painted
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
  }

  const btn = document.getElementById('ls-reveal-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (typeof _tryPlayMusic === 'function') _tryPlayMusic();
      screen.classList.add('fade-out');
      screen.addEventListener('transitionend', () => screen.remove(), { once: true });
    }, { once: true });
  } else {
    // Fallback: no button, just fade out
    if (typeof _tryPlayMusic === 'function') _tryPlayMusic();
    screen.classList.add('fade-out');
    screen.addEventListener('transitionend', () => screen.remove(), { once: true });
  }
}

const _loadingInterval = startLoadingTextCycle();


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
    playBtn.textContent = '';
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
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) bgMusic.volume = 0.2;
  }

  lightbox.classList.add('open');
  document.body.classList.add('lightbox-open');
  document.addEventListener('keydown', onLightboxKey);
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbVideo = lightbox.querySelector('video');
  if (lbVideo) {
    lbVideo.pause();
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) bgMusic.volume = 0.4;
  }
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

function waitForMedia(container) {
  const els = [...container.querySelectorAll('img, video')];
  return els.map(el => {
    if (el.tagName === 'IMG') {
      if (el.complete && el.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        el.addEventListener('load',  resolve, { once: true });
        el.addEventListener('error', resolve, { once: true });
      });
    } else {
      // video: wait for at least metadata (poster/dimensions known)
      if (el.readyState >= 1) return Promise.resolve();
      return new Promise(resolve => {
        el.addEventListener('loadedmetadata', resolve, { once: true });
        el.addEventListener('error',          resolve, { once: true });
      });
    }
  });
}

async function loadGallery() {
  const status  = document.getElementById('status');
  const wall    = document.getElementById('gallery-wall');
  const minWait = new Promise(resolve => setTimeout(resolve, 2000));
  const maxWait = new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const res = await fetch(window.BACKEND_URL + '/gallery');
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const { cards } = await res.json();

    if (!cards || cards.length === 0) {
      await Promise.race([maxWait, minWait]);
      hideLoadingScreen(_loadingInterval);
      status.innerHTML = '<p>No messages yet — check back soon!</p>';
      return;
    }

    // Shuffle so the wall looks different each load
    const shuffled = cards.slice().sort(() => Math.random() - 0.5);
    shuffled.forEach(card => wall.appendChild(buildFrame(card)));

    // Wait for the 2-second minimum AND every image/video to finish loading,
    // but give up and show the site after 5 seconds regardless.
    await Promise.race([maxWait, Promise.all([minWait, ...waitForMedia(wall)])]);

    hideLoadingScreen(_loadingInterval);
    status.hidden = true;
    wall.hidden = false;

  } catch (err) {
    console.error(err);
    await Promise.race([maxWait, minWait]);
    hideLoadingScreen(_loadingInterval);
    status.innerHTML =
      '<p>Couldn\'t load the gallery right now.</p>' +
      '<p style="margin-top:.5rem;font-size:.85rem">Please refresh to try again.</p>';
  }
}

loadGallery();

/* ── Background music ───────────────────────────── */
(function initMusic() {
  const audio = document.getElementById('bg-music');
  const btn   = document.getElementById('music-btn');
  const icon  = document.getElementById('music-icon');

  let playing = false;

  function setPlaying(on) {
    playing = on;
    if (on) {
      audio.play().catch(() => {});
      btn.classList.remove('muted');
      btn.setAttribute('aria-label', 'Mute background music');
      icon.textContent = '♪';
    } else {
      audio.pause();
      btn.classList.add('muted');
      btn.setAttribute('aria-label', 'Play background music');
      icon.textContent = '♪';
    }
  }

  btn.addEventListener('click', () => setPlaying(!playing));

  function tryPlay() {
    if (playing) return;
    audio.volume = 0.4;
    audio.play().then(() => {
      setPlaying(true);
    }).catch(() => {});
  }

  // Expose so hideLoadingScreen can call it at fade-out time.
  _tryPlayMusic = tryPlay;

  // Try silent autoplay on load (succeeds in some browsers/contexts).
  window.addEventListener('load', tryPlay);

  // The loading screen covers the full viewport — any tap/click on it
  // counts as a user gesture and unlocks audio immediately.
  const lsEl = document.getElementById('loading-screen');
  if (lsEl) {
    lsEl.addEventListener('click',      tryPlay, { once: true });
    lsEl.addEventListener('touchstart', tryPlay, { once: true });
  }

  // Final fallback: first interaction anywhere on the page.
  const firstGesture = () => {
    tryPlay();
    document.removeEventListener('click',      firstGesture);
    document.removeEventListener('touchstart', firstGesture);
    document.removeEventListener('keydown',    firstGesture);
  };
  document.addEventListener('click',      firstGesture, { once: true });
  document.addEventListener('touchstart', firstGesture, { once: true });
  document.addEventListener('keydown',    firstGesture, { once: true });
})();
