// Visitor counts for the Touchline Tales pages (home, demo, guides, about, changelog, privacy), via GoatCounter (goatcounter.com).
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
  // The same visit is also logged in our own database (Supabase), which the owner page (touchlinetales.club/admin/) reads.
  // Like GoatCounter, this stores nothing on the visitor's device and keeps no IP address (supabase/47_website_visits.sql in nayfcu9).
  var srcHost = "";
  try { if (document.referrer && !fromUs) srcHost = new URL(document.referrer).host.replace(/^www\./, ""); } catch (e) {}
  ttLog({ p_path: location.pathname, p_ref: ref && !fromUs ? ref : null, p_source: srcHost || null });
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = "https://" + CODE + ".goatcounter.com/count";
  document.head.appendChild(s);
})();

// Counts a moment worth knowing about (a sign-up sent, the demo opened) as an event in GoatCounter, and in HeyCatch where it's loaded.
// Safe to call before the counter has loaded or when it's blocked: then it does nothing.
// props (optional) go to HeyCatch only, e.g. the sport and age group picked on a sign-up; GoatCounter just counts.
function ttLog(body) {
  try {
    var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts"; // public anon key, as on every team site
    fetch("https://elqwksyqwezhkekdqivn.supabase.co/rest/v1/rpc/tt_log_web", {
      method: "POST", keepalive: true, body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY }
    }).catch(function () {});
  } catch (e) {}
}

window.ttCount = function (name, title, props) {
  try { ttLog({ p_path: location.pathname, p_event: name }); } catch (e) {}
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: title || name, event: true }); } catch (e) {}
  try { if (window.ttHeyCatch) window.ttHeyCatch(name, props); } catch (e) {} // heycatch.js: the same moment as a HeyCatch event
};
