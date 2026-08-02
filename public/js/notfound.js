(function () {
  var el = document.getElementById('countdown');
  var seconds = 8;
  if (!el) {
    return;
  }
  el.textContent = String(seconds);
  setInterval(function () {
    seconds -= 1;
    if (seconds <= 0) {
      window.location.href = '/';
      return;
    }
    el.textContent = String(seconds);
  }, 1000);
})();
