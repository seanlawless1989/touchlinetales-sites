// Supabase project details (Project Settings > API). The anon key is meant to be public;
// the database rules decide who can change data.
// Darlington shares Newton Aycliffe U9s' Supabase project, in its own schema (nayfcu9 tools/team_schema_sql.py).
window.TEAM_CONFIG = {
  supabaseUrl: "https://elqwksyqwezhkekdqivn.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXdrc3lxd2V6aGtla2RxaXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NDA4MzAsImV4cCI6MjEwNzMxNjgzMH0.7HFhSDvpQS5WHDgu4x5ABat-8hl5ZIpmeFlp2pV9wts",
  schema: "darlington_u14s",
  // Public half of the match-alerts key pair. Match alerts aren't built yet for teams sharing a project.
  vapidPublicKey: ""
};
