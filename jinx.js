/* ⚡ Super JinX dashboard helper
   1) first visit opens in Persian; language menu still works and is remembered
   2) adds "تغییر نام کاربری و رمز عبور" to the panel's main menu (☰), styled with the panel's own theme
      (same classes, same icon set, same dialog look, light & dark). Asks for the CURRENT username + password,
      then sets a NEW username + password. Any password works, you stay logged in. */
(function () {
  var LNG = "i18nextLng";
  try { if (!localStorage.getItem(LNG)) localStorage.setItem(LNG, "fa"); } catch (e) {}
  function lang() { try { return (localStorage.getItem(LNG) || "fa").slice(0, 2); } catch (e) { return "fa"; } }
  function syncLang() { var l = lang(); if (document.documentElement.getAttribute("lang") !== l) document.documentElement.setAttribute("lang", l); }
  syncLang(); setInterval(syncLang, 1000);

  var T = {
    fa: { item: "تغییر نام کاربری و رمز عبور", title: "تغییر نام کاربری و رمز عبور",
          cu: "نام کاربری فعلی", cp: "رمز عبور فعلی", nu: "نام کاربری جدید", pw: "رمز عبور جدید", pw2: "تکرار رمز عبور جدید",
          save: "ذخیره", cancel: "انصراف", show: "نمایش رمزها", ok: "با موفقیت ذخیره شد",
          hint: "نام کاربری: 3 تا 32 حرف انگلیسی، عدد یا _ . - @ · رمز عبور: هر چیزی",
          e: { current_required: "نام کاربری و رمز عبور فعلی را وارد کنید", wrong_current: "نام کاربری یا رمز عبور فعلی اشتباه است",
               bad_username: "نام کاربری جدید باید 3 تا 32 کاراکتر از حروف انگلیسی، عدد یا _ . - @ باشد",
               password_required: "رمز عبور جدید را وارد کنید", nomatch: "رمز عبور جدید و تکرارش یکسان نیستند",
               password_too_long: "رمز عبور جدید خیلی طولانی است", username_taken: "این نام کاربری قبلاً استفاده شده",
               reserved: "این نام کاربری رزرو شده است", too_many: "تلاش ناموفق زیاد بود، 5 دقیقه دیگر دوباره امتحان کنید",
               not_found: "این ادمین پیدا نشد", network: "ارتباط با سرور برقرار نشد", other: "خطای غیرمنتظره، دوباره امتحان کنید" } },
    en: { item: "Change username & password", title: "Change username & password",
          cu: "Current username", cp: "Current password", nu: "New username", pw: "New password", pw2: "Confirm new password",
          save: "Save", cancel: "Cancel", show: "Show passwords", ok: "Saved successfully",
          hint: "Username: 3-32 letters, digits or _ . - @ · Password: anything",
          e: { current_required: "Enter your current username and password", wrong_current: "Current username or password is wrong",
               bad_username: "New username must be 3-32 characters: letters, digits or _ . - @",
               password_required: "Enter a new password", nomatch: "New passwords do not match",
               password_too_long: "New password is too long", username_taken: "This username is already taken",
               reserved: "This username is reserved", too_many: "Too many failed attempts, try again in 5 minutes",
               not_found: "Admin not found", network: "Could not reach the server", other: "Unexpected error, please try again" } }
  };
  function t(k) { return (T[lang()] || T.en)[k]; }
  function token() { try { return localStorage.getItem("token") || ""; } catch (e) { return ""; } }
  var KEY_PATH = "M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z";
  var X_PATH = "M6 18 18 6M6 6l12 12";
  function svg(d, size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" ' +
      'width="' + size + '" height="' + size + '" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="' + d + '"/></svg>';
  }

  function api(method, path, body, form) {
    var h = { "Authorization": "Bearer " + token() };
    var b;
    if (form) { h["Content-Type"] = "application/x-www-form-urlencoded"; b = new URLSearchParams(body).toString(); }
    else if (body) { h["Content-Type"] = "application/json"; b = JSON.stringify(body); }
    return fetch(path, { method: method, headers: h, body: b }).then(function (r) {
      return r.text().then(function (x) {
        var j = null; try { j = JSON.parse(x); } catch (e) {}
        if (!r.ok) throw new Error((j && (j.detail && (j.detail.msg || j.detail))) || ("HTTP " + r.status));
        return j;
      });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // NATIVE LOOK ENGINE
  // Every time the panel opens one of ITS OWN dialogs (create user, hosts, core...), we remember the
  // exact theme classes it used. Our dialog then reuses those same classes, so it is rendered by the
  // panel's own theme engine: same colors, radius, shadow, fonts, spacing, dark/light mode.
  // Before the panel has opened any dialog, a hand-tuned copy of the Marzban/Chakra theme is used.
  // ---------------------------------------------------------------------------------------------
  var CAP_KEY = "jinx-ui-cap-v1";
  function capLoad() { try { return JSON.parse(localStorage.getItem(CAP_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function emo(el) { return el ? Array.prototype.filter.call(el.classList, function (c) { return /^css-/.test(c); }).join(" ") : ""; }
  function solid(el) {
    var c = getComputedStyle(el).backgroundColor;
    return !!c && c !== "transparent" && c.indexOf("rgba(0, 0, 0, 0)") < 0;
  }
  function capture() {
    var c = capLoad(), changed = false;
    function put(k, v) { if (v && c[k] !== v) { c[k] = v; changed = true; } }
    var content = null, all = document.querySelectorAll(".chakra-modal__content");
    for (var i = 0; i < all.length; i++) if (!all[i].closest("#jinx-pw, .jinx-rs")) { content = all[i]; break; }
    if (content) {
      var root = content.closest(".chakra-portal") || document;
      put("overlay", emo(root.querySelector(".chakra-modal__overlay")));
      put("container", emo(content.closest(".chakra-modal__content-container")));
      put("content", emo(content));
      var hd = content.querySelector(".chakra-modal__header");
      put("header", emo(hd));
      if (hd) {
        var p = hd.querySelector("p, h2, h3"); put("title", emo(p));
        var ic = null, kids = hd.querySelectorAll("div, span");
        for (var k = 0; k < kids.length; k++) {
          if (kids[k].querySelector("svg") && parseFloat(getComputedStyle(kids[k]).borderRadius) > 8) { ic = kids[k]; break; }
        }
        put("icon", emo(ic));
        if (hd.parentNode && hd.parentNode.querySelector(".chakra-stack")) put("hstack", emo(hd.querySelector(".chakra-stack")));
      }
      put("close", emo(content.querySelector(".chakra-modal__close-btn")));
      put("body", emo(content.querySelector(".chakra-modal__body")));
      put("footer", emo(content.querySelector(".chakra-modal__footer")));
      put("label", emo(content.querySelector(".chakra-form__label")));
      put("fc", emo(content.querySelector(".chakra-form-control")));
      put("input", emo(content.querySelector("input.chakra-input")));
      put("cb", emo(content.querySelector("label.chakra-checkbox")));
      put("cbControl", emo(content.querySelector(".chakra-checkbox__control")));
      put("cbLabel", emo(content.querySelector(".chakra-checkbox__label")));
      var fb = content.querySelectorAll(".chakra-modal__footer button.chakra-button");
      for (var b = 0; b < fb.length; b++) put(solid(fb[b]) ? "btnPrimary" : "btnSecondary", emo(fb[b]));
    }
    if (!c.input) put("inputPage", emo(document.querySelector("input.chakra-input")));
    if (!c.btnPrimary) {
      var bs = document.querySelectorAll("button.chakra-button");
      for (var j = 0; j < bs.length; j++) if (bs[j].offsetParent && solid(bs[j])) { put("btnPage", emo(bs[j])); break; }
    }
    if (changed) { try { localStorage.setItem(CAP_KEY, JSON.stringify(c)); } catch (e) {} }
  }
  var ruleCache = {};
  function hasRule(cls) {
    if (!cls) return false;
    var first = cls.split(" ")[0];
    if (ruleCache[first] === true) return true;
    var sel = "." + first, sheets = document.styleSheets;
    for (var i = 0; i < sheets.length; i++) {
      var rules; try { rules = sheets[i].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var j = 0; j < rules.length; j++) {
        var st = rules[j].selectorText;
        if (st && st.indexOf(sel) >= 0) { ruleCache[first] = true; return true; }
      }
    }
    return false;
  }
  // class for part k: panel's own class if its CSS is loaded, otherwise our hand-tuned twin ("jp-own")
  function K(k, alt) {
    var c = capLoad(), v = c[k] || (alt && c[alt]) || "";
    return hasRule(v) ? v : "jp-own";
  }

  function css() {
    if (document.getElementById("jinx-pw-css")) return;
    var s = document.createElement("style"); s.id = "jinx-pw-css";
    var B = "var(--chakra-colors-chakra-border-color,#e2e8f0)", P = "var(--chakra-colors-primary-500,var(--chakra-colors-blue-500,#3182ce))";
    s.textContent =
      // twins of the Chakra/Marzban modal parts (used only until the panel's own classes are known)
      ".chakra-modal__overlay.jp-own{position:fixed;inset:0;z-index:var(--chakra-zIndices-modal,1400);background:var(--chakra-colors-blackAlpha-300,rgba(0,0,0,.16));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}" +
      ".chakra-modal__content-container.jp-own{position:fixed;inset:0;z-index:var(--chakra-zIndices-modal,1400);display:flex;justify-content:center;align-items:flex-start;overflow:auto;overscroll-behavior-y:none}" +
      ".chakra-modal__content.jp-own{position:relative;display:flex;flex-direction:column;width:100%;outline:0;max-width:var(--chakra-sizes-sm,24rem);margin:3.75rem 1rem;" +
        "border-radius:var(--chakra-radii-md,.375rem);background:var(--chakra-colors-white,#fff);color:inherit;box-shadow:var(--chakra-shadows-lg)}" +
      ".chakra-ui-dark .chakra-modal__content.jp-own,[data-theme=dark] .chakra-modal__content.jp-own{background:var(--chakra-colors-gray-700,#2d3748);box-shadow:var(--chakra-shadows-dark-lg)}" +
      ".chakra-modal__header.jp-own{flex:0 1 0%;padding:1.5rem 1.5rem 1rem;font-size:var(--chakra-fontSizes-xl,1.25rem);font-weight:var(--chakra-fontWeights-semibold,600)}" +
      ".chakra-modal__close-btn.jp-own{position:absolute;top:.5rem;inset-inline-end:.75rem;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;" +
        "border:0;background:transparent;color:inherit;border-radius:var(--chakra-radii-md,.375rem);cursor:pointer;transition:background .2s}" +
      ".chakra-modal__close-btn.jp-own:hover{background:var(--chakra-colors-blackAlpha-100,rgba(0,0,0,.06))}" +
      ".chakra-ui-dark .chakra-modal__close-btn.jp-own:hover{background:var(--chakra-colors-whiteAlpha-100,rgba(255,255,255,.06))}" +
      ".chakra-modal__body.jp-own{flex:1 1 0%;padding:.5rem 1.5rem}" +
      ".chakra-modal__footer.jp-own{display:flex;align-items:center;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem}" +
      ".chakra-form__label.jp-own{display:block;text-align:start;font-size:var(--chakra-fontSizes-sm,.875rem);font-weight:var(--chakra-fontWeights-medium,500);margin-inline-end:.75rem;margin-bottom:.5rem;opacity:1}" +
      ".chakra-form-control.jp-own{width:100%;position:relative}" +
      "input.chakra-input.jp-own{width:100%;min-width:0;outline:2px solid transparent;position:relative;appearance:none;transition:all .2s;font-size:var(--chakra-fontSizes-sm,.875rem);" +
        "padding-inline:.75rem;height:2rem;border-radius:var(--chakra-radii-md,.375rem);border:1px solid " + B + ";background:inherit;color:inherit}" +
      "input.chakra-input.jp-own:hover{border-color:var(--chakra-colors-gray-300,#cbd5e0)}" +
      ".chakra-ui-dark input.chakra-input.jp-own:hover{border-color:var(--chakra-colors-whiteAlpha-400,rgba(255,255,255,.24))}" +
      "input.chakra-input.jp-own:focus{z-index:1;border-color:" + P + ";box-shadow:0 0 0 1px " + P + "}" +
      "input.chakra-input:disabled{opacity:.4;cursor:not-allowed}" +
      "button.chakra-button.jp-own{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;user-select:none;outline:0;cursor:pointer;" +
        "height:2rem;min-width:2rem;padding-inline:.75rem;font-size:var(--chakra-fontSizes-sm,.875rem);font-weight:var(--chakra-fontWeights-semibold,600);" +
        "border-radius:var(--chakra-radii-md,.375rem);transition:all .25s;border:0}" +
      "button.chakra-button.jp-own.jp-primary{background:" + P + ";color:#fff}" +
      "button.chakra-button.jp-own.jp-primary:hover{background:var(--chakra-colors-primary-600,var(--chakra-colors-blue-600,#2b6cb0))}" +
      "button.chakra-button.jp-own.jp-secondary{background:transparent;color:inherit;border:1px solid " + B + "}" +
      "button.chakra-button.jp-own.jp-secondary:hover{background:var(--chakra-colors-gray-100,#edf2f7)}" +
      ".chakra-ui-dark button.chakra-button.jp-own.jp-secondary:hover{background:var(--chakra-colors-whiteAlpha-200,rgba(255,255,255,.08))}" +
      "button.chakra-button:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}" +
      ".jp-icon.jp-own{display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;padding:.25rem;border-radius:9999px;box-sizing:content-box;" +
        "background:var(--chakra-colors-primary-400,var(--chakra-colors-blue-400,#4299e1));color:#fff;border:6px solid var(--chakra-colors-primary-100,var(--chakra-colors-blue-100,#bee3f8))}" +
      ".chakra-ui-dark .jp-icon.jp-own,[data-theme=dark] .jp-icon.jp-own{border-color:var(--chakra-colors-gray-600,#4a5568)}" +
      ".jp-head{display:flex;align-items:center;gap:.5rem}" +
      ".jp-title.jp-own{font-weight:var(--chakra-fontWeights-semibold,600);font-size:var(--chakra-fontSizes-lg,1.125rem)}" +
      // Chakra checkbox twin
      "label.chakra-checkbox.jp-own{display:inline-flex;align-items:center;vertical-align:top;cursor:pointer;position:relative;gap:.5rem}" +
      ".chakra-checkbox__control.jp-own{display:inline-flex;align-items:center;justify-content:center;width:.875rem;height:.875rem;flex-shrink:0;" +
        "border:2px solid " + B + ";border-radius:var(--chakra-radii-sm,.125rem);transition:all .15s;color:#fff}" +
      ".chakra-checkbox__control.jp-own[data-checked]{background:" + P + ";border-color:" + P + "}" +
      ".chakra-checkbox__control.jp-own svg{width:.6rem;opacity:0}.chakra-checkbox__control[data-checked] svg{opacity:1}" +
      ".chakra-checkbox__label.jp-own{font-size:var(--chakra-fontSizes-sm,.875rem);user-select:none}" +
      // layout bits that are ours in both modes
      "#jinx-pw .jp-fields{display:flex;flex-direction:column;gap:1rem}" +
      "#jinx-pw .jp-sep{height:1px;background:" + B + ";margin:.25rem 0}" +
      "#jinx-pw .jp-hint{font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6;line-height:1.7}" +
      "#jinx-pw .jp-m{font-size:var(--chakra-fontSizes-sm,.875rem);line-height:1.6}#jinx-pw .jp-m:empty{display:none}" +
      "#jinx-pw .jp-m.e{color:var(--chakra-colors-red-400,#f56565)}#jinx-pw .jp-m.s{color:var(--chakra-colors-green-400,#48bb78)}" +
      "#jinx-pw input.chakra-input{direction:ltr;text-align:start;unicode-bidi:plaintext}" +
      "#jinx-pw .chakra-modal__footer{gap:.75rem}" +
      "#jinx-pw .jp-cbh{position:absolute;width:1px;height:1px;opacity:0;margin:0;pointer-events:none}" +
      "@keyframes jpf{from{opacity:0}to{opacity:1}}@keyframes jps{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}" +
      "#jinx-pw .chakra-modal__overlay{animation:jpf .15s ease-out}#jinx-pw .chakra-modal__content{animation:jps .2s cubic-bezier(0,0,.2,1)}";
    document.head.appendChild(s);
  }

  var CHECK = '<svg viewBox="0 0 12 10" aria-hidden="true" style="fill:none;stroke-width:2;stroke:currentColor;stroke-dasharray:16px"><polyline points="1.5 6 4.5 9 10.5 1"></polyline></svg>';

  function openModal() {
    capture(); css();
    var old = document.getElementById("jinx-pw"); if (old) old.remove();
    var inC = K("input", "inputPage"), pC = K("btnPrimary", "btnPage"), sC = K("btnSecondary");
    var field = function (id, lbl, type, ac) {
      return '<div class="chakra-form-control ' + K("fc") + '"><label for="' + id + '" class="chakra-form__label ' + K("label") + '">' + lbl + '</label>' +
        '<input id="' + id + '" class="chakra-input ' + inC + '" type="' + type + '" autocomplete="' + ac + '" autocapitalize="off" spellcheck="false"></div>';
    };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var w = document.createElement("div"); w.id = "jinx-pw"; w.className = "chakra-portal";
    w.setAttribute("dir", document.documentElement.getAttribute("dir") || (lang() === "fa" ? "rtl" : "ltr"));
    w.innerHTML =
      '<div class="chakra-modal__overlay ' + K("overlay") + '"></div>' +
      '<div class="chakra-modal__content-container ' + K("container") + '">' +
        '<section class="chakra-modal__content ' + K("content") + '" role="dialog" aria-modal="true" tabindex="-1">' +
          '<header class="chakra-modal__header ' + K("header") + '"><div class="jp-head">' +
            '<div class="jp-icon ' + K("icon") + '">' + svg(KEY_PATH, 20) + '</div>' +
            '<p class="jp-title ' + K("title") + '">' + esc(t("title")) + '</p></div></header>' +
          '<button type="button" aria-label="Close" class="chakra-modal__close-btn ' + K("close") + '">' +
            '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M.439,21.44a1.5,1.5,0,0,0,2.122,2.121L11.823,14.3a.25.25,0,0,1,.354,0l9.262,9.263a1.5,1.5,0,1,0,2.122-2.121L14.3,12.177a.25.25,0,0,1,0-.354l9.263-9.262A1.5,1.5,0,0,0,21.439.44L12.177,9.7a.25.25,0,0,1-.354,0L2.561.44A1.5,1.5,0,0,0,.439,2.561L9.7,11.823a.25.25,0,0,1,0,.354Z"></path></svg></button>' +
          '<div class="chakra-modal__body ' + K("body") + '"><div class="jp-fields">' +
            field("jcu", esc(t("cu")), "text", "username") +
            field("jcp", esc(t("cp")), "password", "current-password") +
            '<div class="jp-sep"></div>' +
            field("jnu", esc(t("nu")), "text", "off") +
            field("jp1", esc(t("pw")), "password", "new-password") +
            field("jp2", esc(t("pw2")), "password", "new-password") +
            '<label class="chakra-checkbox ' + K("cb") + '"><input id="jps" type="checkbox" class="jp-cbh">' +
              '<span class="chakra-checkbox__control ' + K("cbControl") + '" aria-hidden="true">' + CHECK + '</span>' +
              '<span class="chakra-checkbox__label ' + K("cbLabel") + '">' + esc(t("show")) + '</span></label>' +
            '<div class="jp-hint">' + esc(t("hint")) + '</div>' +
            '<div class="jp-m" role="status"></div>' +
          '</div></div>' +
          '<footer class="chakra-modal__footer ' + K("footer") + '">' +
            '<button type="button" class="chakra-button jp-cancel jp-secondary ' + sC + '">' + esc(t("cancel")) + '</button>' +
            '<button type="button" class="chakra-button jp-save jp-primary ' + pC + '">' + esc(t("save")) + '</button>' +
          '</footer>' +
        '</section></div>';
    document.body.appendChild(w);
    var q = function (sel) { return w.querySelector(sel); };
    var save = q(".jp-save"), cancel = q(".jp-cancel"), msg = q(".jp-m");
    var cu = q("#jcu"), cp = q("#jcp"), nu = q("#jnu"), p1 = q("#jp1"), p2 = q("#jp2"), sh = q("#jps"), ctl = q(".chakra-checkbox__control");
    var busy = false;
    var onKey = function (e) { if (e.key === "Escape") close(); };
    var close = function () { if (busy) return; w.remove(); document.removeEventListener("keydown", onKey); document.body.style.overflow = bodyOverflow; };
    var bodyOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    q(".chakra-modal__content-container").addEventListener("mousedown", function (e) { if (e.target === e.currentTarget) close(); });
    q(".chakra-modal__close-btn").onclick = close; cancel.onclick = close;
    sh.onchange = function () {
      cp.type = p1.type = p2.type = sh.checked ? "text" : "password";
      if (sh.checked) { ctl.setAttribute("data-checked", ""); q(".chakra-checkbox").setAttribute("data-checked", ""); }
      else { ctl.removeAttribute("data-checked"); q(".chakra-checkbox").removeAttribute("data-checked"); }
    };
    api("GET", "/api/admin").then(function (a) { if (a && a.username) { cu.value = a.username; nu.value = a.username; cp.focus(); } })
      .catch(function () {});
    setTimeout(function () { (cu.value ? cp : cu).focus(); }, 80);
    var err = function (code) { var E = t("e"); return E[code] || E.other; };
    var say = function (txt, ok) { msg.className = "jp-m " + (ok ? "s" : "e"); msg.textContent = txt; };
    var submit = function () {
      if (busy) return;
      var U = cu.value.trim(), N = nu.value.trim() || U;
      if (!U || !cp.value) { say(err("current_required")); (U ? cp : cu).focus(); return; }
      if (!/^[A-Za-z0-9_.@-]{3,32}$/.test(N)) { say(err("bad_username")); nu.focus(); return; }
      if (!p1.value) { say(err("password_required")); p1.focus(); return; }
      if (p1.value !== p2.value) { say(err("nomatch")); p2.focus(); return; }
      if (new TextEncoder().encode(p1.value).length > 72) { say(err("password_too_long")); p1.focus(); return; }
      busy = true; save.disabled = cancel.disabled = true; save.setAttribute("data-loading", ""); say("");
      fetch("/jinx-api/account", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ current_username: U, current_password: cp.value, new_username: N, new_password: p1.value }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: "other" }; }); })
        .then(function (res) {
          if (!res || !res.ok) throw { code: (res && res.error) || "other" };
          var done = function (tok) {
            if (tok) { try { localStorage.setItem("token", tok); } catch (e) {} }
            say(t("ok"), true);
            setTimeout(function () { location.reload(); }, 900);
          };
          if (res.access_token) return done(res.access_token);
          // saved already; if auto-login fails for any reason, just reload -> panel shows its normal login page
          return api("POST", "/api/admin/token", { username: res.username, password: p1.value, grant_type: "password" }, true)
            .then(function (r) { done(r && r.access_token); })
            .catch(function () { done(null); });
        })
        .catch(function (e) {
          busy = false; save.disabled = cancel.disabled = false; save.removeAttribute("data-loading");
          say(err(e && e.code ? e.code : "network"));
        });
    };
    save.onclick = submit;
    [cu, cp, nu, p1, p2].forEach(function (el) { el.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); }); });
  }

  // learn the panel's theme whenever it opens its own dialogs
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) {
        var n = muts[i].addedNodes[j];
        if (n.nodeType === 1 && !n.closest("#jinx-pw, .jinx-rs") && (n.matches(".chakra-portal, .chakra-modal__content") || n.querySelector && n.querySelector(".chakra-modal__content"))) {
          setTimeout(capture, 400); return;
        }
      }
    }
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });



  // =============================================================================================
  // 🤝 RESELLER PANELS (پنل‌های نمایندگی)  -  same dialog engine as above, so it looks native
  // =============================================================================================
  var RT = {
    fa: { item: "پنل‌های نمایندگی", title: "پنل‌های نمایندگی", meItem: "اعتبار پنل نمایندگی", meTitle: "اعتبار پنل نمایندگی",
          add: "ساخت پنل نمایندگی", refresh: "بروزرسانی", empty: "هنوز پنل نمایندگی نساخته‌اید. با «ساخت پنل نمایندگی» اولین نماینده را بسازید.",
          intro: "هر نماینده با نام کاربری و رمز خودش وارد همین پنل می‌شود و فقط کاربران خودش را می‌بیند.",
          name: "نام کاربری", pass: "رمز عبور", gen: "ساخت رمز", users: "کاربران", volume: "حجم", expire: "انقضا", status: "وضعیت", note: "توضیحات (اختیاری)",
          maxUsers: "حداکثر تعداد کاربر", quota: "حجم کل قابل فروش (GB)", days: "مدت اعتبار (روز)", zero: "0 یعنی نامحدود",
          passEdit: "رمز عبور جدید (خالی = بدون تغییر)", enabled: "پنل فعال باشد", unlimited: "نامحدود", never: "بدون انقضا",
          st: { active: "فعال", disabled: "غیرفعال", expired: "منقضی" }, left: "روز مانده", ended: "تمام شده",
          save: "ذخیره", create: "ساخت پنل", cancel: "انصراف", back: "بازگشت", edit: "ویرایش", del: "حذف", copy: "کپی اطلاعات ورود",
          on: "فعال کردن", off: "غیرفعال کردن", close: "بستن",
          created: "پنل نمایندگی ساخته شد. این اطلاعات را برای نماینده بفرستید:", panelUrl: "آدرس پنل", copied: "کپی شد",
          delQ: "پنل نمایندگی «{n}» حذف شود؟", delD: "کاربران این نماینده ({u} کاربر) حذف نمی‌شوند و به حساب شما منتقل می‌شوند.",
          saved: "ذخیره شد", deleted: "حذف شد", loading: "در حال بارگذاری…",
          meD: "محدودیت‌های پنل شما که مدیر تعیین کرده است.", meUsers: "کاربران ساخته‌شده", meVol: "حجم مصرف‌شده از اعتبار", meExp: "اعتبار پنل تا",
          titleL: "نام نمایشی (اختیاری)", search: "جستجوی نام، نام نمایشی یا توضیحات", fAll: "همه", noMatch: "موردی با این جستجو پیدا نشد.",
          charge: "شارژ و تمدید", chargeD: "مقدار را اضافه کنید؛ عدد منفی یعنی کم کردن. پنل منقضی‌شده از امروز تمدید می‌شود.", addGb: "افزودن حجم (GB)", addDays: "افزودن روز", addUsers: "افزودن ظرفیت کاربر", doCharge: "اعمال شارژ", charged: "شارژ اعمال شد",
          now: "الان", hist: "تاریخچه", histEmpty: "هنوز فعالیتی ثبت نشده است.", renameH: "برای تغییر نام، نام کاربری را ویرایش کنید (نماینده باید دوباره وارد شود)",
          newCred: "تغییرات ذخیره شد. اطلاعات ورود جدید را برای نماینده بفرستید:", minUsers: "حداقل 10 کاربر · 0 یعنی نامحدود",
          hx: { create: "ساخت پنل", update: "ویرایش", charge: "شارژ", password: "تغییر رمز", rename: "تغییر نام", max_users: "ظرفیت کاربر", quota: "حجم", expire: "انقضا", enabled: "وضعیت", title: "نام نمایشی", note: "توضیحات",
                "user+": "ساخت کاربر", "user-": "حذف کاربر", "user~": "ویرایش کاربر", "user:reset": "ریست مصرف کاربر", "user:revoke_sub": "تعویض ساب کاربر" },
          e: { min_capacity: "ظرفیت کاربر باید حداقل 10 باشد (یا 0 برای نامحدود)", min_quota: "حجم باید حداقل 0.1 گیگ باشد (یا 0 برای نامحدود)",
               unlimited_quota: "حجم این پنل نامحدود است؛ برای شارژ حجم، ابتدا در ویرایش سقف حجم تعیین کنید", unlimited_time: "این پنل بدون انقضاست؛ برای افزودن روز، ابتدا در ویرایش مدت تعیین کنید",
               unlimited_users: "ظرفیت کاربر این پنل نامحدود است؛ ابتدا در ویرایش سقف تعیین کنید", nothing: "هیچ مقداری برای شارژ وارد نشده است", busy: "اطلاعات نمایندگی موقتاً در دسترس نیست؛ چند لحظه دیگر دوباره امتحان کنید",
               bad_username: "نام کاربری باید 3 تا 32 کاراکتر از حروف انگلیسی، عدد یا _ . - @ باشد", password_required: "رمز عبور را وارد کنید",
               password_too_long: "رمز عبور خیلی طولانی است", username_taken: "این نام کاربری قبلاً استفاده شده", reserved: "این نام کاربری رزرو شده است",
               bad_number: "عددها را درست وارد کنید", not_found: "این نماینده پیدا نشد", sudo_only: "فقط مدیر اصلی به این بخش دسترسی دارد",
               login_required: "دوباره وارد پنل شوید", network: "ارتباط با سرور برقرار نشد", other: "خطای غیرمنتظره، دوباره امتحان کنید" } },
    en: { item: "Reseller panels", title: "Reseller panels", meItem: "Reseller credit", meTitle: "Reseller credit",
          add: "New reseller panel", refresh: "Refresh", empty: "No reseller panels yet. Create the first one with “New reseller panel”.",
          intro: "Each reseller logs in to this same panel with its own username and password and only sees its own users.",
          name: "Username", pass: "Password", gen: "Generate", users: "Users", volume: "Data", expire: "Expires", status: "Status", note: "Note (optional)",
          maxUsers: "Max users", quota: "Total data to sell (GB)", days: "Valid for (days)", zero: "0 = unlimited",
          passEdit: "New password (empty = unchanged)", enabled: "Panel is enabled", unlimited: "Unlimited", never: "Never",
          st: { active: "Active", disabled: "Disabled", expired: "Expired" }, left: "days left", ended: "Ended",
          save: "Save", create: "Create panel", cancel: "Cancel", back: "Back", edit: "Edit", del: "Delete", copy: "Copy login info",
          on: "Enable", off: "Disable", close: "Close",
          created: "Reseller panel created. Send this to the reseller:", panelUrl: "Panel URL", copied: "Copied",
          delQ: "Delete reseller panel “{n}”?", delD: "Its users ({u}) are not deleted, they are moved to your account.",
          saved: "Saved", deleted: "Deleted", loading: "Loading…",
          meD: "Limits of your panel, set by the administrator.", meUsers: "Users created", meVol: "Data used from credit", meExp: "Panel valid until",
          titleL: "Display name (optional)", search: "Search name, display name or note", fAll: "All", noMatch: "Nothing matches this search.",
          charge: "Charge & renew", chargeD: "Add amounts; a negative number subtracts. An expired panel is renewed from today.", addGb: "Add data (GB)", addDays: "Add days", addUsers: "Add user capacity", doCharge: "Apply charge", charged: "Charge applied",
          now: "now", hist: "History", histEmpty: "No activity yet.", renameH: "Edit the username to rename (the reseller must log in again)",
          newCred: "Saved. Send the new login info to the reseller:", minUsers: "At least 10 users · 0 = unlimited",
          hx: { create: "Panel created", update: "Edited", charge: "Charged", password: "Password changed", rename: "Renamed", max_users: "user capacity", quota: "data", expire: "expiry", enabled: "status", title: "display name", note: "note",
                "user+": "User created", "user-": "User deleted", "user~": "User edited", "user:reset": "User usage reset", "user:revoke_sub": "User sub revoked" },
          e: { min_capacity: "User capacity must be at least 10 (or 0 for unlimited)", min_quota: "Data must be at least 0.1 GB (or 0 for unlimited)",
               unlimited_quota: "This panel has unlimited data; set a data limit in Edit first", unlimited_time: "This panel never expires; set a duration in Edit first",
               unlimited_users: "This panel has unlimited users; set a limit in Edit first", nothing: "Enter at least one amount to charge", busy: "Reseller data is temporarily unavailable; try again in a moment",
               bad_username: "Username must be 3-32 characters: letters, digits or _ . - @", password_required: "Enter a password",
               password_too_long: "Password is too long", username_taken: "This username is already taken", reserved: "This username is reserved",
               bad_number: "Check the numbers", not_found: "Reseller not found", sudo_only: "Only the main administrator can open this",
               login_required: "Please log in again", network: "Could not reach the server", other: "Unexpected error, please try again" } }
  };
  function rt(k) { return (RT[lang()] || RT.en)[k]; }
  var GROUP_PATH = "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z";
  var PIE_PATH = "M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z";
  var PEN_PATH = "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125";
  var TRASH_PATH = "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0";
  var COPY_PATH = "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.07-7.5-8.069a8.913 8.913 0 0 0-1.5.124m7.5 10.376V9.375";
  var POWER_PATH = "M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9";
  var SYNC_PATH = "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99";
  var PLUS_PATH = "M12 4.5v15m7.5-7.5h-15";
  var CLOCK_PATH = "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z";
  var BOLT_PATH = "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z";
  var GBY = 1073741824;
  function H(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function gbTxt(b) { var v = (Number(b) || 0) / GBY; return (v >= 100 ? Math.round(v) : Math.round(v * 100) / 100) + " GB"; }
  function dTxt(ts) {
    if (!ts) return rt("never");
    try { return new Date(ts * 1000).toLocaleDateString(lang() === "fa" ? "fa-IR-u-nu-latn" : "en-GB", { year: "numeric", month: "short", day: "numeric" }); }
    catch (e) { return new Date(ts * 1000).toISOString().slice(0, 10); }
  }
  function dtTxt(ts) { try { return new Date(ts * 1000).toLocaleString(lang() === "fa" ? "fa-IR-u-nu-latn" : "en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " "); } }
  function daysLeft(ts) { return ts ? Math.ceil((ts * 1000 - Date.now()) / 86400000) : 0; }
  function jx(method, path, body) {
    var h = { "Authorization": "Bearer " + token() }; if (body) h["Content-Type"] = "application/json";
    return fetch(path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "other" }; }).then(function (j) { if (!r.ok || !j || j.ok === false) throw { code: (j && j.error) || (r.status === 401 ? "login_required" : r.status === 503 ? "busy" : "other") }; return j; }); },
            function () { throw { code: "network" }; });
  }
  function rerr(e) { var E = rt("e"); return E[e && e.code] || E.other; }
  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function (ok, no) {
      var ta = document.createElement("textarea"); ta.value = txt; ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.select(); var r = false; try { r = document.execCommand("copy"); } catch (x) {} ta.remove(); r ? ok() : no();
    });
  }
  function rsCss() {
    if (document.getElementById("jinx-rs-css")) return;
    var s = document.createElement("style"); s.id = "jinx-rs-css";
    var B = "var(--chakra-colors-chakra-border-color,#e2e8f0)", P = "var(--chakra-colors-primary-500,var(--chakra-colors-blue-500,#3182ce))";
    var SUB = "var(--chakra-colors-chakra-subtle-bg,var(--chakra-colors-gray-50,#f7fafc))";
    s.textContent =
      ".jinx-rs .chakra-modal__content{max-width:min(46rem,calc(100vw - 2rem))!important}" +
      ".jinx-rs.jinx-sm .chakra-modal__content{max-width:min(28rem,calc(100vw - 2rem))!important}" +
      ".jinx-rs .jr-bar{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem}" +
      ".jinx-rs .jr-intro{font-size:var(--chakra-fontSizes-sm,.875rem);opacity:.7;line-height:1.7;flex:1;min-width:12rem}" +
      ".jinx-rs .jr-acts{display:flex;gap:.5rem;flex-shrink:0}" +
      ".jinx-rs .jr-tbl{width:100%;border-collapse:collapse;font-size:var(--chakra-fontSizes-sm,.875rem)}" +
      ".jinx-rs .jr-tbl th{font-size:var(--chakra-fontSizes-xs,.75rem);font-weight:var(--chakra-fontWeights-bold,700);text-transform:uppercase;letter-spacing:.05em;opacity:.65;text-align:start;padding:.6rem .75rem;border-bottom:1px solid " + B + ";white-space:nowrap}" +
      ".jinx-rs .jr-tbl td{padding:.75rem;border-bottom:1px solid " + B + ";vertical-align:middle}" +
      ".jinx-rs .jr-tbl tr:last-child td{border-bottom:0}" +
      ".jinx-rs .jr-tbl tbody tr{transition:background .15s}.jinx-rs .jr-tbl tbody tr:hover{background:" + SUB + "}" +
      ".chakra-ui-dark .jinx-rs .jr-tbl tbody tr:hover{background:var(--chakra-colors-whiteAlpha-50,rgba(255,255,255,.04))}" +
      ".jinx-rs .jr-wrap{border:1px solid " + B + ";border-radius:var(--chakra-radii-md,.375rem);overflow:hidden}" +
      ".jinx-rs .jr-n{font-weight:600;direction:ltr;unicode-bidi:isolate}.jinx-rs .jr-note{display:block;font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6;max-width:12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".jinx-rs .jr-ltr{direction:ltr;unicode-bidi:isolate;white-space:nowrap}" +
      ".jinx-rs .jr-badge{display:inline-block;padding:0 .4rem;border-radius:var(--chakra-radii-sm,.125rem);font-size:var(--chakra-fontSizes-xs,.75rem);font-weight:700;text-transform:uppercase;line-height:1.5;white-space:nowrap}" +
      ".jinx-rs .jr-b-active{background:var(--chakra-colors-green-100,#c6f6d5);color:var(--chakra-colors-green-800,#22543d)}" +
      ".jinx-rs .jr-b-disabled{background:var(--chakra-colors-gray-100,#edf2f7);color:var(--chakra-colors-gray-800,#1a202c)}" +
      ".jinx-rs .jr-b-expired{background:var(--chakra-colors-red-100,#fed7d7);color:var(--chakra-colors-red-800,#822727)}" +
      ".chakra-ui-dark .jinx-rs .jr-b-active{background:rgba(154,230,180,.16);color:var(--chakra-colors-green-200,#9ae6b4)}" +
      ".chakra-ui-dark .jinx-rs .jr-b-disabled{background:rgba(226,232,240,.16);color:var(--chakra-colors-gray-200,#e2e8f0)}" +
      ".chakra-ui-dark .jinx-rs .jr-b-expired{background:rgba(254,178,178,.16);color:var(--chakra-colors-red-200,#feb2b2)}" +
      ".jinx-rs .jr-prog{height:.375rem;border-radius:9999px;background:var(--chakra-colors-gray-100,#edf2f7);overflow:hidden;margin-top:.35rem;min-width:5rem}" +
      ".chakra-ui-dark .jinx-rs .jr-prog{background:var(--chakra-colors-whiteAlpha-300,rgba(255,255,255,.16))}" +
      ".jinx-rs .jr-prog i{display:block;height:100%;border-radius:inherit;background:" + P + ";transition:width .4s}" +
      ".jinx-rs .jr-prog.w i{background:var(--chakra-colors-orange-400,#ed8936)}.jinx-rs .jr-prog.f i{background:var(--chakra-colors-red-400,#f56565)}" +
      ".jinx-rs .jr-sm{font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.65}" +
      ".jinx-rs .jr-ib{display:inline-flex;gap:.25rem;justify-content:flex-end}" +
      ".jinx-rs button.jr-icon{width:2rem;height:2rem;min-width:2rem;padding:0!important}" +
      ".jinx-rs button.jr-icon.jr-danger:hover{color:var(--chakra-colors-red-400,#f56565)}" +
      ".jinx-rs button.chakra-button.jp-own.jp-danger{background:var(--chakra-colors-red-500,#e53e3e);color:#fff}.jinx-rs button.chakra-button.jp-own.jp-danger:hover{background:var(--chakra-colors-red-600,#c53030)}" +
      ".jinx-rs .jr-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.jinx-rs .jr-full{grid-column:1/-1}" +
      ".jinx-rs .jr-help{font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6;margin-top:.35rem}" +
      ".jinx-rs .jr-row{display:flex;gap:.5rem}.jinx-rs .jr-row input{flex:1}" +
      ".jinx-rs .jr-chips{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem}" +
      ".jinx-rs .jr-chip{height:1.6rem!important;font-size:var(--chakra-fontSizes-xs,.75rem)!important;padding-inline:.6rem!important}" +
      ".jinx-rs .jr-cred{border:1px dashed " + B + ";border-radius:var(--chakra-radii-md,.375rem);padding:.75rem 1rem;display:flex;flex-direction:column;gap:.5rem;font-size:var(--chakra-fontSizes-sm,.875rem)}" +
      ".jinx-rs .jr-cred div{display:flex;justify-content:space-between;gap:1rem}.jinx-rs .jr-cred b{direction:ltr;unicode-bidi:isolate;word-break:break-all;text-align:end}" +
      ".jinx-rs .jr-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem}" +
      ".jinx-rs .jr-card{border:1px solid " + B + ";border-radius:var(--chakra-radii-md,.375rem);padding:.75rem 1rem}" +
      ".jinx-rs .jr-card>span{display:block;font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.65}.jinx-rs .jr-card b{display:block;font-size:var(--chakra-fontSizes-lg,1.125rem);margin-top:.15rem}" +
      ".jinx-rs .jr-empty{text-align:center;padding:2rem 1rem;opacity:.7;font-size:var(--chakra-fontSizes-sm,.875rem);line-height:1.8}" +
      ".jinx-rs .jr-sp{display:inline-block;width:1rem;height:1rem;border:2px solid currentColor;border-bottom-color:transparent;border-radius:50%;animation:jrs .6s linear infinite;vertical-align:-3px}@keyframes jrs{to{transform:rotate(360deg)}}" +
      ".jinx-rs .jr-spin svg{animation:jrs .7s linear infinite}" +
      ".jinx-rs input.chakra-input{direction:ltr;text-align:start}" +
      ".jinx-rs .jr-find{display:flex;gap:.5rem;margin-bottom:.75rem;flex-wrap:wrap}.jinx-rs .jr-find input{flex:1 1 14rem;min-width:0;direction:auto!important}.jinx-rs .jr-find select{flex:0 0 auto;width:auto;min-width:8rem;padding-inline:.75rem}" +
      ".jinx-rs .jr-find select{background-color:transparent;color:inherit;height:var(--chakra-sizes-10,2.5rem);border-radius:var(--chakra-radii-md,.375rem);cursor:pointer}.chakra-ui-dark .jinx-rs .jr-find select option{background:var(--chakra-colors-gray-700,#2d3748);color:#fff}" +
      ".jinx-rs .jr-cellv>span:first-child{white-space:nowrap}" +
      ".jinx-rs .jr-ttl{display:block;font-size:var(--chakra-fontSizes-xs,.75rem);font-weight:600;opacity:.85}" +
      ".jinx-rs .jr-hist{display:flex;flex-direction:column;border:1px solid " + B + ";border-radius:var(--chakra-radii-md,.375rem);max-height:22rem;overflow:auto}" +
      ".jinx-rs .jr-hist div{display:flex;justify-content:space-between;gap:1rem;padding:.55rem .85rem;border-bottom:1px solid " + B + ";font-size:var(--chakra-fontSizes-sm,.875rem)}.jinx-rs .jr-hist div:last-child{border-bottom:0}" +
      ".jinx-rs .jr-hist b{font-weight:600}.jinx-rs .jr-hist i{font-style:normal;opacity:.6;font-size:var(--chakra-fontSizes-xs,.75rem);white-space:nowrap;direction:ltr;unicode-bidi:isolate}" +
      ".jinx-rs .jr-hist span.jr-ltr{white-space:normal;word-break:break-all}" +
      "@media (max-width:640px){.jinx-rs .jr-tbl *{box-sizing:border-box}.jinx-rs .jr-wrap{overflow:visible}.jinx-rs .jr-tbl thead{display:none}.jinx-rs .jr-tbl,.jinx-rs .jr-tbl tbody,.jinx-rs .jr-tbl tr,.jinx-rs .jr-tbl td{display:block;width:100%}" +
        ".jinx-rs .jr-tbl tr{padding:.75rem;border-bottom:1px solid " + B + "}.jinx-rs .jr-tbl tr:last-child{border-bottom:0}" +
        ".jinx-rs .jr-tbl td{border:0;padding:.2rem 0;display:flex;min-width:0;justify-content:space-between;align-items:center;gap:1rem}" +
        ".jinx-rs .jr-tbl td[data-l]::before{content:attr(data-l);font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6;flex-shrink:0}" +
        ".jinx-rs .jr-tbl td.jr-first{padding-bottom:.4rem}.jinx-rs .jr-tbl td .jr-ib{width:100%;justify-content:flex-end;padding-top:.4rem}"+".jinx-rs .jr-tbl td .jr-cellv{text-align:end;min-width:0}.jinx-rs .jr-prog{min-width:6rem}" +
        ".jinx-rs .jr-grid{grid-template-columns:1fr}.jinx-rs .jr-stat{grid-template-columns:1fr}.jinx-rs .jr-acts{width:100%}.jinx-rs .jr-acts button{flex:1}}";
    document.head.appendChild(s);
  }

  // one dialog frame, identical to the panel's own dialogs
  function frame(id, icon, title, small) {
    capture(); css(); rsCss();
    var old = document.getElementById(id); if (old) old.remove();
    var w = document.createElement("div"); w.id = id; w.className = "chakra-portal jinx-rs" + (small ? " jinx-sm" : "");
    w.setAttribute("dir", document.documentElement.getAttribute("dir") || (lang() === "fa" ? "rtl" : "ltr"));
    w.innerHTML =
      '<div class="chakra-modal__overlay ' + K("overlay") + '"></div>' +
      '<div class="chakra-modal__content-container ' + K("container") + '">' +
        '<section class="chakra-modal__content ' + K("content") + '" role="dialog" aria-modal="true" tabindex="-1">' +
          '<header class="chakra-modal__header ' + K("header") + '"><div class="jp-head"><div class="jp-icon ' + K("icon") + '">' + svg(icon, 20) + '</div>' +
            '<p class="jp-title ' + K("title") + '"></p></div></header>' +
          '<button type="button" aria-label="Close" class="chakra-modal__close-btn ' + K("close") + '"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" width="12" height="12"><path fill="currentColor" d="M.439,21.44a1.5,1.5,0,0,0,2.122,2.121L11.823,14.3a.25.25,0,0,1,.354,0l9.262,9.263a1.5,1.5,0,1,0,2.122-2.121L14.3,12.177a.25.25,0,0,1,0-.354l9.263-9.262A1.5,1.5,0,0,0,21.439.44L12.177,9.7a.25.25,0,0,1-.354,0L2.561.44A1.5,1.5,0,0,0,.439,2.561L9.7,11.823a.25.25,0,0,1,0,.354Z"></path></svg></button>' +
          '<div class="chakra-modal__body ' + K("body") + '"></div>' +
          '<footer class="chakra-modal__footer ' + K("footer") + '"></footer>' +
        '</section></div>';
    document.body.appendChild(w);
    var q = function (s) { return w.querySelector(s); };
    q(".jp-title").textContent = title;
    var bo = document.body.style.overflow; document.body.style.overflow = "hidden";
    var f = { w: w, q: q, body: q(".chakra-modal__body"), foot: q(".chakra-modal__footer"), busy: false };
    var onKey = function (e) { if (e.key === "Escape") f.close(); };
    f.close = function () { if (f.busy) return; w.remove(); document.removeEventListener("keydown", onKey); document.body.style.overflow = bo; };
    document.addEventListener("keydown", onKey);
    q(".chakra-modal__content-container").addEventListener("mousedown", function (e) { if (e.target === e.currentTarget) f.close(); });
    q(".chakra-modal__close-btn").onclick = function () { f.close(); };
    f.btn = function (label, kind, icon) {   // kind: primary | secondary | danger
      var cls = kind === "primary" ? K("btnPrimary", "btnPage") : kind === "danger" ? "jp-own" : K("btnSecondary");
      var b = document.createElement("button"); b.type = "button";
      b.className = "chakra-button jp-" + kind + " " + cls;
      if (kind === "danger" && cls === "jp-own") b.className += " jp-danger";
      b.innerHTML = (icon ? svg(icon, 16) + '<span style="margin-inline-start:.4rem"></span>' : "<span></span>");
      b.lastChild.textContent = label;
      if (kind === "danger" && cls !== "jp-own") b.style.cssText = "background:var(--chakra-colors-red-500,#e53e3e);color:#fff";
      return b;
    };
    f.iconBtn = function (icon, label, danger) {
      var b = document.createElement("button"); b.type = "button"; b.title = label; b.setAttribute("aria-label", label);
      b.className = "chakra-button jp-secondary jr-icon " + K("btnSecondary") + (danger ? " jr-danger" : ""); b.innerHTML = svg(icon, 16); return b;
    };
    f.msg = function (txt, ok) {
      var m = q(".jp-m"); if (!m) { m = document.createElement("div"); m.className = "jp-m"; m.setAttribute("role", "status"); m.style.marginTop = ".75rem"; f.body.appendChild(m); }
      m.className = "jp-m " + (ok ? "s" : "e"); m.textContent = txt || "";
    };
    f.load = function (b, on) { b.disabled = !!on; if (on) { b._h = b.innerHTML; b.innerHTML = '<span class="jr-sp"></span>'; } else if (b._h) b.innerHTML = b._h; };
    return f;
  }
  function fieldEl(id, label, value, type, help, extra) {
    var d = document.createElement("div"); d.className = "chakra-form-control " + K("fc") + (extra || "");
    d.innerHTML = '<label for="' + id + '" class="chakra-form__label ' + K("label") + '"></label><div class="jr-row"><input id="' + id + '" class="chakra-input ' + K("input", "inputPage") + '" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' + (help != null ? '<div class="jr-help"></div>' : "");
    d.querySelector("label").textContent = label; var i = d.querySelector("input"); i.type = type || "text"; i.value = value == null ? "" : value;
    if (help != null) d.querySelector(".jr-help").textContent = help;
    return d;
  }
  function genPass() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", out = "", r = new Uint32Array(12);
    (window.crypto || window.msCrypto).getRandomValues(r); for (var i = 0; i < 12; i++) out += a[r[i] % a.length]; return out;
  }

  function openResellers() {
    var f = frame("jinx-rs", GROUP_PATH, rt("title"));
    var list = [], qText = "", qState = "";
    function toolbar() {
      var bar = document.createElement("div"); bar.className = "jr-bar";
      bar.innerHTML = '<div class="jr-intro"></div><div class="jr-acts"></div>'; bar.firstChild.textContent = rt("intro");
      var rf = f.btn(rt("refresh"), "secondary", SYNC_PATH), add = f.btn(rt("add"), "primary", PLUS_PATH);
      rf.onclick = function () { rf.classList.add("jr-spin"); load(function () { rf.classList.remove("jr-spin"); }); };
      add.onclick = function () { form(null); };
      bar.lastChild.appendChild(rf); bar.lastChild.appendChild(add);
      return bar;
    }
    function table() {
      f.body.innerHTML = ""; f.foot.innerHTML = ""; f.body.appendChild(toolbar());
      var close = f.btn(rt("close"), "secondary"); close.onclick = f.close; f.foot.appendChild(close);
      if (!list.length) { var e = document.createElement("div"); e.className = "jr-empty"; e.textContent = rt("empty"); f.body.appendChild(e); return; }
      if (list.length > 3 || qText || qState) {              // search + status filter
        var fd = document.createElement("div"); fd.className = "jr-find";
        fd.innerHTML = '<input type="search" class="chakra-input ' + K("input", "inputPage") + '" autocomplete="off" spellcheck="false"><select class="chakra-select ' + K("input", "inputPage") + '"></select>';
        var si = fd.firstChild, ss = fd.lastChild; si.placeholder = rt("search"); si.value = qText;
        [["", rt("fAll")], ["active", rt("st").active], ["disabled", rt("st").disabled], ["expired", rt("st").expired]].forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; ss.appendChild(op); });
        ss.value = qState;
        var refilter = function () { qText = si.value; qState = ss.value; var pos = si.selectionStart; table(); var ni = f.q(".jr-find input"); if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (x) {} } };
        var tmr = 0; si.oninput = function () { clearTimeout(tmr); tmr = setTimeout(refilter, 180); }; ss.onchange = refilter;
        f.body.appendChild(fd);
      }
      var qq = qText.trim().toLowerCase();
      var rows = list.filter(function (r) { return (!qState || r.state === qState) && (!qq || (r.username + " " + (r.title || "") + " " + (r.note || "")).toLowerCase().indexOf(qq) >= 0); });
      if (!rows.length) { var e2 = document.createElement("div"); e2.className = "jr-empty"; e2.textContent = rt("noMatch"); f.body.appendChild(e2); return; }
      var wrap = document.createElement("div"); wrap.className = "jr-wrap";
      var h = '<table class="jr-tbl"><thead><tr><th>' + H(rt("name")) + '</th><th>' + H(rt("status")) + '</th><th>' + H(rt("users")) + '</th><th>' + H(rt("volume")) + '</th><th>' + H(rt("expire")) + '</th><th></th></tr></thead><tbody>';
      rows.forEach(function (r, i) {
        var pct = r.quota ? Math.min(100, r.charge / r.quota * 100) : 0, dl = daysLeft(r.expire);
        h += '<tr data-i="' + i + '"><td class="jr-first"><span>' + (r.title ? '<span class="jr-ttl">' + H(r.title) + '</span>' : "") + '<span class="jr-n">' + H(r.username) + '</span>' + (r.note ? '<span class="jr-note">' + H(r.note) + '</span>' : "") + '</span>' + '</td>' +
             '<td data-l="' + H(rt("status")) + '"><span class="jr-badge jr-b-' + H(r.state) + '">' + H(rt("st")[r.state] || r.state) + '</span></td>' +
             '<td data-l="' + H(rt("users")) + '"><span class="jr-ltr">' + r.users + ' / ' + (r.max_users || "∞") + '</span></td>' +
             '<td data-l="' + H(rt("volume")) + '"><div class="jr-cellv"><span class="jr-ltr">' + H(gbTxt(r.charge)) + ' / ' + (r.quota ? H(gbTxt(r.quota)) : "∞") + '</span>' +
               (r.quota ? '<div class="jr-prog' + (pct >= 100 ? " f" : pct >= 80 ? " w" : "") + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' : "") + '</div></td>' +
             '<td data-l="' + H(rt("expire")) + '"><div class="jr-cellv"><span>' + H(dTxt(r.expire)) + '</span>' + (r.expire ? '<span class="jr-sm" style="display:block">' + (dl > 0 ? dl + " " + H(rt("left")) : H(rt("ended"))) + '</span>' : "") + '</div></td>' +
             '<td><span class="jr-ib"></span></td></tr>';
      });
      wrap.innerHTML = h + '</tbody></table>';
      f.body.appendChild(wrap);
      Array.prototype.forEach.call(wrap.querySelectorAll("tbody tr"), function (tr) {
        var r = rows[+tr.getAttribute("data-i")], box = tr.querySelector(".jr-ib");
        var bG = f.iconBtn(BOLT_PATH, rt("charge")), bH = f.iconBtn(CLOCK_PATH, rt("hist"));
        bG.onclick = function () { charge(r); }; bH.onclick = function () { history(r); };
        var bE = f.iconBtn(PEN_PATH, rt("edit")), bC = f.iconBtn(COPY_PATH, rt("copy")), bP = f.iconBtn(POWER_PATH, r.state === "disabled" ? rt("on") : rt("off")), bD = f.iconBtn(TRASH_PATH, rt("del"), true);
        bE.onclick = function () { form(r); };
        bC.onclick = function () { copyText(credText(r.username, null)).then(function () { f.msg(rt("copied"), true); }, function () {}); };
        bP.onclick = function () {
          f.load(bP, true);
          jx("PUT", "/jinx-api/resellers/" + encodeURIComponent(r.username), { max_users: r.max_users, quota_gb: r.quota / GBY, expire: r.expire, note: r.note, title: r.title || "", enabled: r.state === "disabled" })
            .then(function () { load(function () { f.msg(rt("saved"), true); }); }, function (e) { f.load(bP, false); f.msg(rerr(e)); });
        };
        bD.onclick = function () { confirmDel(r); };
        [bG, bE, bH, bC, bP, bD].forEach(function (b) { box.appendChild(b); });
      });
    }
    function credText(u, p) {
      var url = location.origin + "/dashboard/";
      return (lang() === "fa" ? "پنل نمایندگی Super JinX\n" : "Super JinX reseller panel\n") + rt("panelUrl") + ": " + url + "\n" + rt("name") + ": " + u + (p ? "\n" + rt("pass") + ": " + p : "");
    }
    function load(done) {
      if (!list.length) { f.body.innerHTML = '<div class="jr-empty"><span class="jr-sp"></span> ' + H(rt("loading")) + '</div>'; }
      jx("GET", "/jinx-api/resellers").then(function (r) { list = r.resellers || []; table(); if (done) done(); },
        function (e) { table(); f.msg(rerr(e)); if (done) done(); });
    }
    function form(r) {
      var edit = !!r; f.body.innerHTML = ""; f.foot.innerHTML = "";
      f.q(".jp-title").textContent = edit ? rt("edit") + " · " + r.username : rt("add");
      var g = document.createElement("div"); g.className = "jr-grid";
      var fu = fieldEl("jr-u", rt("name"), edit ? r.username : "", "text", null, " jr-full");
      var fp = fieldEl("jr-p", edit ? rt("passEdit") : rt("pass"), "", "text", null, " jr-full");
      var gen = f.btn(rt("gen"), "secondary"); gen.onclick = function () { fp.querySelector("input").value = genPass(); }; fp.querySelector(".jr-row").appendChild(gen);
      var ft = fieldEl("jr-t", rt("titleL"), edit ? (r.title || "") : "", "text", null, " jr-full"); ft.querySelector("input").style.direction = "auto"; ft.querySelector("input").maxLength = 40;
      if (edit) { var rh = document.createElement("div"); rh.className = "jr-help"; rh.textContent = rt("renameH"); fu.appendChild(rh); }
      var fm = fieldEl("jr-m", rt("maxUsers"), edit ? r.max_users : 10, "number", rt("minUsers"));
      var fq = fieldEl("jr-q", rt("quota"), edit ? Math.round(r.quota / GBY * 100) / 100 : 100, "number", rt("zero"));
      var chipRow = function (fld, vals) { var c = document.createElement("div"); c.className = "jr-chips"; var inp = fld.querySelector("input");
        vals.forEach(function (v) { var b = f.btn(v[1], "secondary"); b.classList.add("jr-chip"); b.onclick = function () { inp.value = v[0]; inp.dispatchEvent(new Event("input")); }; c.appendChild(b); }); fld.appendChild(c); };
      chipRow(fm, [[10, "10"], [50, "50"], [100, "100"], [500, "500"], [1000, "1000"], [0, "∞"]]);
      chipRow(fq, [[50, "50GB"], [100, "100GB"], [500, "500GB"], [1024, "1TB"], [0, "∞"]]);
      var dleft = edit ? (r.expire ? Math.max(0, daysLeft(r.expire)) : 0) : 30;
      var fd = fieldEl("jr-d", rt("days"), dleft, "number", "", " jr-full");
      var help = fd.querySelector(".jr-help"), din = fd.querySelector("input");
      var showDate = function () { var n = parseInt(din.value, 10) || 0; help.textContent = rt("zero") + " · " + (n > 0 ? rt("expire") + ": " + dTxt(Math.floor(Date.now() / 1000) + n * 86400) : rt("never")); };
      din.oninput = showDate; showDate();
      var chips = document.createElement("div"); chips.className = "jr-chips";
      [30, 60, 90, 180, 365, 0].forEach(function (n) { var c = f.btn(n ? String(n) : "∞", "secondary"); c.classList.add("jr-chip"); c.onclick = function () { din.value = n; showDate(); }; chips.appendChild(c); });
      fd.appendChild(chips);
      var fn = fieldEl("jr-n", rt("note"), edit ? r.note : "", "text", null, " jr-full"); fn.querySelector("input").style.direction = "auto";
      [fu, fp, ft, fm, fq, fd, fn].forEach(function (x) { g.appendChild(x); });
      [fm, fq, fd].forEach(function (x) { var i = x.querySelector("input"); i.min = "0"; i.inputMode = "numeric"; });
      var en = null;
      if (edit) {
        en = document.createElement("label"); en.className = "chakra-checkbox jr-full " + K("cb");
        en.innerHTML = '<input type="checkbox" class="jp-cbh"><span class="chakra-checkbox__control ' + K("cbControl") + '" aria-hidden="true">' + CHECK + '</span><span class="chakra-checkbox__label ' + K("cbLabel") + '"></span>';
        en.lastChild.textContent = rt("enabled"); var cb = en.querySelector("input"), ctl = en.querySelector(".chakra-checkbox__control");
        var paint = function () { if (cb.checked) { ctl.setAttribute("data-checked", ""); en.setAttribute("data-checked", ""); } else { ctl.removeAttribute("data-checked"); en.removeAttribute("data-checked"); } };
        cb.checked = r.state !== "disabled"; paint(); cb.onchange = paint; g.appendChild(en);
      }
      f.body.appendChild(g);
      var u = fu.querySelector("input");
      var cancel = f.btn(edit ? rt("back") : rt("cancel"), "secondary"), save = f.btn(edit ? rt("save") : rt("create"), "primary");
      cancel.onclick = function () { f.q(".jp-title").textContent = rt("title"); table(); };
      save.onclick = function () {
        var U = u.value.trim(), PW = fp.querySelector("input").value, n = function (x) { return Number(x.querySelector("input").value || 0); };
        var mu = n(fm), qg = n(fq), dd = n(fd);
        if ((!edit || U !== r.username) && !/^[A-Za-z0-9_.@-]{3,32}$/.test(U)) { f.msg(rerr({ code: "bad_username" })); u.focus(); return; }
        if (!edit && !PW) { f.msg(rerr({ code: "password_required" })); fp.querySelector("input").focus(); return; }
        if ([mu, qg, dd].some(function (v) { return !isFinite(v) || v < 0; }) || mu % 1 || dd % 1) { f.msg(rerr({ code: "bad_number" })); return; }
        if (mu > 0 && mu < 10) { f.msg(rerr({ code: "min_capacity" })); fm.querySelector("input").focus(); return; }
        if (qg > 0 && qg < 0.1) { f.msg(rerr({ code: "min_quota" })); fq.querySelector("input").focus(); return; }
        var exp = dd > 0 ? Math.floor(Date.now() / 1000) + dd * 86400 : 0;
        if (edit && r.expire && dd === Math.max(0, daysLeft(r.expire))) exp = r.expire;        // unchanged -> keep exact time
        var body = { max_users: mu, quota_gb: qg, expire: exp, note: fn.querySelector("input").value.trim(), title: ft.querySelector("input").value.trim() };
        if (edit) { body.enabled = en.querySelector("input").checked; if (PW) body.password = PW; if (U !== r.username) body.new_username = U; } else { body.username = U; body.password = PW; }
        f.busy = true; f.load(save, true); cancel.disabled = true; f.msg("");
        jx(edit ? "PUT" : "POST", "/jinx-api/resellers" + (edit ? "/" + encodeURIComponent(r.username) : ""), body).then(function () {
          f.busy = false;
          if (edit && (PW || U !== r.username)) done(U, PW || null, true);       // new login info -> show it to copy
          else if (edit) { f.q(".jp-title").textContent = rt("title"); load(function () { f.msg(rt("saved"), true); }); }
          else done(U, PW);
        }, function (e) { f.busy = false; f.load(save, false); cancel.disabled = false; f.msg(rerr(e)); });
      };
      f.foot.appendChild(cancel); f.foot.appendChild(save);
      setTimeout(function () { (edit ? ft.querySelector("input") : u).focus(); }, 60);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT") save.click(); });
    }
    function done(U, PW, upd) {
      f.body.innerHTML = ""; f.foot.innerHTML = ""; f.q(".jp-title").textContent = rt("title");
      var p = document.createElement("div"); p.className = "jp-m s"; p.textContent = upd ? rt("newCred") : rt("created"); p.style.marginBottom = ".75rem"; f.body.appendChild(p);
      var c = document.createElement("div"); c.className = "jr-cred";
      [[rt("panelUrl"), location.origin + "/dashboard/"], [rt("name"), U]].concat(PW ? [[rt("pass"), PW]] : []).forEach(function (x) {
        var d = document.createElement("div"); d.innerHTML = "<span></span><b></b>"; d.firstChild.textContent = x[0]; d.lastChild.textContent = x[1]; c.appendChild(d);
      });
      f.body.appendChild(c);
      var cp = f.btn(rt("copy"), "secondary", COPY_PATH), back = f.btn(rt("back"), "primary");
      cp.onclick = function () { copyText(credText(U, PW)).then(function () { f.msg(rt("copied"), true); }, function () {}); };
      back.onclick = function () { f.q(".jp-title").textContent = rt("title"); load(); };
      f.foot.appendChild(cp); f.foot.appendChild(back);
    }
    function charge(r) {
      f.body.innerHTML = ""; f.foot.innerHTML = ""; f.q(".jp-title").textContent = rt("charge") + " · " + (r.title || r.username);
      var d = document.createElement("p"); d.className = "jr-intro"; d.style.marginBottom = "1rem"; d.textContent = rt("chargeD"); f.body.appendChild(d);
      var st = document.createElement("div"); st.className = "jr-stat";
      st.innerHTML = '<div class="jr-card"><span>' + H(rt("volume")) + '</span><b class="jr-ltr">' + H(gbTxt(r.charge)) + " / " + (r.quota ? H(gbTxt(r.quota)) : "∞") + '</b></div>' +
        '<div class="jr-card"><span>' + H(rt("users")) + '</span><b class="jr-ltr">' + r.users + " / " + (r.max_users || "∞") + '</b></div>' +
        '<div class="jr-card"><span>' + H(rt("expire")) + '</span><b style="font-size:.95rem">' + H(dTxt(r.expire)) + '</b></div>';
      f.body.appendChild(st);
      var g = document.createElement("div"); g.className = "jr-grid";
      var fg = fieldEl("jr-cg", rt("addGb"), "", "number", r.quota ? "" : rt("e").unlimited_quota), fdd = fieldEl("jr-cd", rt("addDays"), "", "number", r.expire ? "" : rt("e").unlimited_time),
          fu = fieldEl("jr-cu", rt("addUsers"), "", "number", r.max_users ? "" : rt("e").unlimited_users, " jr-full");
      var chips = function (fld, vals) { var c = document.createElement("div"); c.className = "jr-chips"; var inp = fld.querySelector("input");
        vals.forEach(function (v) { var b = f.btn((v > 0 ? "+" : "") + v, "secondary"); b.classList.add("jr-chip"); b.onclick = function () { inp.value = String((Number(inp.value) || 0) + v); }; c.appendChild(b); }); fld.appendChild(c); };
      chips(fg, [50, 100, 500, 1024]); chips(fdd, [30, 60, 90, 365]); chips(fu, [10, 50, 100]);
      [[fg, r.quota], [fdd, r.expire], [fu, r.max_users]].forEach(function (x) { var i = x[0].querySelector("input"); i.placeholder = "0"; i.inputMode = "decimal"; if (!x[1]) { i.disabled = true; x[0].querySelectorAll(".jr-chip").forEach(function (b) { b.disabled = true; }); } g.appendChild(x[0]); });
      f.body.appendChild(g);
      var back = f.btn(rt("back"), "secondary"), go = f.btn(rt("doCharge"), "primary", BOLT_PATH);
      back.onclick = function () { f.q(".jp-title").textContent = rt("title"); table(); };
      go.onclick = function () {
        var v = function (x) { var t = x.querySelector("input"); return t.disabled ? 0 : Number(t.value || 0); }, ag = v(fg), ad = v(fdd), au = v(fu);
        if (![ag, ad, au].every(isFinite) || ad % 1 || au % 1) { f.msg(rerr({ code: "bad_number" })); return; }
        if (!ag && !ad && !au) { f.msg(rerr({ code: "nothing" })); return; }
        if (au && r.max_users + au < 10) { f.msg(rerr({ code: "min_capacity" })); return; }
        f.busy = true; f.load(go, true); back.disabled = true; f.msg("");
        jx("POST", "/jinx-api/resellers/" + encodeURIComponent(r.username) + "/charge", { add_gb: ag, add_days: ad, add_users: au }).then(function () {
          f.busy = false; f.q(".jp-title").textContent = rt("title"); load(function () { f.msg(rt("charged"), true); });
        }, function (e) { f.busy = false; f.load(go, false); back.disabled = false; f.msg(rerr(e)); });
      };
      f.foot.appendChild(back); f.foot.appendChild(go);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT") go.click(); });
      setTimeout(function () { var i = g.querySelector("input:not([disabled])"); if (i) i.focus(); }, 60);
    }
    function histText(x) {
      var HX = rt("hx"), t = String(x || ""), m = t.match(/^(user\+|user-|user~|user:reset|user:revoke_sub)(.*)$/);
      if (m) return { a: HX[m[1]] || m[1], d: m[2] };
      var k = t.split(":")[0], rest = t.slice(k.length + 1);
      if (k === "update" && rest) return { a: HX.update, d: rest.split(",").map(function (p) { if (/^rename:/.test(p)) return HX.rename + " " + p.slice(7).replace(">", " → "); return HX[p] || p; }).join("، ") };
      return { a: HX[k] || k, d: rest };
    }
    function history(r) {
      f.body.innerHTML = '<div class="jr-empty"><span class="jr-sp"></span> ' + H(rt("loading")) + '</div>'; f.foot.innerHTML = ""; f.q(".jp-title").textContent = rt("hist") + " · " + (r.title || r.username);
      var back = f.btn(rt("back"), "primary"); back.onclick = function () { f.q(".jp-title").textContent = rt("title"); table(); }; f.foot.appendChild(back);
      jx("GET", "/jinx-api/resellers/" + encodeURIComponent(r.username) + "/history").then(function (j) {
        var lg = (j && j.log) || []; f.body.innerHTML = "";
        if (!lg.length) { var e = document.createElement("div"); e.className = "jr-empty"; e.textContent = rt("histEmpty"); f.body.appendChild(e); return; }
        var box = document.createElement("div"); box.className = "jr-hist";
        lg.forEach(function (x) { var t = histText(x.x), row = document.createElement("div");
          row.innerHTML = "<span><b></b> <span class=\"jr-ltr\"></span></span><i></i>"; row.querySelector("b").textContent = t.a; row.querySelector(".jr-ltr").textContent = t.d || "";
          row.querySelector("i").textContent = dtTxt(x.t) + (x.by && x.by !== r.username ? " · " + x.by : ""); box.appendChild(row); });
        f.body.appendChild(box);
      }, function (e) { f.body.innerHTML = ""; f.msg(rerr(e)); });
    }
    function confirmDel(r) {
      f.body.innerHTML = ""; f.foot.innerHTML = "";
      var a = document.createElement("p"); a.style.cssText = "font-weight:600;margin-bottom:.5rem"; a.textContent = rt("delQ").replace("{n}", r.username);
      var b = document.createElement("p"); b.className = "jr-intro"; b.textContent = rt("delD").replace("{u}", r.users);
      f.body.appendChild(a); f.body.appendChild(b);
      var no = f.btn(rt("cancel"), "secondary"), yes = f.btn(rt("del"), "danger", TRASH_PATH);
      no.onclick = table;
      yes.onclick = function () {
        f.busy = true; f.load(yes, true); no.disabled = true;
        jx("DELETE", "/jinx-api/resellers/" + encodeURIComponent(r.username)).then(function () { f.busy = false; load(function () { f.msg(rt("deleted"), true); }); },
          function (e) { f.busy = false; f.load(yes, false); no.disabled = false; f.msg(rerr(e)); });
      };
      f.foot.appendChild(no); f.foot.appendChild(yes);
    }
    load();
  }

  function openCredit() {
    var f = frame("jinx-rs", PIE_PATH, rt("meTitle"), true);
    f.body.innerHTML = '<div class="jr-empty"><span class="jr-sp"></span></div>';
    var close = f.btn(rt("close"), "primary"); close.onclick = f.close; f.foot.appendChild(close);
    jx("GET", "/jinx-api/me").then(function (m) {
      var pct = m.quota ? Math.min(100, m.charge / m.quota * 100) : 0, dl = daysLeft(m.expire);
      f.body.innerHTML = '<p class="jr-intro" style="margin-bottom:1rem"></p><div class="jr-stat">' +
        '<div class="jr-card"><span>' + H(rt("status")) + '</span><b><span class="jr-badge jr-b-' + H(m.state) + '">' + H(rt("st")[m.state] || m.state) + '</span></b></div>' +
        '<div class="jr-card"><span>' + H(rt("meUsers")) + '</span><b class="jr-ltr">' + m.users + ' / ' + (m.max_users || "∞") + '</b></div>' +
        '<div class="jr-card"><span>' + H(rt("meExp")) + '</span><b style="font-size:.95rem">' + H(dTxt(m.expire)) + '</b>' + (m.expire ? '<span>' + (dl > 0 ? dl + " " + H(rt("left")) : H(rt("ended"))) + '</span>' : "") + '</div></div>' +
        '<div class="jr-card"><span>' + H(rt("meVol")) + '</span><b class="jr-ltr" style="text-align:start">' + H(gbTxt(m.charge)) + ' / ' + (m.quota ? H(gbTxt(m.quota)) : "∞") + '</b>' +
        (m.quota ? '<div class="jr-prog' + (pct >= 100 ? " f" : pct >= 80 ? " w" : "") + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' : "") + '</div>';
      f.body.firstChild.textContent = rt("meD");
    }, function (e) { f.body.innerHTML = ""; f.msg(rerr(e)); });
  }

  // who am I? (decides which menu items exist) - refreshed when the login changes
  var ME = { tok: null, info: null, wait: null };
  function me() {
    var tk = token();
    if (!tk) { ME.tok = null; ME.info = null; return Promise.resolve(null); }
    if (ME.tok === tk && ME.info) return Promise.resolve(ME.info);
    if (ME.tok === tk && ME.wait) return ME.wait;
    ME.tok = tk;
    ME.wait = jx("GET", "/jinx-api/me").then(function (m) { ME.info = m; ME.wait = null; return m; },
      function () { ME.wait = null; ME.info = null; return api("GET", "/api/admin").then(function (a) { ME.info = { sudo: !!(a && a.is_sudo), reseller: false }; return ME.info; }, function () { return null; }); });
    return ME.wait;
  }
  window.jinxResellers = openResellers;
  window.jinxCredit = openCredit;

  // add our items to the main ☰ menu as native-looking entries (same classes + same heroicon style)
  //   everyone      : change username & password
  //   main admin    : reseller panels
  //   reseller      : reseller credit
  var MAIN = /core|host|node|هسته|هاست|نود|ядр|хост|узл|核心|主机|节点/i;
  var OUT = /log ?out|sign ?out|خروج|выход|退出/i;
  function makeItem(list, ref, cls, icon, text, open) {
    var it = ref.cloneNode(true);
    it.classList.add("jinx-item", cls);
    ["id", "data-index", "href", "aria-disabled", "data-active", "data-focus", "data-hover"].forEach(function (a) { it.removeAttribute(a); });
    it.setAttribute("tabindex", "-1"); it.setAttribute("type", "button");
    var s = it.querySelector("svg");
    if (s) {
      var size = s.getAttribute("width") || "", sc = s.getAttribute("class") || "";
      var tmp = document.createElement("span"); tmp.innerHTML = svg(icon, size || 16);
      var ns = tmp.firstChild; if (sc) ns.setAttribute("class", sc);
      if (!size) { ns.removeAttribute("width"); ns.removeAttribute("height"); }
      s.parentNode.replaceChild(ns, s);
    }
    var spans = it.querySelectorAll("span"), textHost = null;
    for (var k = spans.length - 1; k >= 0; k--) { if (!spans[k].querySelector("svg") && !spans[k].classList.contains("chakra-menu__icon-wrapper")) { textHost = spans[k]; break; } }
    if (textHost) textHost.textContent = text;
    else { Array.prototype.slice.call(it.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove(); }); it.appendChild(document.createTextNode(text)); }
    // Chakra highlights menu items through data-focus (not :hover), so mirror that exactly like the native items
    it.addEventListener("mouseenter", function () {
      Array.prototype.forEach.call(list.querySelectorAll("[data-focus]"), function (x) { if (x !== it) x.removeAttribute("data-focus"); });
      it.setAttribute("data-focus", ""); it.setAttribute("data-hover", "");
    });
    it.addEventListener("mouseleave", function () { it.removeAttribute("data-focus"); it.removeAttribute("data-hover"); });
    it.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      try { list.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); } catch (x) {}
      open();
    });
    return it;
  }
  function inject(list) {
    var items = list.querySelectorAll('[role="menuitem"]:not(.jinx-item)');
    var txt = list.textContent || "";
    if (items.length < 2 || !(MAIN.test(txt) || OUT.test(txt))) return;
    var ref = null;
    for (var i = 0; i < items.length; i++) { if (items[i].querySelector("svg")) { ref = items[i]; break; } }
    ref = ref || items[0];
    var place = function (it) {
      // right after the settings items; for resellers (no settings items) just before Logout
      var after = null, logout = null, ours = list.querySelectorAll(".jinx-item");
      for (var m = 0; m < items.length; m++) { if (MAIN.test(items[m].textContent || "")) after = items[m]; if (!logout && OUT.test(items[m].textContent || "")) logout = items[m]; }
      if (ours.length) after = ours[ours.length - 1];
      var host = (after || logout || ref).parentNode;
      if (after) host.insertBefore(it, after.nextSibling);
      else if (logout) host.insertBefore(it, logout);
      else list.appendChild(it);
    };
    var add = function (cls, icon, text, open) { if (!list.querySelector("." + cls)) place(makeItem(list, ref, cls, icon, text, open)); };
    add("jinx-pw-item", KEY_PATH, t("item"), openModal);
    var role = function (info) {
      if (!info || !document.contains(list)) return;
      if (info.sudo) add("jinx-rs-item", GROUP_PATH, rt("item"), openResellers);
      else if (info.reseller) add("jinx-me-item", PIE_PATH, rt("meItem"), openCredit);
    };
    if (ME.info && ME.tok === token()) role(ME.info); else me().then(role);
  }
  new MutationObserver(function () {
    var lists = document.querySelectorAll('[role="menu"]');
    for (var i = 0; i < lists.length; i++) inject(lists[i]);
  }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(me, 1500);   // warm up: menu opens with the right items at once


  // =============================================================================================
  // 🔐 LOGIN LOCK SCREEN - after 10 wrong passwords the server locks login for a while;
  //    this shows it in the panel's own theme with a live countdown (server time is the truth)
  // =============================================================================================
  var LT = {
    fa: { title: "ورود موقتاً قفل شد", desc: "برای حفاظت از پنل، به دلیل {n} بار وارد کردن رمز اشتباه، ورود برای مدتی بسته شده است.",
          until: "تا باز شدن ورود", tries: "تلاش ناموفق", opens: "زمان باز شدن", again: "تلاش دوباره", wait: "لطفاً صبر کنید",
          open: "ورود دوباره باز شد", openD: "حالا می‌توانید با نام کاربری و رمز درست وارد شوید.",
          tip1: "نام کاربری و رمز را با دقت وارد کنید (حروف بزرگ و کوچک فرق دارند).", tip2: "اگر رمز را فراموش کرده‌اید، با مدیر پنل تماس بگیرید. تلاش بیشتر، زمان قفل را تمدید نمی‌کند.",
          left: "رمز عبور اشتباه است. {n} تلاش دیگر تا قفل موقت ورود باقی مانده.", sec: "ثانیه", min: "دقیقه" },
    en: { title: "Login temporarily locked", desc: "To protect the panel, login is closed for a while after {n} wrong passwords.",
          until: "until login opens", tries: "Failed attempts", opens: "Opens at", again: "Try again", wait: "Please wait",
          open: "Login is open again", openD: "You can now sign in with the correct username and password.",
          tip1: "Type the username and password carefully (they are case sensitive).", tip2: "Forgot the password? Contact the panel administrator. Waiting does not extend the lock.",
          left: "Wrong password. {n} attempts left before login is locked for a while.", sec: "sec", min: "min" }
  };
  function lt(k) { return (LT[lang()] || LT.en)[k]; }
  var LOCK_KEY = "jinx-lock-until", LOCK_PATH = "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z";
  var OPEN_PATH = "M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z";
  var Lock = { el: null, timer: null, until: 0, total: 300, max: 10 };
  function lockCss() {
    if (document.getElementById("jinx-lock-css")) return;
    var P = "var(--chakra-colors-primary-500,var(--chakra-colors-blue-500,#3182ce))", B = "var(--chakra-colors-chakra-border-color,#e2e8f0)";
    var s = document.createElement("style"); s.id = "jinx-lock-css";
    s.textContent =
      "#jinx-lock{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:inherit;" +
        "background:var(--chakra-colors-blackAlpha-600,rgba(0,0,0,.48));backdrop-filter:blur(12px) saturate(1.2);-webkit-backdrop-filter:blur(12px) saturate(1.2);animation:jlf .25s ease-out}" +
      "#jinx-lock .jl-card{position:relative;width:100%;max-width:25rem;border-radius:var(--chakra-radii-xl,.75rem);padding:2rem 1.5rem 1.5rem;text-align:center;overflow:hidden;" +
        "background:var(--chakra-colors-white,#fff);color:var(--chakra-colors-gray-800,#1a202c);box-shadow:0 25px 60px -15px rgba(0,0,0,.45);animation:jls .35s cubic-bezier(.2,.9,.3,1.2)}" +
      ".chakra-ui-dark #jinx-lock .jl-card,#jinx-lock.dark .jl-card{background:var(--chakra-colors-gray-700,#2d3748);color:var(--chakra-colors-whiteAlpha-900,rgba(255,255,255,.92))}" +
      "#jinx-lock .jl-card::before{content:'';position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--chakra-colors-red-400,#f56565),var(--chakra-colors-orange-400,#ed8936))}" +
      "#jinx-lock.ok .jl-card::before{background:linear-gradient(90deg,var(--chakra-colors-green-400,#48bb78),var(--chakra-colors-teal-400,#38b2ac))}" +
      "#jinx-lock .jl-icon{width:3.5rem;height:3.5rem;margin:0 auto 1rem;border-radius:9999px;display:grid;place-items:center;color:#fff;" +
        "background:var(--chakra-colors-red-400,#f56565);box-shadow:0 0 0 8px var(--chakra-colors-red-100,#fed7d7);animation:jlp 2s ease-in-out infinite}" +
      ".chakra-ui-dark #jinx-lock .jl-icon,#jinx-lock.dark .jl-icon{box-shadow:0 0 0 8px rgba(245,101,101,.18)}" +
      "#jinx-lock.ok .jl-icon{background:var(--chakra-colors-green-400,#48bb78);box-shadow:0 0 0 8px var(--chakra-colors-green-100,#c6f6d5);animation:none}" +
      ".chakra-ui-dark #jinx-lock.ok .jl-icon,#jinx-lock.dark.ok .jl-icon{box-shadow:0 0 0 8px rgba(72,187,120,.2)}" +
      "#jinx-lock h2{font-size:var(--chakra-fontSizes-xl,1.25rem);font-weight:700;margin:0 0 .5rem}" +
      "#jinx-lock .jl-desc{font-size:var(--chakra-fontSizes-sm,.875rem);opacity:.75;line-height:1.8;margin:0 auto 1.25rem;max-width:21rem}" +
      "#jinx-lock .jl-ring{position:relative;width:9.5rem;height:9.5rem;margin:0 auto 1.25rem}" +
      "#jinx-lock .jl-ring svg{width:100%;height:100%;transform:rotate(-90deg)}" +
      "#jinx-lock .jl-ring .t{fill:none;stroke:var(--chakra-colors-gray-100,#edf2f7);stroke-width:8}" +
      ".chakra-ui-dark #jinx-lock .jl-ring .t,#jinx-lock.dark .jl-ring .t{stroke:var(--chakra-colors-whiteAlpha-200,rgba(255,255,255,.08))}" +
      "#jinx-lock .jl-ring .v{fill:none;stroke:" + P + ";stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset .3s linear,stroke .3s}" +
      "#jinx-lock.ok .jl-ring .v{stroke:var(--chakra-colors-green-400,#48bb78)}" +
      "#jinx-lock .jl-time{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
      "#jinx-lock .jl-time b{font-size:2.25rem;font-weight:700;line-height:1;direction:ltr;font-variant-numeric:tabular-nums;letter-spacing:.5px}" +
      "#jinx-lock .jl-time small{font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6;margin-top:.4rem}" +
      "#jinx-lock .jl-info{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1rem}" +
      "#jinx-lock .jl-info div{border:1px solid " + B + ";border-radius:var(--chakra-radii-md,.375rem);padding:.6rem .5rem}" +
      "#jinx-lock .jl-info span{display:block;font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.6}" +
      "#jinx-lock .jl-info b{display:block;font-size:var(--chakra-fontSizes-md,1rem);margin-top:.15rem;direction:ltr;font-variant-numeric:tabular-nums}" +
      "#jinx-lock .jl-tips{text-align:start;font-size:var(--chakra-fontSizes-xs,.75rem);opacity:.7;line-height:1.8;margin:0 0 1.25rem;padding-inline-start:1.1rem}" +
      "#jinx-lock button{width:100%;height:2.5rem;border:0;border-radius:var(--chakra-radii-md,.375rem);font:inherit;font-weight:600;font-size:var(--chakra-fontSizes-sm,.875rem);cursor:pointer;" +
        "background:" + P + ";color:#fff;transition:background .2s,opacity .2s,transform .1s}" +
      "#jinx-lock button:hover:not(:disabled){background:var(--chakra-colors-primary-600,var(--chakra-colors-blue-600,#2b6cb0))}#jinx-lock button:active:not(:disabled){transform:scale(.98)}" +
      "#jinx-lock button:disabled{opacity:.45;cursor:not-allowed}" +
      "#jinx-lock button:focus-visible{outline:2px solid " + P + ";outline-offset:2px}" +
      "#jinx-left{position:fixed;z-index:2147482000;left:50%;bottom:1.5rem;transform:translateX(-50%);max-width:calc(100vw - 2rem);display:flex;gap:.6rem;align-items:center;" +
        "padding:.75rem 1rem;border-radius:var(--chakra-radii-md,.375rem);font-size:var(--chakra-fontSizes-sm,.875rem);font-weight:500;color:#fff;" +
        "background:var(--chakra-colors-orange-500,#dd6b20);box-shadow:var(--chakra-shadows-lg,0 10px 15px -3px rgba(0,0,0,.2));animation:jls .25s ease-out}" +
      "@keyframes jlf{from{opacity:0}}@keyframes jls{from{opacity:0;transform:translateY(12px) scale(.96)}}" +
      "@keyframes jlp{50%{transform:scale(1.06)}}" +
      "#jinx-left{animation:none}" +
      "@media (prefers-reduced-motion:reduce){#jinx-lock,#jinx-lock *{animation:none!important;transition:none!important}}";
    document.head.appendChild(s);
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  Lock.show = function (seconds, max) {
    seconds = Math.max(1, Math.min(3600, Math.round(Number(seconds) || 0)));
    Lock.until = Date.now() + seconds * 1000; Lock.max = Number(max) || 10;
    Lock.total = Math.max(300, seconds);
    try { localStorage.setItem(LOCK_KEY, String(Lock.until)); localStorage.setItem(LOCK_KEY + "-total", String(Lock.total)); } catch (e) {}
    Lock.render();
  };
  Lock.render = function () {
    if (!document.body) { document.addEventListener("DOMContentLoaded", Lock.render); return; }
    lockCss(); var hl = document.getElementById("jinx-left"); if (hl) hl.remove();
    var w = Lock.el;
    if (!w || !document.contains(w)) {
      w = Lock.el = document.createElement("div"); w.id = "jinx-lock"; w.setAttribute("role", "alertdialog"); w.setAttribute("aria-modal", "true");
      w.setAttribute("dir", lang() === "fa" ? "rtl" : "ltr");
      w.innerHTML = '<div class="jl-card"><div class="jl-icon">' + svg(LOCK_PATH, 26) + '</div><h2></h2><p class="jl-desc"></p>' +
        '<div class="jl-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="t" cx="60" cy="60" r="52"/><circle class="v" cx="60" cy="60" r="52" stroke-dasharray="326.73" stroke-dashoffset="0"/></svg>' +
        '<div class="jl-time"><b aria-live="polite">00:00</b><small></small></div></div>' +
        '<div class="jl-info"><div><span></span><b class="jl-tr"></b></div><div><span></span><b class="jl-at"></b></div></div>' +
        '<ul class="jl-tips"><li></li><li></li></ul><button type="button" disabled></button></div>';
      document.body.appendChild(w);
      var spans = w.querySelectorAll(".jl-info span"); spans[0].textContent = lt("tries"); spans[1].textContent = lt("opens");
      var li = w.querySelectorAll(".jl-tips li"); li[0].textContent = lt("tip1"); li[1].textContent = lt("tip2");
      w.querySelector(".jl-time small").textContent = lt("until");
      w.querySelector("button").onclick = function () { if (Date.now() >= Lock.until) Lock.clear(true); };
      w.addEventListener("keydown", function (e) { if (e.key === "Tab") { e.preventDefault(); w.querySelector("button").focus(); } });
    }
    var dark = document.body.classList.contains("chakra-ui-dark") || document.documentElement.getAttribute("data-theme") === "dark";
    w.classList.toggle("dark", dark);
    w.querySelector("h2").textContent = lt("title");
    w.querySelector(".jl-desc").textContent = lt("desc").replace("{n}", Lock.max);
    w.querySelector(".jl-tr").textContent = Lock.max + " / " + Lock.max;
    var at = new Date(Lock.until); w.querySelector(".jl-at").textContent = two(at.getHours()) + ":" + two(at.getMinutes()) + ":" + two(at.getSeconds());
    clearInterval(Lock.timer); Lock.timer = setInterval(Lock.tick, 250); Lock.tick();
    setTimeout(function () { try { w.querySelector("button").focus({ preventScroll: true }); } catch (e) {} }, 50);
  };
  Lock.tick = function () {
    var w = Lock.el; if (!w) return;
    var ms = Lock.until - Date.now(), s = Math.max(0, Math.ceil(ms / 1000));
    w.querySelector(".jl-time b").textContent = two(Math.floor(s / 60)) + ":" + two(s % 60);
    var frac = Math.max(0, Math.min(1, s / Lock.total));
    w.querySelector(".jl-ring .v").setAttribute("stroke-dashoffset", (326.73 * (1 - frac)).toFixed(2));
    var btn = w.querySelector("button");
    if (s <= 0) {
      clearInterval(Lock.timer); w.classList.add("ok");
      w.querySelector(".jl-icon").innerHTML = svg(OPEN_PATH, 26);
      w.querySelector("h2").textContent = lt("open"); w.querySelector(".jl-desc").textContent = lt("openD");
      w.querySelector(".jl-time small").textContent = "";
      btn.disabled = false; btn.textContent = lt("again"); btn.focus({ preventScroll: true });
      try { localStorage.removeItem(LOCK_KEY); } catch (e) {}
    } else {
      w.classList.remove("ok"); btn.disabled = true; btn.textContent = lt("wait") + " · " + s + " " + lt("sec");
    }
  };
  Lock.clear = function (focusForm) {
    clearInterval(Lock.timer);
    if (Lock.el) { Lock.el.remove(); Lock.el = null; }
    try { localStorage.removeItem(LOCK_KEY); } catch (e) {}
    if (focusForm) { var pw = document.querySelector('input[type="password"]'); if (pw) pw.focus(); }
  };
  Lock.hint = function (left) {
    var old = document.getElementById("jinx-left"); if (old) old.remove();
    if (!(left >= 0) || left > 5 || !document.body) return;
    lockCss();
    var d = document.createElement("div"); d.id = "jinx-left"; d.setAttribute("role", "status");
    d.setAttribute("dir", lang() === "fa" ? "rtl" : "ltr");
    d.innerHTML = svg("M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z", 20) + "<span></span>";
    d.lastChild.textContent = lt("left").replace("{n}", left);
    document.body.appendChild(d);
    clearTimeout(Lock.ht); Lock.ht = setTimeout(function () { d.remove(); }, 6000);
  };
  function onLoginResponse(status, read, header) {
    if (status === 429) {
      read().then(function (j) { if (j && j.locked) Lock.show(j.retry_after, j.max); }).catch(function () {});
    } else if (status === 401) {
      var l = header("X-Jinx-Attempts-Left"); if (l != null && l !== "") Lock.hint(parseInt(l, 10));
    } else if (status >= 200 && status < 300) {
      Lock.clear(false); var h = document.getElementById("jinx-left"); if (h) h.remove();
    }
  }
  var TOKEN_RE = /\/api\/admin\/token(\?|$)/;
  var nativeFetch = window.__jinxFetch || window.fetch;
  if (window.fetch && !window.fetch.__jinx) {   // the panel logs in through fetch: watch only the login call
    window.__jinxFetch = nativeFetch;
    var patched = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var p = nativeFetch.apply(this, arguments);
      if (TOKEN_RE.test(url)) p.then(function (r) { try { onLoginResponse(r.status, function () { return r.clone().json(); }, function (h) { return r.headers.get(h); }); } catch (e) {} }, function () {});
      return p;
    };
    patched.__jinx = true; window.fetch = patched;
  }
  if (window.XMLHttpRequest && !XMLHttpRequest.prototype.open.__jinx) {   // and through XHR, in case a version uses axios
    var xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
    var no = function (m, u) { this.__jinxLogin = TOKEN_RE.test(String(u || "")); return xo.apply(this, arguments); };
    no.__jinx = true;
    XMLHttpRequest.prototype.open = no;
    XMLHttpRequest.prototype.send = function () {
      var x = this;
      if (x.__jinxLogin) x.addEventListener("loadend", function () {
        try { onLoginResponse(x.status, function () { return Promise.resolve(JSON.parse(x.responseText || "null")); }, function (h) { return x.getResponseHeader(h); }); } catch (e) {}
      });
      return xs.apply(this, arguments);
    };
  }
  // reload during a lock -> the lock screen comes back at once; the server is asked too (it is the truth)
  (function () {
    var u = 0, tot = 300;
    try { u = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10); tot = parseInt(localStorage.getItem(LOCK_KEY + "-total") || "300", 10) || 300; } catch (e) {}
    if (u > Date.now()) { Lock.until = u; Lock.total = tot; Lock.render(); }
    var check = function () {
      if (!/login/i.test(location.pathname + location.hash) && !Lock.el) return;
      nativeFetch("/jinx-api/lock-status", { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.locked) Lock.show(j.retry_after, j.max); else if (Lock.el && j && j.ok && !j.locked && Date.now() < Lock.until) { Lock.until = Date.now(); Lock.tick(); }
      }).catch(function () {});
    };
    setTimeout(check, 600);
  })();
  window.jinxLock = Lock;

  // 💎 the panel's own «Donation / حمایت مالی» menu item opens our donation page (/donate/) in a new tab.
  //    Capture phase: runs before React, keeps the panel's own onClick (the yellow dot still clears).
  var DON_RE = /github\.com\/gozargah\/marzban\/?#donation/i, DON_TXT = /^(donation|donate|حمایت مالی|حمایت|کمک مالی|دونیت|پشتیبانی مالی|捐赠|пожертвован)/i;
  function isDonate(el) {
    var a = el.closest && el.closest("a[href]");
    if (a && DON_RE.test(a.getAttribute("href") || "")) return a;
    var mi = el.closest && el.closest('[role="menuitem"]');
    if (mi && DON_TXT.test((mi.textContent || "").trim())) return mi;
    return null;
  }
  document.addEventListener("click", function (e) {
    if (e.button !== 0 && e.type === "click") return;
    var t = isDonate(e.target); if (!t) return;
    e.preventDefault();
    var w = null; try { w = window.open(location.origin + "/donate/", "_blank"); } catch (x) {}
    if (w) { try { w.opener = null; } catch (x) {} } else location.href = "/donate/"; // popup blocked -> same tab
  }, true);
  function fixDonate() { var as = document.querySelectorAll('a[href*="#donation"]'); for (var i = 0; i < as.length; i++) if (DON_RE.test(as[i].getAttribute("href") || "")) { as[i].setAttribute("href", location.origin + "/donate/"); as[i].setAttribute("rel", "noopener"); } }

  // 🔗 GitHub link of the panel -> Super JinX GitHub (backup for nginx)
  var GH = "https://github.com/x4gpanell", GH_OLD = /^https?:\/\/(www\.)?github\.com\/gozargah(\/marzban)?\/?$/i;
  var ghShadowDone = false, ghLastScan = 0;
  function fixLinks() {
    var as = document.querySelectorAll('a[href*="github.com"]');
    for (var i = 0; i < as.length; i++) if (GH_OLD.test(as[i].getAttribute("href") || "")) as[i].setAttribute("href", GH);
    fixDonate();
    // GitHub "Star" button draws its link in a shadow root: scan for it rarely, and stop once it is fixed
    if (ghShadowDone || Date.now() - ghLastScan < 5000) return;
    ghLastScan = Date.now();
    var sp = document.querySelectorAll("span");
    for (var k = 0; k < sp.length; k++) {
      var sr = sp[k].shadowRoot; if (!sr) continue;
      var ls = sr.querySelectorAll("a[href]");
      for (var m = 0; m < ls.length; m++) if (/github\.com/i.test(ls[m].getAttribute("href") || "")) {
        if (GH_OLD.test(ls[m].getAttribute("href"))) ls[m].setAttribute("href", GH);
        ghShadowDone = true;
      }
    }
  }
  var ghPend = false;
  new MutationObserver(function () { if (ghPend) return; ghPend = true; setTimeout(function () { ghPend = false; fixLinks(); }, 400); })
    .observe(document.documentElement, { childList: true, subtree: true });
  fixLinks();

  window.jinxChangePassword = openModal; // manual fallback from the browser console
})();
