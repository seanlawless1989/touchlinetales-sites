// Sends a website sign-up (home page form, club join pages) two ways at once, so one failing service
// can't lose a lead:
//   1. saved to the Touchline Tales Supabase database (table tt_leads, via the tt_save_lead function;
//      the website can add a row but never read one back), and
//   2. emailed through FormSubmit (formsubmit.co), best effort.
// It counts as sent if either one works. Each has a time limit, so the form never sits on "Sending…".
(function () {
  var SUPA_URL = "https://elqwksyqwezhkekdqivn.supabase.co";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts"; // public anon key, same as the team sites
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/5f26f2b94f7b8df49f80d9aced927305";

  function withTimeout(ms, run) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms);
    return run(ctl.signal).finally(function () { clearTimeout(t); });
  }

  function rpc(name, args, ms) {
    return withTimeout(ms, function (signal) {
      return fetch(SUPA_URL + "/rest/v1/rpc/" + name, {
        method: "POST", signal: signal,
        headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY },
        body: JSON.stringify(args)
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (out) {
          if (!res.ok) throw new Error("db " + res.status + " " + ((out && out.message) || ""));
          return out;
        });
      });
    });
  }

  function email(payload, ms) {
    return withTimeout(ms, function (signal) {
      return fetch(FORM_ENDPOINT, {
        method: "POST", signal: signal,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (out) {
          if (!res.ok || String(out.success) !== "true") throw new Error("mail " + res.status + " " + (out.message || ""));
          return true;
        });
      });
    });
  }

  function why(err) {
    if (err && err.name === "AbortError") return "timeout";
    return String((err && err.message) || "network").trim().slice(0, 100);
  }

  // form: a short name ("home", "club-join"); payload: the labelled fields plus FormSubmit's _subject etc.
  // Resolves to { ok, saved, emailed, reason, id }. reason holds only the services' replies, nothing typed;
  // id is the saved row's number (null if only the email got through), used to match a payment to the sign-up.
  window.ttSendSignup = function (form, payload) {
    var data = {};
    Object.keys(payload).forEach(function (k) { if (k.charAt(0) !== "_") data[k] = payload[k]; });
    var save = rpc("tt_save_lead", { p_form: form, p_page: location.pathname, p_data: data }, 10000);
    var mail = email(payload, 12000);
    // Once the database has it, the visitor can be thanked straight away; the email carries on in the background.
    save.then(function (id) { mail.then(function () { rpc("tt_lead_emailed", { p_id: id }, 5000).catch(function () {}); }, function () {}); }, function () {});
    var both = Promise.allSettled([save, mail]).then(function (r) {
      var saved = r[0].status === "fulfilled", emailed = r[1].status === "fulfilled";
      var reasons = [];
      if (!saved) reasons.push(why(r[0].reason));
      if (!emailed) reasons.push(why(r[1].reason));
      return { ok: saved || emailed, saved: saved, emailed: emailed, reason: reasons.join("; "), id: saved ? r[0].value : null };
    });
    var savedFirst = save.then(function (id) { return { ok: true, saved: true, emailed: null, reason: "", id: id }; });
    return Promise.any([savedFirst, both]);
  };
})();
