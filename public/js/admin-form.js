(function () {
  var typeFree = document.getElementById('typeFree');
  var typePaid = document.getElementById('typePaid');
  var downloadSection = document.getElementById('downloadSection');
  var whatsappSection = document.getElementById('whatsappSection');
  var downloadLink = document.getElementById('downloadLink');
  var whatsappNumber = document.getElementById('whatsappNumber');

  function sync() {
    var free = typeFree && typeFree.checked;
    if (downloadSection) {
      downloadSection.style.display = free ? 'block' : 'none';
    }
    if (whatsappSection) {
      whatsappSection.style.display = free ? 'none' : 'block';
    }
    if (downloadLink) {
      downloadLink.required = free;
    }
    if (whatsappNumber) {
      whatsappNumber.required = !free;
    }
  }

  if (typeFree) {
    typeFree.addEventListener('change', sync);
  }
  if (typePaid) {
    typePaid.addEventListener('change', sync);
  }
  sync();
})();
