# touchlinetales-sites

Team sites for Touchline Tales, served by GitHub Pages at https://touchlinetales.club.
Each team lives in its own folder (`/<team-slug>/`), built with `tools/package_team.py` in nayfcu9.

`/turnstile/` is Turnstile, a football ground check-in app for Sean's friends (not a team site). It is a single page; its data lives in the `ts_*` tables and `turnstile-photos` bucket of the nayfc-u9s Supabase project.

`/blog/` is built from HeyCatch by `tools/build_blog.py`, run every 15 minutes by `.github/workflows/blog.yml` (or by hand from the Actions tab). The key is the repository secret `HEYCATCH_API_KEY`; never put it in a file. Don't hand-edit `blog/` or the `blog:start` part of `sitemap.xml`, the build overwrites them. The blog is for the marketing site only, never team or club folders.
