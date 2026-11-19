/* The ticket forms of aplayersdubai.com, carried over unchanged (19 Nov 2026) so leads and sales land where they did.
   Block 1 is the live page's checkout config and the lines that give each ticket button its Whop link (the rest of
   that block ran the old page's own countdown, nav and letters, which this page does its own way). Block 2 is the live
   page's lead capture, verbatim. Never edit the endpoints here. */

  /* Every checkout link on the page comes from here.
     checkout: "" falls back to an email enquiry for that tier.
     api: the n8n checkout webhook. GA and VIP checkouts are made there; the plan link is the fallback. */
  var CFG = {
    api: "https://columapc.app.n8n.cloud/webhook/gt-checkout",
    doorsOpen: "2026-11-27T10:00:00Z", /* 2:00 PM Dubai time */
    tiers: {
      ga:   { name: "General Admission", checkout: "https://whop.com/checkout/plan_YYU5hrqRegZe1" },
      vip:  { name: "VIP",               checkout: "https://whop.com/checkout/plan_F9B8FVXzbSWAd" },
      vvip: { name: "VVIP",              checkout: "" } /* by application: the form is the whole step */
    }
  };

  (function () {
    document.querySelectorAll("[data-tier]").forEach(function (a) {
      var t = CFG.tiers[a.getAttribute("data-tier")];
      a.href = t.checkout || "mailto:hello@aplayerstour.com?subject=" +
        encodeURIComponent("A Players Dubai · " + t.name);
    });
  })();

  /* Ticket lead capture. Every ticket button in #tickets opens the form. On submit the lead
     goes to the events webhook, then the buyer continues to the href the button already had.
     Browser tracking goes through GTM via window.dataLayer; no pixel code lives on the page. */
  (function () {
    var HOOK = "https://columapc.app.n8n.cloud/webhook/gt-event-capture";
    var PENDING = "apd_lead_pending", FIRST_UTM = "apd_utm_first";
    var UTM = ["utm_source", "utm_medium", "utm_campaign"];
    var TOP = ["IE", "GB", "AE", "DE", "NL", "FR", "ES", "IT", "US"];
    var TYPO = {
      "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com",
      "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmali.com": "gmail.com", "gmsil.com": "gmail.com",
      "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com", "gmail.con": "gmail.com",
      "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmil.com": "hotmail.com",
      "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com", "outlok.com": "outlook.com", "outllok.com": "outlook.com",
      "outlook.co": "outlook.com", "outlook.con": "outlook.com", "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com",
      "yhoo.com": "yahoo.com", "yahoo.con": "yahoo.com", "iclod.com": "icloud.com", "icould.com": "icloud.com",
      "icloud.co": "icloud.com", "icloud.con": "icloud.com", "live.con": "live.com"
    };
    var THROWAWAY = ("mailinator.com guerrillamail.com guerrillamail.net sharklasers.com grr.la 10minutemail.com " +
      "10minutemail.net tempmail.com temp-mail.org tempmail.net tempmailo.com tempr.email yopmail.com yopmail.net " +
      "trashmail.com trashmail.de getnada.com nada.email dispostable.com throwawaymail.com maildrop.cc fakeinbox.com " +
      "mintemail.com mohmal.com emailondeck.com burnermail.io mailnesia.com mytemp.email tmpmail.org tmpmail.net " +
      "discard.email getairmail.com inboxkitten.com mail.tm moakt.com").split(" ");
    var FAKE_DOMAIN = /^(test|testing|example|sample|fake|asdf|qwerty)\.[a-z.]+$|\.(test|invalid|example|localhost)$/;
    var FAKE_LOCAL = /^(test|testing|tester|asdf|qwerty|fake|example|sample|noemail|none|xxx|aaa)\d*$/;
    var EMAIL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

    var lp = window.libphonenumber;
    var modal = document.getElementById("lc"), form = document.getElementById("lc-form");
    var go = document.getElementById("lc-go"), done = document.getElementById("lc-done");
    var vvipBox = document.getElementById("lc-vvip"), cc = document.getElementById("lc-cc");
    var ccShow = document.getElementById("lc-cc-show");
    var tier = null, dest = "", trigger = null, busy = false, inflight = null;

    function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
    function post(body) {
      return fetch(HOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true })
        .then(function (r) { return r.ok; }, function () { return false; });
    }

    // A lead that failed (or was cut off) last visit gets one more try.
    var left = load(PENDING);
    if (left) {
      save(PENDING, null);
      post(left).then(function (ok) { if (!ok) console.warn("[lead] retry failed, dropped", left); });
    }

    // UTMs from this URL, else the first-touch ones stored on an earlier visit.
    var utmNow = {};
    try {
      var qs = new URLSearchParams(location.search);
      UTM.forEach(function (k) { var v = (qs.get(k) || "").trim(); if (v) utmNow[k] = v; });
    } catch (e) {}
    if (Object.keys(utmNow).length && !load(FIRST_UTM)) save(FIRST_UTM, JSON.stringify(utmNow));
    function utm() {
      if (Object.keys(utmNow).length) return utmNow;
      try { return JSON.parse(load(FIRST_UTM) || "{}") || {}; } catch (e) { return {}; }
    }
    function trakyoId() {
      try { if (window.trakyo_id) return String(window.trakyo_id).trim(); } catch (e) {}
      try { var c = ("; " + document.cookie).split("; trakyo_id="); if (c.length === 2) { var v = decodeURIComponent(c.pop().split(";").shift()); if (v) return v.trim(); } } catch (e) {}
      var l = load("trakyo_id"); if (l) return l.trim();
      try { return new URLSearchParams(location.search).get("trakyo_id") || ""; } catch (e) { return ""; }
    }

    // Attribution for checkout metadata: utm_* and fbclid from the first landing of this session.
    var ATTR = "apd_attr", ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid"];
    (function () {
      try {
        if (sessionStorage.getItem(ATTR)) return;
        var q = new URLSearchParams(location.search), a = {};
        ATTR_KEYS.forEach(function (k) { var v = (q.get(k) || "").trim(); if (v) a[k] = v; });
        sessionStorage.setItem(ATTR, JSON.stringify(a));
      } catch (e) {}
    })();
    window.apdAttribution = function () {
      try { return JSON.parse(sessionStorage.getItem(ATTR) || "{}") || {}; } catch (e) { return {}; }
    };

    // Each dataLayer step fires once per visitor.
    function pushOnce(step, fields) {
      var flag = "apd_dl_" + step;
      if (load(flag)) return;
      var site = window.APD_SITE || {};
      var o = { event: step, event_city: site.event_city, event_id: site.event_id };
      Object.keys(fields || {}).forEach(function (k) { o[k] = fields[k]; });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(o);
      save(flag, "1");
    }

    // Country codes: a short list of likely ones first, then every country A–Z.
    (function () {
      var names = window.Intl && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
      var flag = function (c) { return c.replace(/./g, function (ch) { return String.fromCodePoint(127397 + ch.charCodeAt(0)); }); };
      var list = lp ? lp.getCountries() : ["IE"];
      var rows = list.map(function (c) {
        var n = c; try { n = names ? names.of(c) : c; } catch (e) {}
        return { c: c, n: n, d: lp ? "+" + lp.getCountryCallingCode(c) : "+353" };
      }).sort(function (a, b) { return a.n.localeCompare(b.n); });
      var opt = function (r) { return '<option value="' + r.c + '" data-show="' + flag(r.c) + " " + r.d + '">' + r.n + " (" + r.d + ")</option>"; };
      cc.innerHTML = TOP.map(function (c) { return rows.filter(function (r) { return r.c === c; })[0]; })
        .filter(Boolean).map(opt).join("") + '<option disabled>──────────</option>' + rows.map(opt).join("");
      cc.value = "IE";
      var show = function () { ccShow.textContent = cc.options[cc.selectedIndex].getAttribute("data-show"); };
      cc.addEventListener("change", show); show();
    })();

    // Button label -> ticket_type. Anything unrecognised is sent as its own label.
    function tierOf(a) {
      var label = a.textContent.replace(/\s+/g, " ").trim(), l = label.toLowerCase();
      var card = a.closest(".tcard"), name = card && card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : label;
      var type = /\bvvip\b|request access/.test(l) ? "VVIP" : /\bvip\b/.test(l) ? "VIP"
        : /\bga\b|general admission/.test(l) ? "GA" : /passport/.test(l) ? "Passport" : label;
      return { type: type, name: name, apply: type === "VVIP" };
    }

    function open(a) {
      trigger = a; dest = a.href; tier = tierOf(a);
      document.getElementById("lc-tier").textContent = tier.name;
      document.getElementById("lc-title").textContent = tier.apply ? "Request access" : "Your details";
      document.getElementById("lc-sub").textContent = tier.apply
        ? "Twelve seats, by application or referral. Tell us about you and your business."
        : "We’ll take you straight to checkout.";
      vvipBox.hidden = !tier.apply;
      go.textContent = tier.apply ? "Submit application" : "Continue to checkout";
      go.disabled = false; busy = false; done.hidden = true; go.hidden = false;
      form.querySelectorAll(".lc-f").forEach(function (f) { mark(f, ""); });
      modal.hidden = false;
      document.documentElement.style.overflow = "hidden";
      setTimeout(function () { form.firstName.focus(); }, 30);
    }
    function close() {
      if (busy) return;
      modal.hidden = true;
      document.documentElement.style.overflow = "";
      if (trigger) trigger.focus();
    }
    document.querySelectorAll("#tickets [data-tier]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(a); });
    });
    modal.querySelectorAll("[data-lc-close]").forEach(function (b) { b.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

    function mark(f, msg) { f.classList.toggle("bad", !!msg); f.querySelector("em").textContent = msg; }
    function emailProblem(v) {
      if (!v) return "Email is required.";
      if (!EMAIL.test(v)) return "Enter a valid email address.";
      var local = v.split("@")[0], domain = v.split("@")[1];
      if (TYPO[domain]) return "Did you mean " + local + "@" + TYPO[domain] + "?";
      if (/\.(con|cmo|comm|cpm|vom|xom|coom)$/.test(domain)) return "Check the ending of your email address.";
      if (THROWAWAY.indexOf(domain) > -1) return "Please use your real email, not a temporary one.";
      if (FAKE_DOMAIN.test(domain) || FAKE_LOCAL.test(local)) return "Please use your real email address.";
      return "";
    }
    function phoneProblem(raw, country) {
      if (!raw) return { msg: "Phone number is required." };
      if (!lp) {
        var d = raw.replace(/[^\d]/g, "").replace(/^0+/, "");
        var dial = cc.options[cc.selectedIndex].getAttribute("data-show").split(" ")[1];
        return d.length >= 6 && d.length <= 14 ? { e164: dial + d } : { msg: "Enter a valid phone number." };
      }
      var p = lp.parsePhoneNumberFromString(raw, country);
      if (!p || !p.isValid()) return { msg: "Enter a valid number for the selected country." };
      return { e164: p.number };
    }

    function validate() {
      var f = form, out = {}, bad = [];
      function need(name, msg) {
        var v = f[name].value.replace(/\s+/g, " ").trim(), box = f[name].closest(".lc-f");
        mark(box, v ? "" : msg); if (!v) bad.push(f[name]); return v;
      }
      out.firstName = need("firstName", "First name is required.");
      out.lastName = need("lastName", "Last name is required.");
      out.email = f.email.value.trim().toLowerCase();
      var em = emailProblem(out.email); mark(f.email.closest(".lc-f"), em); if (em) bad.push(f.email);
      var ph = phoneProblem(f.phone.value.trim(), cc.value);
      mark(f.phone.closest(".lc-f"), ph.msg || ""); if (ph.msg) bad.push(f.phone); out.phone = ph.e164;
      if (tier.apply) {
        out.company = need("company", "Company is required.");
        out.what_building = f.what_building.value.trim();
        out.revenue_range = need("revenue_range", "Select your monthly revenue.");
      }
      if (bad.length) { bad[0].focus(); return null; }
      return out;
    }
    // The form opens with focus already in it, so a "touch" is the first keystroke or tap.
    function started() { pushOnce("event_form_start"); }
    form.addEventListener("input", started);
    form.addEventListener("pointerdown", started);

    form.addEventListener("input", function (e) {
      var box = e.target.closest(".lc-f"); if (box && box.classList.contains("bad")) mark(box, "");
    });
    form.addEventListener("change", function (e) {
      var box = e.target.closest(".lc-f"); if (box && box.classList.contains("bad")) mark(box, "");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var v = validate();
      if (!v) return;
      busy = true; go.disabled = true;
      go.textContent = tier.apply ? "Sending…" : "Taking you to checkout…";

      var u = utm(), p = {
        event_type: "popup", email: v.email, firstName: v.firstName, lastName: v.lastName, phone: v.phone,
        city: "Dubai", ticket_type: tier.type,
        company: v.company, what_building: v.what_building, revenue_range: v.revenue_range,
        page_url: location.origin + location.pathname + location.search + "#tickets",
        trakyo_id: trakyoId(), utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign,
        submitted_at: new Date().toISOString()
      };
      Object.keys(p).forEach(function (k) { if (p[k] == null || String(p[k]).trim() === "") delete p[k]; });
      var body = JSON.stringify(p);
      console.info("[lead] POST " + HOOK + "\n" + body);

      pushOnce("event_lead_capture", { email: v.email, phone: v.phone, first_name: v.firstName, last_name: v.lastName });
      save(PENDING, body); inflight = body;
      var sent = post(body).then(function (ok) {
        if (ok) save(PENDING, null); else console.warn("[lead] webhook failed, kept for retry");
        return ok;
      });
      Promise.race([sent, new Promise(function (r) { setTimeout(function () { r("timeout"); }, 4000); })])
        .then(function (res) {
          if (res === "timeout") console.warn("[lead] webhook slow, continuing; kept for retry");
          // The keepalive request outlives this page, and the stored copy covers a failure.
          inflight = null;
          // VVIP is by application, and a button with no checkout link confirms instead.
          if (tier.apply || !/^https?:/i.test(dest)) { busy = false; go.hidden = true; done.hidden = false; return; }
          toCheckout(v);
        });
    });

    function cookie(n) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    }
    function uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      var b = new Uint8Array(16); crypto.getRandomValues(b);
      b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
      var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
      return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    }
    // GA and VIP: n8n makes a Whop checkout that carries this visitor's attribution and a fresh
    // event_uid, and reads the real price from Whop. If it can't, the buyer still gets the plain
    // plan link, so a sale is never blocked.
    function toCheckout(v) {
      var api = window.CFG && CFG.api;
      if (tier.type !== "GA" && tier.type !== "VIP") { location.href = dest; return; }
      var site = window.APD_SITE || {}, a = window.apdAttribution ? window.apdAttribution() : {}, u = utm();
      var event_uid = uuid();
      // Pushed before n8n is asked, so it counts on the fallback path too. The price is only
      // known once Whop answers, so value is left out here.
      var view = { event: "event_checkout_view", tier: tier.type, event_uid: event_uid,
        event_city: site.event_city, event_id: site.event_id, currency: "EUR" };
      if (v.email) view.email = v.email;
      if (v.phone) view.phone = v.phone;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(view);
      if (!api) { location.href = dest; return; }
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      fetch(api, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctl ? ctl.signal : undefined,
        body: JSON.stringify({
          event_city: site.event_city, event_id: site.event_id, tier: tier.type, event_uid: event_uid,
          utm_source: a.utm_source || u.utm_source, utm_medium: a.utm_medium || u.utm_medium,
          utm_campaign: a.utm_campaign || u.utm_campaign, utm_content: a.utm_content || u.utm_content,
          fbclid: a.fbclid, trakyo_id: trakyoId(), fbp: cookie("_fbp"), fbc: cookie("_fbc"),
          email: v.email, phone: v.phone, user_agent: navigator.userAgent,
          page_url: location.origin + location.pathname + location.search
        })
      })
        .then(function (r) { if (!r.ok) throw new Error("checkout " + r.status); return r.json(); })
        .then(function (c) {
          clearTimeout(timer);
          if (!c || !c.purchase_url) throw new Error("checkout came back without a purchase_url");
          var rec = { tier: c.tier, value: c.value, currency: c.currency, event_uid: event_uid,
            email: v.email, phone: v.phone, first_name: v.firstName, last_name: v.lastName };
          save("apd_checkout_" + event_uid, JSON.stringify(rec));  // /thanks reads this back
          location.href = c.purchase_url;
        })
        .catch(function (e) {
          clearTimeout(timer);
          console.warn("[checkout] n8n checkout unavailable, using the plan link", e);
          location.href = dest;
        });
    }

    // Leaving mid-submit: hand the same payload to the browser to deliver.
    window.addEventListener("pagehide", function () {
      if (!inflight) return;
      try { navigator.sendBeacon(HOOK, new Blob([inflight], { type: "application/json" })); } catch (e) {}
    });
  })();
