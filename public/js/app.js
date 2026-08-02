(function () {
  var DISMISSED_KEY = 'jr-pwa-dismissed';
  var installPrompt = null;

  function banner() {
    return document.getElementById('installBanner');
  }

  function showBanner() {
    var el = banner();
    if (el) {
      el.classList.add('show');
    }
  }

  function hideBanner() {
    var el = banner();
    if (el) {
      el.classList.remove('show');
    }
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    if (!localStorage.getItem(DISMISSED_KEY)) {
      showBanner();
    }
  });

  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    hideBanner();
  });

  document.addEventListener('click', function (event) {
    var installBtn = event.target.closest('#installBtn');
    var closeBtn = event.target.closest('#installClose');
    if (installBtn && installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function () {
        installPrompt = null;
        hideBanner();
      });
    } else if (closeBtn) {
      localStorage.setItem(DISMISSED_KEY, '1');
      hideBanner();
    }
  });

  var categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function () {
      this.form.submit();
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'NEW_VERSION') {
        var el = document.getElementById('updateBanner');
        if (el) {
          el.classList.add('show');
        }
      }
    });
  }

  var updateBannerEl = document.getElementById('updateBanner');
  if (updateBannerEl) {
    updateBannerEl.addEventListener('click', function () {
      window.location.reload();
    });
  }
})();
