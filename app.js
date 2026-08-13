/* ==========================================================================
   Adsterra CPM Web Portal - Interactive Logic & Ad Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAdManager();
  initCategoryFilters();
  initWebTools();
  initModals();
  initStickyAd();
});

/* --------------------------------------------------------------------------
   1. Theme Management (Dark / Light Mode)
   -------------------------------------------------------------------------- */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('adsterra_site_theme') || 'dark';

  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('adsterra_site_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

/* --------------------------------------------------------------------------
   2. Adsterra CPM Ad Placement Engine & Manager
   -------------------------------------------------------------------------- */

const defaultAdsterraCodes = {
  header: `<script type="text/javascript"> atOptions = { 'key' : '3b982b00e44dfc6d9a33f488f33cc2fd', 'format' : 'iframe', 'height' : 90, 'width' : 728, 'params' : {} }; </script><script type="text/javascript" src="https://www.highperformanceformat.com/3b982b00e44dfc6d9a33f488f33cc2fd/invoke.js"></script>`,
  sidebar1: `<script type="text/javascript"> atOptions = { 'key' : '03b55a68f56799fcefa2e32b025de389', 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} }; </script><script type="text/javascript" src="https://www.highperformanceformat.com/03b55a68f56799fcefa2e32b025de389/invoke.js"></script>`,
  sidebar2: `<script type="text/javascript"> atOptions = { 'key' : '14c5464739f72cfe012b00db8b9d8aab', 'format' : 'iframe', 'height' : 600, 'width' : 160, 'params' : {} }; </script><script type="text/javascript" src="https://www.highperformanceformat.com/14c5464739f72cfe012b00db8b9d8aab/invoke.js"></script>`,
  native: `<script type="text/javascript"> atOptions = { 'key' : 'af771bb9eacce08de984f4e45eee0c9d', 'format' : 'iframe', 'height' : 60, 'width' : 468, 'params' : {} }; </script><script type="text/javascript" src="https://www.highperformanceformat.com/af771bb9eacce08de984f4e45eee0c9d/invoke.js"></script>`,
  sticky: `<script type="text/javascript"> atOptions = { 'key' : '7a9446f6305d22a376d8df682d531a1c', 'format' : 'iframe', 'height' : 50, 'width' : 320, 'params' : {} }; </script><script type="text/javascript" src="https://www.highperformanceformat.com/7a9446f6305d22a376d8df682d531a1c/invoke.js"></script>`,
  socialBarScript: `<script src="https://pl30832069.effectivecpmnetwork.com/72/07/d4/7207d4c515be3c81b253a883db1176fe.js"></script>`,
  popunderScript: `<script src="https://pl30832072.effectivecpmnetwork.com/bd/37/02/bd37024c0d59ee57fdbf0627ab1ea99f.js"></script>`,
  directLinkUrl: `https://www.effectivecpmnetwork.com/tc8jhzn1m7?key=4f9d5d0f1bc5448296ed8f80b251406d`
};

function initAdManager() {
  const savedCodes = JSON.parse(localStorage.getItem('adsterra_ad_codes')) || defaultAdsterraCodes;

  // Direct Link Handling
  const directLinkBtns = document.querySelectorAll('.btn-direct-link');
  directLinkBtns.forEach(btn => {
    btn.href = savedCodes.directLinkUrl || defaultAdsterraCodes.directLinkUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
  });

  // Modal Inputs Population
  if (document.getElementById('inputAdHeader')) {
    document.getElementById('inputAdHeader').value = savedCodes.header || defaultAdsterraCodes.header;
    document.getElementById('inputAdSidebar1').value = savedCodes.sidebar1 || defaultAdsterraCodes.sidebar1;
    document.getElementById('inputAdSidebar2').value = savedCodes.sidebar2 || defaultAdsterraCodes.sidebar2;
    document.getElementById('inputAdNative').value = savedCodes.native || defaultAdsterraCodes.native;
    document.getElementById('inputAdSticky').value = savedCodes.sticky || defaultAdsterraCodes.sticky;
    document.getElementById('inputDirectLink').value = savedCodes.directLinkUrl || defaultAdsterraCodes.directLinkUrl;
  }

  // Save Ads Modal Handler
  const saveAdsBtn = document.getElementById('saveAdsBtn');
  if (saveAdsBtn) {
    saveAdsBtn.addEventListener('click', () => {
      const updatedCodes = {
        header: document.getElementById('inputAdHeader').value.trim(),
        sidebar1: document.getElementById('inputAdSidebar1').value.trim(),
        sidebar2: document.getElementById('inputAdSidebar2').value.trim(),
        native: document.getElementById('inputAdNative').value.trim(),
        sticky: document.getElementById('inputAdSticky').value.trim(),
        directLinkUrl: document.getElementById('inputDirectLink').value.trim()
      };
      localStorage.setItem('adsterra_ad_codes', JSON.stringify(updatedCodes));
      alert('Adsterra Ads updated successfully! Page will reload.');
      window.location.reload();
    });
  }

  // Reset Button
  const resetAdsBtn = document.getElementById('resetAdsBtn');
  if (resetAdsBtn) {
    resetAdsBtn.addEventListener('click', () => {
      if (confirm('Reset to default Adsterra codes?')) {
        localStorage.removeItem('adsterra_ad_codes');
        window.location.reload();
      }
    });
  }
}

/* --------------------------------------------------------------------------
   3. Category Filtering
   -------------------------------------------------------------------------- */
function initCategoryFilters() {
  const catButtons = document.querySelectorAll('.cat-btn');
  const cards = document.querySelectorAll('.articles-grid .card');

  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-category');

      cards.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (cat === 'all' || cardCat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   4. Interactive Web Tool Widget
   -------------------------------------------------------------------------- */
function initWebTools() {
  const textInput = document.getElementById('toolTextInput');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');

  if (textInput) {
    textInput.addEventListener('input', () => {
      const val = textInput.value;
      charCount.textContent = val.length;
      const words = val.trim() ? val.trim().split(/\s+/).length : 0;
      wordCount.textContent = words;
    });
  }
}

/* --------------------------------------------------------------------------
   5. Modals Management
   -------------------------------------------------------------------------- */
function initModals() {
  const openAdManagerBtn = document.getElementById('openAdManagerBtn');
  const adManagerModal = document.getElementById('adManagerModal');

  if (openAdManagerBtn && adManagerModal) {
    openAdManagerBtn.addEventListener('click', () => openModal(adManagerModal));
  }

  const articleReadBtns = document.querySelectorAll('.btn-read-article');
  const articleModal = document.getElementById('articleModal');

  articleReadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.getAttribute('data-title');
      const bodyText = btn.getAttribute('data-content');
      document.getElementById('modalArticleTitle').textContent = title;
      document.getElementById('modalArticleBody').innerHTML = bodyText;
      openModal(articleModal);
    });
  });

  const openPrivacyBtn = document.getElementById('openPrivacyBtn');
  const privacyModal = document.getElementById('privacyModal');
  if (openPrivacyBtn && privacyModal) {
    openPrivacyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(privacyModal);
    });
  }

  document.querySelectorAll('.modal-close, .btn-close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });
}

function openModal(modalElem) {
  if (modalElem) modalElem.classList.add('active');
}

function closeModal(modalElem) {
  if (modalElem) modalElem.classList.remove('active');
}

/* --------------------------------------------------------------------------
   6. Sticky Bottom Anchor Ad Handle
   -------------------------------------------------------------------------- */
function initStickyAd() {
  const closeStickyBtn = document.getElementById('closeStickyAd');
  const stickyAdBox = document.getElementById('stickyAdBox');

  if (closeStickyBtn && stickyAdBox) {
    closeStickyBtn.addEventListener('click', () => {
      stickyAdBox.classList.add('collapsed');
    });
  }
}
