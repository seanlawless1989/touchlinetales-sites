// Touchline Tales home page: sign-up form.
//
// Each sign-up is saved to the tt_signups table in Supabase (insert-only for
// visitors; nobody can read it back from the site). That's the record that counts.
// It is also emailed to SIGNUP_EMAIL by FormSubmit (formsubmit.co) as a heads-up,
// but only on a best-effort basis: FormSubmit needs a one-off activation link
// clicking and its emails often land in junk, so a failed email never fails the form.
const SIGNUP_EMAIL = "sean.nayfc@outlook.com";
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${SIGNUP_EMAIL}`;
const DB_URL = "https://elqwksyqwezhkekdqivn.supabase.co/rest/v1/tt_signups";
const DB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts";

document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("signup-form");
const msg = form.querySelector(".form-msg");

const LABELS = {
  name: "Name", email: "Email", phone: "Mobile", club: "Club", team: "Team",
  role: "Role", age_group: "Age group", format: "Format", message: "Message"
};

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
  const row = {};
  Object.keys(LABELS).forEach(k => { row[k] = (data.get(k) || "").toString().trim(); });
  try {
    const res = await fetch(DB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}`, Prefer: "return=minimal" },
      body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error(res.status);
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
    form.classList.add("sent");
    say(`Thanks, ${data.get("name").split(" ")[0]}! We'll be in touch soon to book your demo.`, "ok");
  } catch {
    button.disabled = false;
    say("Sorry, that didn't send. Please try again in a minute.", "err");
  }
});
