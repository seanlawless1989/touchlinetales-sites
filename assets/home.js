// Touchline Tales home page: sign-up form.
//
// Sign-ups are emailed to the team inbox by FormSubmit (formsubmit.co), a free form-to-email
// service, so the site needs no server of its own. FORM_ID is FormSubmit's code for
// the activated form; it stands in for the email address so the address isn't
// visible in the page source.
const FORM_ID = "5f26f2b94f7b8df49f80d9aced927305";
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${FORM_ID}`;

document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("signup-form");
const msg = form.querySelector(".form-msg");

const LABELS = {
  name: "Name", email: "Email", phone: "Mobile", club: "Club", team: "Team",
  role: "Role", age_group: "Age group", format: "Format", heard: "Heard about us",
  ref: "Link used", message: "Message"
};

// Links in posts carry ?ref=<channel> so we can see which ones bring sign-ups.
const ref = new URLSearchParams(location.search).get("ref");
if (ref) form.querySelector("[name=ref]").value = ref.slice(0, 40);

// Visitor stats (assets/stats.js): sign-ups and demo visits are counted as events, nothing about the person.
const count = (name, title) => window.ttCount && window.ttCount(name, title);

function say(text, kind) {
  msg.textContent = text;
  msg.className = "form-msg" + (kind ? " " + kind : "");
}

form.addEventListener("input", e => e.target.classList.remove("invalid"));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = new FormData(form);
  if (data.get("website")) return; // spam trap filled in

  const missing = [...form.querySelectorAll("[required]")].filter(el => !el.checkValidity());
  missing.forEach(el => el.classList.add("invalid"));
  if (missing.length) {
    say(missing.some(el => el.type === "checkbox") && missing.length === 1
      ? "Please tick the box so we can get back to you."
      : "Please fill in the highlighted boxes.", "err");
    missing[0].focus();
    return;
  }

  const fields = Object.keys(LABELS)
    .map(k => [LABELS[k], (data.get(k) || "").toString().trim()])
    .filter(([, v]) => v);

  const payload = Object.fromEntries(fields);
  payload._subject = `Touchline Tales sign up: ${data.get("club")} ${data.get("team")}`;
  payload._replyto = data.get("email");
  payload._template = "table";
  payload._captcha = "false";

  const button = form.querySelector("button");
  button.disabled = true;
  say("Sending…");
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || String(out.success) !== "true") throw new Error(out.message || res.status);
    form.classList.add("sent");
    count("signup-sent", "Sign-up form sent");
    say(`Thanks, ${data.get("name").split(" ")[0]}! We'll be in touch soon to book your demo.`, "ok");
  } catch {
    button.disabled = false;
    say("Sorry, that didn't send. Please try again in a minute.", "err");
  }
});

// Demo gate: links to the demo site first ask who you are, so we can follow up. It can be skipped,
// and once someone has filled it in (or skipped) on this device the links go straight through.
// The demo itself asks again later, gently, if it hasn't heard from them (see demo.js in nayfcu9).
const LEAD_KEY = "tt-lead";
const gate = document.getElementById("demo-gate");
const demoForm = document.getElementById("demo-form");
const demoMsg = demoForm.querySelector(".form-msg");
// each demo link says which demo it opens (football, rugby union or rugby league); the gate remembers the one clicked
let demoPath = "demo/";
const demoUrl = () => demoPath + (ref ? "?ref=" + encodeURIComponent(ref.slice(0, 40)) : "");
const remember = v => { try { localStorage.setItem(LEAD_KEY, v); } catch {} };
const known = () => { try { return !!localStorage.getItem(LEAD_KEY); } catch { return false; } };

document.querySelectorAll("[data-demo-gate]").forEach(a => a.addEventListener("click", e => {
  demoPath = (a.getAttribute("href") || "demo/").split("?")[0];
  count("demo-click", "Demo link clicked");
  if (known() || typeof gate.showModal !== "function") { a.href = demoUrl(); return; }
  e.preventDefault();
  gate.showModal();
}));
gate.querySelector("[data-close]").addEventListener("click", () => gate.close());
gate.querySelector("[data-skip]").addEventListener("click", e => { e.preventDefault(); count("demo-gate-skipped", "Demo form skipped"); remember("skipped"); location.href = demoUrl(); });
gate.addEventListener("click", e => { if (e.target === gate) gate.close(); });
demoForm.addEventListener("input", e => e.target.classList.remove("invalid"));

demoForm.addEventListener("submit", async e => {
  e.preventDefault();
  const data = new FormData(demoForm);
  if (data.get("website")) return;
  const missing = [...demoForm.querySelectorAll("[required]")].filter(el => !el.checkValidity());
  missing.forEach(el => el.classList.add("invalid"));
  if (missing.length) {
    demoMsg.textContent = missing.length === 1 && missing[0].type === "checkbox"
      ? "Please tick the box so we can get back to you." : "Please fill in the highlighted boxes.";
    demoMsg.className = "form-msg err";
    missing[0].focus();
    return;
  }
  const payload = {
    "Name": data.get("name").trim(), "Email": data.get("email").trim(), "Club and team": data.get("club").trim(),
    "Role": data.get("role"), "Where": `Before opening the ${demoPath.replace(/\/$/, "")} demo (home page)`, "Link used": ref || "",
    _subject: `Touchline Tales demo: ${data.get("club").trim()}`, _replyto: data.get("email").trim(),
    _template: "table", _captcha: "false"
  };
  demoForm.querySelector("button[type=submit]").disabled = true;
  demoMsg.textContent = "Opening the demo…";
  demoMsg.className = "form-msg";
  // Let them in whatever happens: a slow or failed send shouldn't stand between them and the demo.
  await Promise.race([
    fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload), keepalive: true }).catch(() => {}),
    new Promise(r => setTimeout(r, 4000))
  ]);
  count("demo-gate-sent", "Demo form sent");
  remember("sent");
  location.href = demoUrl();
});
