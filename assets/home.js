// Touchline Tales home page: sign-up form.
//
// FORM_ENDPOINT: paste a form service's endpoint here (for example a Formspree
// "https://formspree.io/f/xxxx" URL) and sign-ups are sent there in the background.
// Left empty, the form opens the visitor's email app with everything filled in,
// addressed to SIGNUP_EMAIL.
const FORM_ENDPOINT = "";
const SIGNUP_EMAIL = "hello@touchlinetales.club";

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

  if (!FORM_ENDPOINT) {
    const subject = `Touchline Tales sign up: ${data.get("club")} ${data.get("team")}`;
    const body = fields.map(([k, v]) => `${k}: ${v}`).join("\n");
    window.location.href = `mailto:${SIGNUP_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say(`Your email app should open with everything filled in. Just press send. If it doesn't, email us at ${SIGNUP_EMAIL}.`, "ok");
    return;
  }

  const button = form.querySelector("button");
  button.disabled = true;
  say("Sending…");
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: data
    });
    if (!res.ok) throw new Error(res.status);
    form.classList.add("sent");
    say(`Thanks, ${data.get("name").split(" ")[0]}! We'll be in touch soon to book your demo.`, "ok");
  } catch {
    button.disabled = false;
    say(`Sorry, that didn't send. Please try again, or email us at ${SIGNUP_EMAIL}.`, "err");
  }
});
