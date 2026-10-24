// Visitor counts for the Touchline Tales pages (home, demo, guides, privacy), via GoatCounter (goatcounter.com).
// GoatCounter sets no cookies and stores nothing on the visitor's device, so no cookie banner is needed.
// It is NOT used on team or club sites: those belong to the clubs and carry children's information.
//
// Links in our posts carry ?ref=<channel>; that tag is sent as the visit's source, so the Referrers list
// shows "tiktok-bio", "fb-group" and so on next to the sites people came from.
(function () {
  var CODE = "touchlinetales"; // the GoatCounter account code: stats live at https://touchlinetales.goatcounter.com
  var q = new URLSearchParams(location.search);
  var ref = (q.get("ref") || q.get("utm_source") || "").slice(0, 40);
  var fromUs = document.referrer && new URL(document.referrer).host === location.host;
  window.goatcounter = {
    // path without the query string, so /demo/?ref=x and /demo/ count as the same page
    path: function () { return location.pathname; },
    // a tag counts as the source on the page people land on, not again as they click through our own pages
    referrer: function () { return ref && !fromUs ? "ref: " + ref : document.referrer; }
  };
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = "https://" + CODE + ".goatcounter.com/count";
  document.head.appendChild(s);
})();

// Counts a moment worth knowing about (a sign-up sent, the demo opened) as an event in GoatCounter.
// Safe to call before the counter has loaded or when it's blocked: then it does nothing.
window.ttCount = function (name, title) {
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: title || name, event: true }); } catch (e) {}
};
