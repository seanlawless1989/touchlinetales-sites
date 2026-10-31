// Supabase project details (Project Settings > API). The anon key is meant to be public;
// the database rules decide who can change data.
// This team shares Newton Aycliffe U9s' Supabase project, in its own schema (tools/team_schema_sql.py in nayfcu9).
window.TEAM_CONFIG = {
  supabaseUrl: "https://elqwksyqwezhkekdqivn.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts",
  schema: "na_u11_wildcats",
  // Public half of the project's match-alerts key pair (the same for every team in the project); the notify function
  // sends this team's alerts using its alert_team row.
  vapidPublicKey: "BLccA0UCmxDmbV7HnKdgbxhgBqHssQZHoRg8Y-sJZupmyfFjtvTtbNIrR1AW9DUu-UnRg8VtBMVps79_Hc5oVGc"
};
