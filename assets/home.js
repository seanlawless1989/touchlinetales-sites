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
    say(`Thanks, ${data.get("name").split(" ")[0]}! We'll be in touch soon to book your demo.`, "ok");
  } catch {
    button.disabled = false;
    say("Sorry, that didn't send. Please try again in a minute.", "err");
  }
});
