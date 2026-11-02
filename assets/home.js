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
  name: "Name", email: "Email", phone: "Mobile", club: "Club or team", sport: "Sport",
  role: "Role", age_group: "Age group", format: "Format", heard: "Heard about us",
  ref: "Link used", message: "Message"
};

// Links in posts carry ?ref=<channel> so we can see which ones bring sign-ups.
const ref = new URLSearchParams(location.search).get("ref");
if (ref) form.querySelector("[name=ref]").value = ref.slice(0, 40);

// Visitor stats (assets/stats.js): sign-ups and demo visits are counted as events, nothing about the person.
const count = (name, title, props) => window.ttCount && window.ttCount(name, title, props);

// What a sign-up event carries: only the dropdown choices marked data-track (sport, age group, role, format,
// how they heard) and the ?ref= tag. Never the name, email, club or anything typed, as the privacy page promises.
function trackedChoices() {
  const out = { page: location.pathname };
  form.querySelectorAll("[data-track]").forEach(el => { const v = (el.value || "").trim(); if (v) out[el.dataset.track] = v.slice(0, 40); });
  return out;
}

// The funnel: someone starts filling in the form (once per visit), then sends it.
let started = false;
form.addEventListener("focusin", () => {
  if (started) return;
  started = true;
  count("signup-started", "Sign-up form started", { page: location.pathname });
});

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
    say("Please fill in the highlighted boxes.", "err");
    missing[0].focus();
    return;
  }

  const fields = Object.keys(LABELS)
    .map(k => [LABELS[k], (data.get(k) || "").toString().trim()])
    .filter(([, v]) => v);

  const payload = Object.fromEntries(fields);
  payload._subject = `Touchline Tales sign up: ${data.get("club")}`;
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
    // The success event: fires only once FormSubmit has accepted the sign-up, so a failed send never counts.
    count("signup-completed", "Sign-up completed", trackedChoices());
    try { localStorage.setItem("tt-lead", "sent"); } catch {} // the demo then won't ask them again
    say(`Thanks, ${data.get("name").split(" ")[0]}! We'll be in touch soon to book your demo.`, "ok");
  } catch {
    button.disabled = false;
    say("Sorry, that didn't send. Please try again in a minute.", "err");
  }
});

// Demo links open the demo straight away, keeping any ?ref= tag. The demo itself asks, gently and later on,
// whether they'd like a chat (see demo.js in nayfcu9), so nobody has to fill in a form to see it.
document.querySelectorAll("[data-demo]").forEach(a => a.addEventListener("click", () => {
  count("demo-click", "Demo link clicked");
  if (ref) a.href = (a.getAttribute("href") || "demo/").split("?")[0] + "?ref=" + encodeURIComponent(ref.slice(0, 40));
}));

// Founding places: the count and the five slots come from data-teams in the hero ("Name|INITIALS|#colour;…"),
// so there's one list to change. Taken places show the team's name on a crest in its colours; open ones link to the form.
const founding = document.querySelector(".founding");
if (founding) {
  const esc = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const teams = (founding.dataset.teams || "").split(";").map(t => t.split("|").map(x => x.trim())).filter(t => t[0]);
  const total = +founding.dataset.total || 5, taken = Math.min(teams.length, total), left = total - taken;
  founding.querySelector(".founding-count").innerHTML = left
    ? `<b class="founding-left">${left} of ${total}</b> founding-team places left for the 2026-27 season`
    : `All ${total} founding-team places are taken for the 2026-27 season`;
  founding.querySelector(".founding-slots").innerHTML = Array.from({ length: total }, (_, i) => {
    if (i < taken) {
      const [name, initials, colour] = teams[i];
      const kit = /^#[0-9a-f]{3,6}$/i.test(colour || "") ? ` style="--kit:${colour}"` : "";
      return `<li class="taken"${kit}><span class="crest" aria-hidden="true">${esc((initials || name.slice(0, 2)).slice(0, 3))}</span><span class="slot-name">${esc(name)}</span></li>`;
    }
    return `<li class="open"><a href="#signup"><span class="crest" aria-hidden="true">?</span><span class="slot-name">Your team?</span></a></li>`;
  }).join("");
}
