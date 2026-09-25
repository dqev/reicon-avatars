// Toast helper
function triggerToast(text) {
    if (window.createToast) {
        window.createToast(text);
    } else if (window.showToast) {
        window.showToast(text);
    }
}

// Copy to Clipboard Helper with Fallback
function copyTextToClipboard(text, successMsg) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            triggerToast(successMsg);
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
    triggerToast(successMsg);
}

// Copy Handlers
const btnCopyQuickstart = document.getElementById('btnCopyQuickstart');
if (btnCopyQuickstart) {
    btnCopyQuickstart.addEventListener('click', () => {
        const snippet = '<img src="https://avatars.reicon.dev/v1/svg/dev?size=400&shape=square" alt="Avatar" width="400" height="400" />';
        copyTextToClipboard(snippet, 'Snippet copied!');
    });
}

const btnCopyEndpoints = document.getElementById('btnCopyEndpoints');
if (btnCopyEndpoints) {
    btnCopyEndpoints.addEventListener('click', () => {
        const text = `SVG  https://avatars.reicon.dev/v1/svg/{seed}?shape=square|circle|squircle&size=500\nJSON https://avatars.reicon.dev/v1/json/{seed}`;
        copyTextToClipboard(text, 'Endpoints copied!');
    });
}

const btnCopyFormats = document.getElementById('btnCopyFormats');
if (btnCopyFormats) {
    btnCopyFormats.addEventListener('click', () => {
        const text = `GET /v1/json/dev\n\n{\n  "seed": "dev",\n  "shape": "square",\n  "size": 500,\n  "svg": "<svg width=\\"500\\" height=\\"500\\" ...>...</svg>"\n}`;
        copyTextToClipboard(text, 'JSON format copied!');
    });
}

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

// Sidebar Table of Contents Scroll Observer
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

    // API Live Preview Renderer
    function initApiPreview() {
        if (typeof window.generateAvatar !== 'function') return;

        // Quickstart previews
        const preview1 = document.getElementById('previewAvatar1');
        const preview2 = document.getElementById('previewAvatar2');
        if (preview1) preview1.innerHTML = window.generateAvatar('alex', 'squircle');
        if (preview2) preview2.innerHTML = window.generateAvatar('sarah', 'circle');

        // Shape previews
        const shapeCircle = document.getElementById('shapeCircle');
        const shapeSquircle = document.getElementById('shapeSquircle');
        const shapeSquare = document.getElementById('shapeSquare');
        if (shapeCircle) shapeCircle.innerHTML = window.generateAvatar('dev', 'circle');
        if (shapeSquircle) shapeSquircle.innerHTML = window.generateAvatar('dev', 'squircle');
        if (shapeSquare) shapeSquare.innerHTML = window.generateAvatar('dev', 'square');

        // Seed determinism previews
        const seedUser1 = document.getElementById('seedUser1');
        const seedOctocat = document.getElementById('seedOctocat');
        const seedAntigravity = document.getElementById('seedAntigravity');
        if (seedUser1) seedUser1.innerHTML = window.generateAvatar('user_101', 'circle');
        if (seedOctocat) seedOctocat.innerHTML = window.generateAvatar('octocat', 'squircle');
        if (seedAntigravity) seedAntigravity.innerHTML = window.generateAvatar('antigravity', 'square');
    }

    initApiPreview();

    if (!sections.length || !navLinks.length) return;

    function setActiveLink(id) {
        navLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (href === id) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // ScrollSpy using IntersectionObserver
    const observerOptions = {
        root: null,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActiveLink(entry.target.id);
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));

    // Smooth Scroll Click Handlers for TOC Links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                setActiveLink(targetId);
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.pushState(null, null, `#${targetId}`);
            }
        });
    });
});

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
