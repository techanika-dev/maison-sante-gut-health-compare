/* PROTOTYPE ONLY. Builds the pre-filled WhatsApp text from the visitor's actual selections.
   Pure functions, no network, no storage: shared by the page (app.js) and the test matrix (tests/message.test.js). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MSLead = factory();
})(this, function () {
  // Digits only, country code first, no "+". This is the number on the clinic's WhatsApp Business channel
  // in Respond.io (channel 550491, verified name "Maison Santé Clinic"), read from the channel settings on 8 Oct 2026.
  // Set it to "" to keep the page in preview mode.
  var WA_NUMBER = "971509007929";

  var CONCERNS = ["Bloating after eating", "Heartburn or reflux", "Irregular digestion", "Reactions to certain foods", "Tired after meals", "Something else"];
  var DURATIONS = ["Less than a month", "A few months", "Over a year", "On and off for years"];
  // The payment line keeps the meaning of the tap. "direct" is never turned into an acceptance.
  var PAY_TEXT = { accepted: "Pay and Claim — understood", self: "I'm paying myself", direct: "I need direct billing" };

  function buildMessage(s) {
    if (!s || CONCERNS.indexOf(s.concern) === -1) throw new Error("concern is required and must be one of the form options");
    if (!Object.prototype.hasOwnProperty.call(PAY_TEXT, s.pay)) throw new Error("payment preference is required");
    if (s.duration && DURATIONS.indexOf(s.duration) === -1) throw new Error("duration must be one of the form options or empty");
    var lines = [
      "Hi, I'd like to book a Gut Health Consultation with Dr. Hareem.",
      "Main concern: " + s.concern,
      "Duration: " + (s.duration || "Not stated"),
      "Payment preference: " + PAY_TEXT[s.pay],
      "Offer: AED 247 consultation with Dr. Hareem",
      "Source: Gut Health landing page"
    ];
    if (s.ref) lines.push("Reference: " + s.ref); // only when a real reference exists; the page does not invent one
    return lines.join("\n");
  }

  // Opens a chat with the text pre-filled. The visitor still has to press Send.
  function buildWaUrl(message, number) {
    var n = String(number == null ? WA_NUMBER : number).replace(/\D/g, "");
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(message) : null;
  }

  return { CONCERNS: CONCERNS, DURATIONS: DURATIONS, PAY_TEXT: PAY_TEXT, WA_NUMBER: WA_NUMBER, buildMessage: buildMessage, buildWaUrl: buildWaUrl };
});
