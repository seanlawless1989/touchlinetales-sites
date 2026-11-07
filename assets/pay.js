// Touchline Tales: paying the £5 a month team plan at sign-up, through a Stripe Payment Link
// (card or Direct Debit, cancel any time). Stripe hosts the payment page, so no card or bank details
// ever touch this site. After paying, Stripe sends the visitor to /welcome/.
//
// Paying is recorded by the tt-billing function (nayfcu9 supabase/functions/tt-billing), which Stripe calls
// when someone pays, changes or cancels. client_reference_id carries the sign-up's row id (tt_leads) so the
// payment is matched to the sign-up.
//
// GOING LIVE: put the LIVE payment link in PAY_LINK. While it is a test link (buy.stripe.com/test_...),
// the paying step only shows on a page opened with ?paytest=1, so real visitors never see a test checkout.
(function () {
  var PAY_LINK = "https://buy.stripe.com/test_28EaEZ9d2eYLb7o9S35Vu00";
  var TEST = PAY_LINK.indexOf("/test_") > -1;
  var params = new URLSearchParams(location.search);
  if (params.get("paytest") === "1") { try { sessionStorage.setItem("tt-paytest", "1"); } catch (e) {} }
  var testing = false;
  try { testing = params.get("paytest") === "1" || sessionStorage.getItem("tt-paytest") === "1"; } catch (e) { testing = params.get("paytest") === "1"; }

  // Free, never asked to pay (Sean): every Newton Aycliffe team, and Washington Athletic teams for 2026-27.
  var FREE_CLUBS = /newton\s*aycliffe|\bnayfc\b|washington\s*ath/i;

  var on = !TEST || testing;
  window.ttPay = {
    on: on,
    test: TEST,
    isFree: function (club) { return FREE_CLUBS.test(String(club || "")); },
    // Stripe's page with the sign-up's email filled in and the row id attached.
    url: function (leadId, email) {
      var q = [];
      if (leadId) q.push("client_reference_id=lead_" + encodeURIComponent(String(leadId)));
      if (email) q.push("prefilled_email=" + encodeURIComponent(String(email).trim()));
      return PAY_LINK + (q.length ? "?" + q.join("&") : "");
    }
  };

  // Wording that depends on whether paying at sign-up is switched on:
  // data-pay-copy shows only when it is on, data-nopay-copy only when it is off.
  function copy() {
    document.querySelectorAll("[data-pay-copy]").forEach(function (el) { el.hidden = !on; });
    document.querySelectorAll("[data-nopay-copy]").forEach(function (el) { el.hidden = on; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", copy); else copy();
})();
