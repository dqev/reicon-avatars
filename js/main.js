const seedInput = document.getElementById('seedInput');
const searchPreview = document.getElementById('searchPreview');
const gridContainer = document.getElementById('gridContainer');
const searchCard = document.getElementById('searchCard');
const cmdBar = document.getElementById('cmdBar');
const btnShapeChange = document.getElementById('btnShapeChange');
const btnLinkSearch = document.getElementById('btnLinkSearch');
const btnCopySearch = document.getElementById('btnCopySearch');
const btnDownloadSearch = document.getElementById('btnDownloadSearch');

const shapes = ['circle', 'squircle', 'square'];
let currentShapeIndex = 0;
let currentShape = 'circle';
let currentSvg = '';
let cardCount = 0;

function updateMainPreview() {
  const seed = seedInput ? seedInput.value.trim() || 'avatar' : 'avatar';
  if (typeof window.generateAvatar === 'function') {
    currentSvg = window.generateAvatar(seed, currentShape);
    if (searchPreview) searchPreview.innerHTML = currentSvg;
  }
}

function showToast(msg) {
  if (window.createToast) {
    window.createToast(msg);
  }
}

if (seedInput) {
  seedInput.addEventListener('input', updateMainPreview);
}

if (btnShapeChange) {
  btnShapeChange.addEventListener('click', () => {
    currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
    currentShape = shapes[currentShapeIndex];
    const shapeLabel = currentShape.charAt(0).toUpperCase() + currentShape.slice(1);
    showToast(`Shape: ${shapeLabel}`);
    updateMainPreview();
    updateAllCardsShape(currentShape);
  });
}

function updateAllCardsShape(newShape) {
  document.querySelectorAll('.grid-card').forEach((card) => {
    const seed = card.dataset.seed;
    if (seed) {
      card.dataset.cardShape = newShape;
      const cardSvgEl = card.querySelector('.card-svg');
      if (cardSvgEl && typeof window.generateAvatar === 'function') {
        cardSvgEl.innerHTML = window.generateAvatar(seed, newShape);
      }
    }
  });
}

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) { }
  document.body.removeChild(textArea);
  showToast(successMsg);
}

if (cmdBar) {
  cmdBar.addEventListener('click', () => {
    copyTextToClipboard('https://avatars.reicon.dev/v1/svg/dev', 'API URL copied!');
  });
}

if (btnLinkSearch) {
  btnLinkSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    const seed = seedInput ? seedInput.value.trim() || 'avatar' : 'avatar';
    const avatarUrl = currentShape && currentShape !== 'circle'
      ? `https://avatars.reicon.dev/v1/svg/${encodeURIComponent(seed)}?shape=${currentShape}`
      : `https://avatars.reicon.dev/v1/svg/${encodeURIComponent(seed)}`;
    copyTextToClipboard(avatarUrl, `Copied ${seed} URL!`);
  });
}

if (btnCopySearch) {
  btnCopySearch.addEventListener('click', (e) => {
    e.stopPropagation();
    copyTextToClipboard(currentSvg, 'SVG copied!');
  });
}

if (btnDownloadSearch) {
  btnDownloadSearch.addEventListener('click', (e) => {
    e.stopPropagation();
    const seed = seedInput ? seedInput.value.trim() || 'avatar' : 'avatar';
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avatar_${seed}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG downloaded!');
  });
}

// Generate clean seed strings
function getRandomSeed() {
  const prefixes = ['0x', '@', 'id_', 'seed_', 'usr_', 'dev_'];
  const randHex = Math.floor(Math.random() * 16777215).toString(36);
  return prefixes[Math.floor(Math.random() * prefixes.length)] + randHex;
}

// Append batch of grid cards for infinite scroll
function loadMoreCards(batchSize = 8) {
  if (!gridContainer) return;
  for (let i = 0; i < batchSize; i++) {
    cardCount++;
    const seed = getRandomSeed();
    const indexStr = String(cardCount).padStart(3, '0');
    let cardShape = currentShape;
    const svgContent = typeof window.generateAvatar === 'function' ? window.generateAvatar(seed, cardShape) : '';

    const card = document.createElement('div');
    card.className = 'grid-card';
    card.dataset.seed = seed;
    card.dataset.cardShape = cardShape;
    card.setAttribute('data-squircle-radius', '14');
    card.setAttribute('data-squircle-smoothing', '60');
    card.innerHTML = `
      <div class="card-header">
        <span>${indexStr}</span>
        <span>${seed}</span>
      </div>
      <div class="card-svg">${svgContent}</div>
      <div class="card-actions">
        <button class="icon-btn link-card-btn" title="Copy Avatar Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6.16934 6.30897C8.24667 4.23034 11.6145 4.23034 13.6918 6.30897C15.7694 8.38785 15.7694 11.7586 13.6918 13.8375L12.2612 15.2689C11.9684 15.5619 11.9686 16.0368 12.2616 16.3296C12.5545 16.6224 13.0294 16.6222 13.3222 16.3292L14.7528 14.8978C17.4157 12.2332 17.4157 7.91323 14.7528 5.24864C12.0896 2.58379 7.77154 2.58379 5.10835 5.24864L2.2472 8.11157C-0.415733 10.7762 -0.415733 15.0961 2.2472 17.7607C3.48184 18.9961 5.07401 19.6593 6.69015 19.7488C7.10372 19.7718 7.45758 19.4551 7.48051 19.0415C7.50343 18.6279 7.18674 18.2741 6.77316 18.2512C5.51156 18.1812 4.27192 17.6647 3.30819 16.7004C1.2306 14.6215 1.2306 11.2508 3.30819 9.1719L6.16934 6.30897Z" fill="currentColor"></path>
            <path d="M17.3099 4.25115C16.8963 4.22822 16.5424 4.54491 16.5195 4.95849C16.4966 5.37207 16.8133 5.72593 17.2268 5.74885C18.4884 5.81878 19.7281 6.33528 20.6918 7.29961C22.7694 9.37849 22.7694 12.7492 20.6918 14.8281L17.8307 17.691C15.7533 19.7697 12.3855 19.7697 10.3082 17.691C8.2306 15.6122 8.2306 12.2414 10.3082 10.1626L11.7388 8.73108C12.0316 8.4381 12.0314 7.96322 11.7384 7.67042C11.4454 7.37762 10.9706 7.37777 10.6778 7.67075L9.2472 9.10222C6.58427 11.7668 6.58427 16.0868 9.2472 18.7514C11.9104 21.4162 16.2285 21.4162 18.8916 18.7514L21.7528 15.8884C24.4157 13.2238 24.4157 8.90387 21.7528 6.23928C20.5182 5.00387 18.926 4.34073 17.3099 4.25115Z" fill="currentColor"></path>
          </svg>
        </button>
        <button class="icon-btn copy-card-btn" title="Copy SVG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M15 1.25H10.9436C9.10583 1.24998 7.65019 1.24997 6.51098 1.40314C5.33856 1.56076 4.38961 1.89288 3.64124 2.64124C2.89288 3.38961 2.56076 4.33856 2.40314 5.51098C2.24997 6.65019 2.24998 8.10582 2.25 9.94357V16C2.25 17.8722 3.62205 19.424 5.41551 19.7047C5.55348 20.4687 5.81753 21.1208 6.34835 21.6517C6.95027 22.2536 7.70814 22.5125 8.60825 22.6335C9.47522 22.75 10.5775 22.75 11.9451 22.75H15.0549C16.4225 22.75 17.5248 22.75 18.3918 22.6335C19.2919 22.5125 20.0497 22.2536 20.6517 21.6517C21.2536 21.0497 21.5125 20.2919 21.6335 19.3918C21.75 18.5248 21.75 17.4225 21.75 16.0549V10.9451C21.75 9.57754 21.75 8.47522 21.6335 7.60825C21.5125 6.70814 21.5125 5.95027 20.6517 5.34835C20.1208 4.81753 19.4687 4.55348 18.7047 4.41551C18.424 2.62205 16.8722 1.25 15 1.25ZM17.1293 4.27117C16.8265 3.38623 15.9876 2.75 15 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V16C3.75 16.9876 4.38624 17.8265 5.27117 18.1293C5.24998 17.5194 5.24999 16.8297 5.25 16.0549V10.9451C5.24998 9.57754 5.24996 8.47522 5.36652 7.60825C5.48754 6.70814 5.74643 5.95027 6.34835 5.34835C6.95027 4.74643 7.70814 4.48754 8.60825 4.36652C9.47522 4.24996 10.5775 4.24998 11.9451 4.25H15.0549C15.8297 4.24999 16.5194 4.24998 17.1293 4.27117ZM7.40901 6.40901C7.68577 6.13225 8.07435 5.9518 8.80812 5.85315C9.56347 5.75159 10.5646 5.75 12 5.75H15C16.4354 5.75 17.4365 5.75159 18.1919 5.85315C18.9257 5.9518 19.3142 6.13225 19.591 6.40901C19.8678 6.68577 20.0482 7.07435 20.1469 7.80812C20.2484 8.56347 20.25 9.56458 20.25 11V16C20.25 17.4354 20.2484 18.4365 20.1469 19.1919C20.0482 19.9257 19.8678 20.3142 19.591 20.591C19.3142 20.8678 18.9257 20.8678 18.1919 21.1469C17.4365 21.2484 16.4354 21.25 15 21.25H12C10.5646 21.25 9.56347 21.2484 8.80812 21.1469C8.07435 21.0482 7.68577 20.8678 7.40901 20.591C7.13225 20.3142 6.9518 19.9257 6.85315 19.1919C6.75159 18.4365 6.75 17.4354 6.75 16V11C6.75 9.56458 6.75159 8.56347 6.85315 7.80812C6.9518 7.07435 7.13225 6.68577 7.40901 6.40901Z" fill="currentColor"></path>
          </svg>
        </button>
        <button class="icon-btn download-card-btn" title="Download SVG">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
      </div>
    `;

    // Apply smooth squircle corners to dynamically created card
    if (window.applySmoothCorners) {
      window.applySmoothCorners(card, 14, 60);
    }

    // Link button handler inside card (copies avatar URL for seed)
    card.querySelector('.link-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const avatarUrl = currentShape && currentShape !== 'circle' 
        ? `https://avatars.reicon.dev/v1/svg/${encodeURIComponent(seed)}?shape=${currentShape}` 
        : `https://avatars.reicon.dev/v1/svg/${encodeURIComponent(seed)}`;
      copyTextToClipboard(avatarUrl, `Copied ${seed} URL!`);
    });

    // Card click loads seed into main search card
    card.addEventListener('click', () => {
      if (seedInput) seedInput.value = seed;
      updateMainPreview();
      if (window.innerWidth <= 1024) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Copy button handler inside card
    card.querySelector('.copy-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const currentCardSvg = window.generateAvatar(seed, cardShape);
      copyTextToClipboard(currentCardSvg, `Copied ${seed} SVG!`);
    });

    // Download button handler inside card
    card.querySelector('.download-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avatar_${seed}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${seed}!`);
    });

    // Insert before sentinel element
    const sentinel = gridContainer.querySelector('.sentinel');
    if (sentinel) {
      gridContainer.insertBefore(card, sentinel);
    } else {
      gridContainer.appendChild(card);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!gridContainer) return;

  // Add Sentinel Element for Infinite Scroll IntersectionObserver
  const sentinelEl = document.createElement('div');
  sentinelEl.className = 'sentinel';
  sentinelEl.textContent = 'Loading more avatars...';
  gridContainer.appendChild(sentinelEl);

  // Initial batch load & main preview update
  loadMoreCards(10);
  updateMainPreview();

  if (window.applySmoothCorners && searchCard) {
    window.applySmoothCorners(searchCard, 14, 60);
  }

  // IntersectionObserver for Infinite Scroll
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMoreCards(10);
    }
  }, { rootMargin: '300px' });

  observer.observe(sentinelEl);

  // Mobile Menu Toggle & Morph
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDropdown = document.getElementById('mobileDropdown');

  if (mobileMenuBtn && mobileDropdown) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileDropdown.classList.toggle('is-open');
      mobileMenuBtn.classList.toggle('is-open', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!mobileDropdown.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileDropdown.classList.remove('is-open');
        mobileMenuBtn.classList.remove('is-open');
      }
    });
  }

  // Soft Copy Transition Feedback globally
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-icon-btn, .icon-btn, .link-card-btn, .copy-card-btn');
    if (!btn) return;
    
    const isCopyBtn = (btn.title && btn.title.toLowerCase().includes('copy')) || 
                      (btn.id && btn.id.toLowerCase().includes('copy')) || 
                      btn.classList.contains('copy-card-btn') || 
                      btn.classList.contains('link-card-btn') ||
                      btn.classList.contains('copy-icon-btn');
                      
    if (isCopyBtn && !btn.dataset.copying) {
      btn.dataset.copying = "true";
      const originalHTML = btn.innerHTML;
      
      let size = "16";
      if (originalHTML.includes('width="18"')) size = "18";
      else if (originalHTML.includes('width="15"')) size = "15";
      else if (originalHTML.includes('width="20"')) size = "20";
      
      btn.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        delete btn.dataset.copying;
      }, 2000);
    }
  });
});
