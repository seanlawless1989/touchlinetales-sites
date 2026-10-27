# Builds the /vs/ comparison pages: python3 tools/make_vs.py .
# Facts were checked against each rival's own website on the date in DATE; re-check before changing it.
import json, html, os, sys
ROOT = sys.argv[1]
DATE_ISO, DATE = "2026-10-26", "26 October 2026"

WINS = """
    <h2>Where a team website is different</h2>
    <ul>
      <li><b>A season you can share and keep.</b> Every result, scorer and match report sits on one link that stays up. A grandparent can look back at October in March without scrolling a chat.</li>
      <li><b>No app for parents to download.</b> It's a website that works on any phone. Parents can save it to their home screen, and that's also how goal alerts reach iPhones.</li>
      <li><b>Matchday as it happens.</b> The coach taps goals, assists and subs from the touchline. Parents get the line-up, kick-off, every goal, half time and full time on their phone, with the scorer's first name.</li>
      <li><b>Every child's season, counted.</b> Games, goals, assists and milestones like a first goal are kept for each player, ending in a sticker book you can print.</li>
      <li><b>Children first.</b> First names only, team sites kept out of Google, and only the team's coaches can change anything. Your welfare officer decides whether scores are shown for Under 7s to Under 11s.</li>
      <li><b>Built for your sport.</b> Football from 5v5 to 11v11, and rugby union and rugby league with tries, conversions and kicks scored the right way.</li>
    </ul>
"""

PAGES = {
 "spond": dict(
  name="Spond",
  title="Touchline Tales or Spond? What each one is for",
  desc="Looking for a Spond alternative for your football or rugby team? A fair look at what Spond does well, where a team website is different, and why many teams use both.",
  lede="Spond is the app a lot of grassroots clubs already use. Here's an honest look at what it does well, what a Touchline Tales team website does differently, and how the two fit together.",
  well="""
    <h2>What Spond does well</h2>
    <ul>
      <li><b>It's free and it's everywhere.</b> Spond doesn't charge teams to use it, and with well over a million users in the UK, there's a good chance your parents already have it.</li>
      <li><b>Organising the week.</b> Events, training, who's available and messages to parents all sit in one app.</li>
      <li><b>Collecting money.</b> Subs, match fees and kit payments can be taken in the app. Spond earns from a fee on those payments rather than charging the team.</li>
    </ul>
    <p>If what you need is a way to organise the team and collect subs, Spond does that job well and costs the team nothing.</p>
""",
  both="""
    <h2>Can we use both?</h2>
    <p>Yes, and that's how we'd suggest it. Keep Spond for availability, messages and subs. Use Touchline Tales for the match itself and the season record: the live score, the alerts, every child's stats and the sticker book at the end. Touchline Tales doesn't collect subs or payments, so there's no overlap to untangle.</p>
""",
  faq=[
   ("Is Touchline Tales a replacement for Spond?", "Not really. Spond is for organising the team and collecting money. Touchline Tales is a website for matchday and the season record. Lots of teams will want both."),
   ("Do parents need another app?", "No. Touchline Tales is a website that works on any phone, so there's nothing extra to download. Parents can save it to their home screen so it opens like an app."),
   ("Does Touchline Tales take subs or payments?", "No. Touchline Tales doesn't handle subs or payments, so keep using whatever your club uses now for that."),
  ]),
 "teamzum": dict(
  name="Teamzum",
  title="Touchline Tales or Teamzum? What each one is for",
  desc="Comparing Teamzum with a team website for your grassroots football or rugby team: what Teamzum's free club platform does well, and where a per-team site is different.",
  lede="Teamzum is a free platform for running a whole grassroots club. Here's a fair look at what it does well, what a Touchline Tales team website does differently, and how they can sit side by side.",
  well="""
    <h2>What Teamzum does well</h2>
    <ul>
      <li><b>The whole club in one place, for free.</b> Teamzum covers registrations, player records, fixtures, training and messages to parents, with no monthly fee for the club platform.</li>
      <li><b>A free club website.</b> News, fixtures and results, team pages and sponsors, run from the same place as everything else.</li>
      <li><b>Money and kit.</b> Direct Debit subs, card payments and a club shop. Teamzum earns from fees on payments rather than charging the club.</li>
    </ul>
    <p>If your committee wants one free system to run registrations, subs and a club website, Teamzum is built for exactly that.</p>
""",
  both="""
    <h2>Can a club use both?</h2>
    <p>Yes. Teamzum runs the club: registrations, payments, the shop and the club website. A Touchline Tales site is for one team's matchday and season: the live score, alerts to parents, every child's stats and the sticker book. It wears your club's crest and colours, and can link back to the club website.</p>
""",
  faq=[
   ("Is Touchline Tales a club management system like Teamzum?", "No. Touchline Tales doesn't do registrations, membership, subs or a club shop. It's one website per team, for matchday and the season record."),
   ("Does it replace our club website?", "No, it sits alongside it. Each Touchline Tales site is for one team, in your club's crest, colours and sponsors."),
   ("How much does Touchline Tales cost?", "£60 per team per season, July to June, plus £35 once for setup. Our first five founding teams pay nothing until June 2027."),
  ]),
 "pitchero": dict(
  name="Pitchero",
  title="Touchline Tales or Pitchero? What each one is for",
  desc="Pitchero or a per-team website? A fair look at what Pitchero's club websites do well, where a Touchline Tales team site is different, and when you might want both.",
  lede="Pitchero has run club websites for grassroots sport for years. Here's an honest look at what it does well, what a Touchline Tales team website does differently, and when you might want both.",
  well="""
    <h2>What Pitchero does well</h2>
    <ul>
      <li><b>A proper club website and app.</b> A branded site for the whole club, with news, fixtures, results and match reports for every team, plus a companion app.</li>
      <li><b>Club-wide tools.</b> Online registration, membership, team management, fundraising and the club lottery, with payments on its paid plans.</li>
      <li><b>A free start.</b> Its free plan suits a single-team club starting out. It carries third-party adverts, and paid plans add payments, a custom domain and fewer or no adverts.</li>
    </ul>
    <p>If your club wants one public website for every team, built to be found in search, with membership and fundraising tied in, Pitchero is built for that.</p>
""",
  both="""
    <h2>Can a club use both?</h2>
    <p>Yes. Pitchero is the club's public front door. A Touchline Tales site is one team's matchday and season record, shared with that team's families: live alerts, every child's stats and the sticker book. Because team sites are kept out of Google and use first names only, they suit the children's side of things, while the club site does the public side.</p>
""",
  faq=[
   ("Is Touchline Tales a club website like Pitchero?", "No. Touchline Tales is one website per team, not one for the whole club. It doesn't do membership, registrations, payments or lotteries."),
   ("Are there adverts on Touchline Tales?", "No. There are no adverts on any plan. Your club's own sponsors can be shown on the site."),
   ("Why are team sites kept out of Google?", "Because they hold children's first names and match details. Parents get the link from the club, and search engines are told not to list the site."),
  ]),
}

SOC = """      <a href="https://www.facebook.com/touchlinetales" rel="me noopener">Facebook</a>
      <a href="https://www.instagram.com/touchline_tales_club/" rel="me noopener">Instagram</a>
      <a href="https://www.tiktok.com/@touchline.tales0" rel="me noopener">TikTok</a>"""

def page(slug, p):
    url = f"https://touchlinetales.club/vs/{slug}/"
    ld = {"@context": "https://schema.org", "@graph": [
      {"@type": "Article", "headline": p["title"], "description": p["desc"], "inLanguage": "en-GB",
       "datePublished": DATE_ISO, "dateModified": DATE_ISO, "mainEntityOfPage": url,
       "author": {"@type": "Person", "name": "Murph Hartley", "url": "https://touchlinetales.club/about/"},
       "publisher": {"@type": "Organization", "name": "Touchline Tales", "url": "https://touchlinetales.club/"}},
      {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]}]}
    faq = "\n".join(f"    <details>\n      <summary>{html.escape(q)}</summary>\n      <p>{html.escape(a)}</p>\n    </details>" for q, a in p["faq"])
    others = " · ".join(f'<a href="../{s}/">Touchline Tales or {o["name"]}?</a>' for s, o in PAGES.items() if s != slug)
    e = html.escape
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(p['title'])} | Touchline Tales</title>
<meta name="description" content="{e(p['desc'])}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0E2A1D">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{e(p['title'])}">
<meta property="og:description" content="{e(p['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Touchline Tales">
<meta property="og:locale" content="en_GB">
<meta property="og:image" content="https://touchlinetales.club/assets/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../assets/mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/home.css?v=11">
<script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
</script>
<meta property="article:published_time" content="{DATE_ISO}">
<script src="/assets/stats.js" async></script>
<script type="module" src="/assets/heycatch.js"></script>
</head>
<body>

<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="../../" aria-label="Touchline Tales home">
      <img src="../../assets/mark.svg" alt="" width="40" height="40">
      <span class="word">Touchline <b>Tales</b></span>
    </a>
    <nav class="nav" aria-label="Main">
      <a href="../../demo/">Demo</a>
      <a href="../../#all-features">Features</a>
      <a href="../../#safety">Safety</a>
      <a href="../../#price">Price</a>
      <a href="/blog/" data-blog-link hidden>Blog</a>
      <a class="btn btn-sm" href="../../?ref=vs-{slug}#signup">Sign up</a>
    </nav>
  </div>
</header>

<main>

<section class="guide-hero dark stripes">
  <div class="wrap narrow">
    <p class="eyebrow">Comparisons</p>
    <h1>{e(p['title'])}</h1>
    <p class="lede">{e(p['lede'])}</p>
    <p class="byline">By Murph Hartley, Touchline Tales · {DATE} · 4 minute read</p>
  </div>
</section>

<article class="band guide">
  <div class="wrap narrow">
{p['well']}{WINS}{p['both']}
    <h2>Questions</h2>
{faq}

    <section class="guide-cta card" aria-labelledby="see-it">
      <p class="eyebrow">See it for yourself</p>
      <h2 id="see-it">Click around a team site</h2>
      <p>Our demo is a made-up team, Sample Town Under 12s, with a live game on. Nothing you change is saved. It's £60 per team per season, plus £35 once for setup, and our first five founding teams pay nothing until June 2027.</p>
      <p><a class="btn" href="../../demo/?ref=vs-{slug}">Open the demo site</a> <a class="btn btn-ghost" href="../../?ref=vs-{slug}#signup">Join as a founding team</a></p>
    </section>

    <p class="small">We checked what {e(p['name'])} offers against its own website on {DATE}. Features and prices change, so check with {e(p['name'])} too. If anything here is out of date, tell us at <a href="mailto:hello@touchlinetales.club">hello@touchlinetales.club</a> and we'll fix it. {e(p['name'])} is a trademark of its owner, and Touchline Tales isn't connected with it.</p>
    <p class="small">More comparisons: {others}</p>

  </div>
</article>

</main>

<footer class="foot dark">
  <div class="wrap foot-in">
    <a class="brand" href="../../" aria-label="Touchline Tales home">
      <img src="../../assets/mark.svg" alt="" width="36" height="36">
      <span class="word">Touchline <b>Tales</b></span>
    </a>
    <p>Every match. Every milestone.</p>
    <nav class="foot-links small" aria-label="More from Touchline Tales">
      <a href="../../about/">About</a>
      <a href="/blog/" data-blog-link hidden>Blog</a>
      <a href="../../guides/share-results-with-parents/">Guide: sharing results with parents</a>
      <a href="../../guides/welfare-officer-checklist/">Guide: a welfare officer's checklist</a>
      <a href="../../changelog/">What we've shipped</a>
      <a href="../../privacy/">Privacy</a>
      <a href="../../dpa/">Data processing agreement</a>
{SOC}
    </nav>
    <p class="small">&copy; 2026 Touchline Tales. Team websites for grassroots football and rugby.</p>
  </div>
</footer>

</body>
</html>
"""

for slug, p in PAGES.items():
    d = os.path.join(ROOT, "vs", slug); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w").write(page(slug, p))
    print("wrote", d)
