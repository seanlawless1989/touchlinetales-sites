// Washington Athletic club sign-up: one form for all of a club's teams.
// Saved to our database and emailed at the same time, like the home page (see assets/signup-send.js),
// with every team flattened into "Team 1: ..." rows plus a CSV block we can paste into a sheet.
const CLUB = "Washington Athletic Youth";
const MAX_TEAMS = 30;

const form = document.getElementById("club-form");
const msg = form.querySelector(".form-msg");
const teamsEl = document.getElementById("teams");
const tpl = document.getElementById("team-tpl");
const addBtn = document.getElementById("add-team");
const count = (name, title, props) => window.ttCount && window.ttCount(name, title, props);

const TEAM_LABELS = { team: "Team", age: "Age group", squad: "Boys/girls", format: "Format", league: "League", fulltime: "Full-Time link", coach: "Coach", coach_email: "Coach email", more_coaches: "Other coaches" };

function renumber() {
  teamsEl.querySelectorAll(".team-box").forEach((box, i) => {
    box.querySelector(".n").textContent = i + 1;
    box.querySelectorAll("[data-k]").forEach(el => {
      const id = `t${i}-${el.dataset.k}`;
      el.id = id;
      el.closest(".field").querySelector("label").htmlFor = id;
    });
  });
  addBtn.hidden = teamsEl.children.length >= MAX_TEAMS;
}

function addTeam(focus) {
  const box = tpl.content.firstElementChild.cloneNode(true);
  box.querySelector(".remove").addEventListener("click", () => { box.remove(); renumber(); });
  teamsEl.appendChild(box);
  renumber();
  if (focus) box.querySelector("input").focus();
}
addBtn.addEventListener("click", () => addTeam(true));
addTeam(false);

function say(text, kind) { msg.textContent = text; msg.className = "form-msg" + (kind ? " " + kind : ""); }
form.addEventListener("input", e => e.target.classList.remove("invalid"));
form.addEventListener("change", e => e.target.classList.remove("invalid"));

let started = false;
form.addEventListener("focusin", () => { if (!started) { started = true; count("club-signup-started", "Club sign-up started", { page: location.pathname }); } });

const csvCell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

form.addEventListener("submit", async e => {
  e.preventDefault();
  const data = new FormData(form);
  if (data.get("website")) return; // spam trap

  const missing = [...form.querySelectorAll("[required]")].filter(el => !el.checkValidity());
  missing.forEach(el => el.classList.add("invalid"));
  if (missing.length) {
    say("Please fill in the highlighted boxes.", "err");
    missing[0].focus();
    return;
  }

  const teams = [...teamsEl.querySelectorAll(".team-box")].map(box => {
    const t = {};
    box.querySelectorAll("[data-k]").forEach(el => { t[el.dataset.k] = el.value.trim(); });
    return t;
  });

  const payload = {
    Club: CLUB,
    Name: data.get("name").trim(),
    Email: data.get("email").trim(),
    Mobile: (data.get("phone") || "").trim(),
    Role: data.get("role"),
    "Welfare officer": [data.get("welfare_name"), data.get("welfare_email")].map(v => (v || "").trim()).filter(Boolean).join(", "),
    "Number of teams": String(teams.length)
  };
  teams.forEach((t, i) => {
    payload[`Team ${i + 1}`] = Object.keys(TEAM_LABELS).filter(k => t[k]).map(k => `${TEAM_LABELS[k]}: ${t[k]}`).join(" | ");
  });
  const keys = Object.keys(TEAM_LABELS);
  payload["Teams CSV"] = [keys.map(k => TEAM_LABELS[k]).join(","), ...teams.map(t => keys.map(k => csvCell(t[k] || "")).join(","))].join("\n");
  const note = (data.get("message") || "").trim();
  if (note) payload.Message = note;
  Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
  payload._subject = `Club sign up: ${CLUB}, ${teams.length} team${teams.length === 1 ? "" : "s"}`;
  payload._replyto = payload.Email;
  payload._template = "table";
  payload._captcha = "false";

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  say("Sending…");
  const sent = await window.ttSendSignup("club-join", payload);
  if (sent.ok) {
    form.classList.add("sent");
    count("club-signup-completed", "Club sign-up completed", { page: location.pathname, teams: String(teams.length) });
    if (sent.reason) count("club-signup-partial", "Club sign-up sent by one route only", { page: location.pathname, reason: sent.reason });
    say(`Thanks, ${payload.Name.split(" ")[0]}! We've got your ${teams.length} team${teams.length === 1 ? "" : "s"}. We'll email each coach their link as their site goes live.`, "ok");
    window.scrollTo({ top: form.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
    return;
  }
  const reason = sent.reason;
  count("club-signup-failed", "Club sign-up failed to send", { page: location.pathname, reason });
  button.disabled = false;
  const body = Object.entries(payload).filter(([k]) => !k.startsWith("_")).map(([k, v]) => `${k}: ${v}`).join("\n");
  const mail = `mailto:hello@touchlinetales.club?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(body)}`;
  msg.className = "form-msg err";
  msg.innerHTML = `Sorry, that didn't send. <a href="${mail}">Tap here to email it to us instead</a> (everything's already filled in), or email <a href="mailto:hello@touchlinetales.club">hello@touchlinetales.club</a>.`;
});

// Brochure downloads and video plays are counted as events (no personal data).
document.querySelectorAll("[data-pdf]").forEach(a => a.addEventListener("click", () => count("club-brochure", "Club brochure downloaded", { page: location.pathname })));
const vid = document.querySelector(".see-video");
if (vid) vid.addEventListener("play", () => count("club-video", "Club page video played", { page: location.pathname }), { once: true });
