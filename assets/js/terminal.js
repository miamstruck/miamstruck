(function () {
  var pre = document.getElementById('terminal-text');
  if (!pre) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var finalHTML = pre.innerHTML;
  var fullText = pre.textContent;
  pre.textContent = '';

  var i = 0;
  var speed = 14;

  function type() {
    if (i <= fullText.length) {
      pre.textContent = fullText.slice(0, i);
      i++;
      window.setTimeout(type, speed);
    } else {
      pre.innerHTML = finalHTML;
    }
  }

  type();
})();
