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
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      window._swReg = reg;
      setupPush(reg);
    }).catch(function () {});

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'NEW_VERSION') {
        var el = document.getElementById('updateBanner');
        if (el) {
          el.classList.add('show');
        }
      }
    });
  }

  window.addEventListener('appinstalled', function () {
    if (window._swReg) {
      setupPush(window._swReg);
    }
  });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function getCsrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function postPush(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrf()
      },
      body: JSON.stringify(body)
    });
  }

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var output = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) {
      output[i] = rawData.charCodeAt(i);
    }
    return output;
  }

  function sendSubscription(subscription) {
    if (!subscription) {
      return;
    }
    postPush('/api/push/subscribe', { subscription: subscription.toJSON() }).catch(function () {});
  }

  function subscribeToPush(reg) {
    return reg.pushManager.getSubscription().then(function (subscription) {
      if (subscription) {
        sendSubscription(subscription);
        return null;
      }
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BAx4GkqlqoNNkjFsK54E6ZwMrj1H4uHVdREE5TPQNEuc_Kkx42KmHwjHAUFSf0PphPMDOD555wqGIBHW3FzfCOw')
      }).then(sendSubscription);
    }).catch(function () {});
  }

  function setupPush(reg) {
    if (!('PushManager' in window) || !('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'denied') {
      return;
    }
    if (Notification.permission === 'granted') {
      subscribeToPush(reg);
      return;
    }
    if (!isStandalone()) {
      return;
    }
    Notification.requestPermission().then(function (permission) {
      if (permission === 'granted') {
        subscribeToPush(reg);
      }
    }).catch(function () {});
  }

  if (isStandalone() && 'Notification' in window && Notification.permission === 'default') {
    function askOnInteraction() {
      if (window._swReg) {
        setupPush(window._swReg);
      }
      document.removeEventListener('touchstart', askOnInteraction);
      document.removeEventListener('click', askOnInteraction);
    }
    document.addEventListener('touchstart', askOnInteraction);
    document.addEventListener('click', askOnInteraction);
  }

  var updateBannerEl = document.getElementById('updateBanner');
  if (updateBannerEl) {
    updateBannerEl.addEventListener('click', function () {
      window.location.reload();
    });
  }
})();
