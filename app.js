/* PROTOTYPE ONLY. Nothing in this file contacts WhatsApp, Respond.io, the booking system or any analytics property.
   Every "event" is written to an on-page demo log, and every message is shown in a preview instead of being sent. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var state = { concern: null, concernKey: null, pay: null, duration: null, started: false };

  // ---- demo event log (stands in for GA4 / dataLayer) ----------------------------------------
  function track(name, params) {
    var li = document.createElement("li");
    var code = document.createElement("code"); code.textContent = name;
    li.appendChild(code); li.appendChild(document.createTextNode(" " + (params ? JSON.stringify(params) : "")));
    $("eventLog").appendChild(li);
    if (window.console) console.log("[demo event]", name, params || {});
  }
  $("toggleEvents").onclick = function () { $("events").hidden = !$("events").hidden; };
  $("closeEvents").onclick = function () { $("events").hidden = true; };

  // ---- ad -> page continuity: the hero follows the ad the visitor came from -------------------
  var HERO = {
    bloating: "Bloated after almost every meal? Let’s find out why.",
    reflux: "Heartburn that keeps coming back? Let’s find out why.",
    irregular: "Digestion you can’t predict? Let’s find out why."
  };
  function variantFromUrl() {
    var v = (qs.get("c") || qs.get("utm_content") || "").toLowerCase();
    if (/heartburn|reflux/.test(v)) return "reflux";
    if (/irregular|stool|bowel/.test(v)) return "irregular";
    return "bloating";
  }
  function setVariant(v) {
    $("heroHeadline").textContent = HERO[v];
    $("adVariant").value = v;
    document.querySelectorAll('[data-group="concern"] .chip').forEach(function (c) {   // pre-select the matching concern
      if (c.dataset.key === v && !state.concern) select(c, true);
    });
  }
  $("adVariant").onchange = function () { state.concern = null; clear("concern"); setVariant(this.value); };
  if (qs.get("clean") === "1") { document.body.classList.add("clean"); $("demoBar").style.display = "none"; }

  // ---- qualification: two required taps, one optional ------------------------------------------
  function clear(group) { document.querySelectorAll('[data-group="' + group + '"] .chip').forEach(function (c) { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); }); }
  function select(chip, silent) {
    var group = chip.parentNode.dataset.group;
    clear(group); chip.classList.add("on"); chip.setAttribute("aria-pressed", "true");
    // The message carries the words the visitor actually tapped, so concern and duration use the visible label.
    if (group === "concern") { state.concern = chip.textContent.trim(); state.concernKey = chip.dataset.key || "other"; }
    if (group === "pay") { state.pay = chip.dataset.value; $("directNote").hidden = chip.dataset.value !== "direct"; }
    if (group === "duration") state.duration = chip.textContent.trim();
    if (silent) return;
    if (!state.started) { state.started = true; track("qualification_start", { first_question: group }); }
    if (group === "pay") track(chip.dataset.value === "direct" ? "direct_billing_required" : "pay_claim_accepted", { answer: chip.dataset.value });
    if (state.concern && state.pay) track("qualification_complete", { concern: state.concernKey, pay: state.pay });
    $("formError").hidden = true;
  }
  document.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); c.onclick = function () { select(c); }; });
  document.querySelectorAll("[data-cta]").forEach(function (a) { a.addEventListener("click", function () { track("cta_click", { position: a.dataset.cta }); }); });

  // ---- hand-off: the message that WOULD open in WhatsApp ---------------------------------------
  // The text is built in message.js from the visitor's own taps. No reference code is invented:
  // a "Reference:" line is added only if a real one is passed in.
  var PAY_TEXT = MSLead.PAY_TEXT;
  function buildMessage() { return MSLead.buildMessage({ concern: state.concern, pay: state.pay, duration: state.duration }); }

  $("waBtn").onclick = function () {
    if (!state.concern || !state.pay) { $("formError").hidden = false; track("qualification_incomplete", { concern: !!state.concern, pay: !!state.pay }); return; }
    var msg = buildMessage();
    // A tap on the button is not an enquiry: the enquiry exists only once the visitor presses Send in WhatsApp.
    track("whatsapp_cta_click", { pay: state.pay });
    var url = MSLead.buildWaUrl(msg);
    // ?preview=1 keeps the visitor on the page and shows the message instead of opening WhatsApp (for demos and tests).
    if (url && qs.get("preview") !== "1") { window.location.href = url; return; }
    $("waMessage").dataset.url = url || "";
    $("waMessage").textContent = msg; $("waEcho").textContent = msg;
    var rows = [["Source", qs.get("utm_source") || "meta (from link parameters)"], ["Campaign", qs.get("utm_campaign") || "from utm_campaign"],
      ["Ad", qs.get("utm_content") || $("adVariant").selectedOptions[0].text], ["Service", "Gut Health Consultation – Dr. Hareem"],
      ["Main concern", state.concern], ["Payment preference", PAY_TEXT[state.pay]]];
    // Values include link parameters from the URL, so they are written as text, never as HTML.
    $("kvTable").textContent = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      r.forEach(function (v) { var td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
      $("kvTable").appendChild(tr);
    });
    show(1); $("modal").hidden = false;
  };

  function show(n) { [1, 2, 3].forEach(function (i) { $("step" + i).hidden = i !== n; }); }
  $("toStep2").onclick = function () {
    // Illustration of the reply wording drafted for the Mona V3 test agent. Not a live reply.
    var concern = state.concern === "Something else" ? "a digestive concern" : state.concern.toLowerCase();
    var about = "I can see you’re enquiring about " + concern + (state.duration ? ", for " + state.duration.toLowerCase() : "");
    var reply = state.pay === "direct"
      ? "Thank you for your interest in Dr. Hareem’s Gut Health Consultation. We work on Pay and Claim only, so there is no direct billing: you pay AED 247 at your visit and we give you the documents to claim from your insurer. Would you still like to go ahead?"
      : "Thank you for your interest in Dr. Hareem’s Gut Health Consultation. " + about + ", and that " +
        (state.pay === "self" ? "you’ll be paying yourself" : "Pay and Claim works for you") +
        ". I’ve passed your booking request to our reception team, who will confirm your appointment here when the clinic reopens — do you have a preferred day or time of day?";
    $("waReply").textContent = reply;
    $("slots").innerHTML = ["Example: Sun 10:30", "Example: Mon 16:00", "Example: Tue 09:00", "None of these"].map(function (s) { return "<button type='button'>" + s + "</button>"; }).join("");
    $("slots").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        track("slot_offered", { simulated: true });
        if (/None/.test(b.textContent)) { $("waConfirm").textContent = "No problem. Tell me which days and time of day suit you, and our team will come back with other times. (Example of the no-dead-end fallback.)"; }
        else { track("booking_complete", { simulated: true }); $("waConfirm").textContent = "You’re booked with Dr. Hareem Mir – " + b.textContent.replace("Example: ", "") + " (example time).\nMaison Santé, Meyan Mall, Umm Suqeim 2.\nAED 247, payable at the clinic. Reply here if you need to reschedule."; }
        show(3);
      };
    });
    show(2);
  };
  $("modalClose").onclick = $("restart").onclick = function () { $("modal").hidden = true; };

  // ---- sticky CTA appears once the hero button has scrolled away, hides while the form is on screen
  var hero = document.querySelector(".hero .btn"), form = $("qualify");
  function onScroll() {
    var past = hero.getBoundingClientRect().bottom < 0, f = form.getBoundingClientRect();
    $("stickyCta").classList.toggle("show", past && !(f.top < innerHeight && f.bottom > 0));
  }
  addEventListener("scroll", onScroll, { passive: true });

  setVariant(variantFromUrl());
  track("landing_page_view", { variant: $("adVariant").value });
})();
