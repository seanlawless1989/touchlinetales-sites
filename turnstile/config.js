// Supabase project details (Project Settings > API).
// The anon key is meant to be public; the database rules decide who can read and change data.
// Turnstile's tables (ts_*) and photo bucket live in the nayfc-u9s project, kept apart from the team tables.
window.TURNSTILE_CONFIG = {
  supabaseUrl: "https://elqwksyqwezhkekdqivn.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts",
  // Web push public key (the private half lives server-side in ts_secrets)
  vapidPublicKey: "BNvNayjqo-l0XOgyX7FAUSp98YeU0dES5Hdf_kTdIYC2vHXRqJLnDe0XSRfXc1hMQ62t5zJBbX97_jK4Zt1kGDk"
};
