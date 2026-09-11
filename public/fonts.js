/* KURLA — chargement non bloquant de la police.
 *
 * Remplace l'ancien handler inline `onload` du <link rel="preload"> afin de
 * garder une Content-Security-Policy sans `script-src 'unsafe-inline'`.
 * Le preload lance le téléchargement pendant le parsing ; ce script (defer,
 * donc après le DOM) bascule simplement le preload en feuille de style.
 */
(function () {
  var links = document.querySelectorAll('link[rel="preload"][as="style"]');
  for (var i = 0; i < links.length; i += 1) {
    links[i].rel = 'stylesheet';
  }
})();
