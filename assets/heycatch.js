// HeyCatch analytics for the Touchline Tales marketing pages (home, about, changelog, guides, privacy, DPA).
// Set up from https://heycatch.ai/agents.md (plain JavaScript, no build step). Dashboard: heycatch.ai.
// It counts page views, clicks and sign-ups. Session recording and surveys are switched off inside the SDK.
// It keeps an anonymous visitor id in a cookie and local storage so a return visit is recognised;
// the privacy page says so and has a "turn off" link (window.ttHeyCatchOff below).
// It is NOT used on team or club sites, or the demo sites: those belong to the clubs and carry children's information.
import { analytics } from "https://esm.sh/@heycatch/sdk@0.8.3";

analytics.init({
  projectKey: "hck_pk_KV9mBzr3P68QM5RYYUdEw83M2AOAbEWD",
  install: { framework: "web", agent: "claude-code" },
  requestBatching: false, // every click here is a full page load, so send straight away
  respectDnt: true
});

// stats.js's ttCount() passes sign-ups and demo clicks through here as business events
window.ttHeyCatch = (name) => { try { analytics.trackEvent(name.replace(/-/g, "_")); } catch (e) {} };

// the privacy page's "turn off" link; HeyCatch remembers the choice in this browser
window.ttHeyCatchOff = () => { try { analytics.optOutCapturing(); return true; } catch (e) { return false; } };
