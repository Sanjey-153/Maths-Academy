/* Maths Academy — single-page site behaviour */
(function () {
  "use strict";

  var $ = function (s, c) { return s && typeof s === "string" ? (c || document).querySelector(s) : null; };
  var $$ = function (s, c) { return s && typeof s === "string" ? Array.prototype.slice.call((c || document).querySelectorAll(s)) : []; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  var animate = hasGsap && !reduce;

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Navigation ---------- */
  var header = $(".site-header");
  var nav = $("#site-nav");
  var toggle = $(".nav-toggle");

  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  $$("[data-link]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || typeof id !== "string") return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      var top = id === "#home" ? 0 : target.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      history.pushState(null, "", id);
    });
  });

  // Active section indication
  var sectionMap = {
    "home": "#home", "credentials": "#home", "about-me": "#about-me",
    "maths-academy": "#maths-academy", "academy-gallery": "#maths-academy",
    "academics": "#academics", "teaching": "#teaching",
    "career": "#career", "career-gallery": "#career", "contact": "#contact"
  };
  var navLinks = $$(".site-nav li a");
  function setActive(href) {
    navLinks.forEach(function (l) {
      var on = l.getAttribute("href") === href;
      l.classList.toggle("active", on);
      if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && sectionMap[en.target.id]) setActive(sectionMap[en.target.id]);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(sectionMap).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- Programmes accordion ---------- */
  var progs = $$(".prog");
  function activateProg(p) {
    progs.forEach(function (x) {
      var on = x === p;
      x.classList.toggle("is-active", on);
      $(".prog-head", x).setAttribute("aria-expanded", String(on));
    });
  }
  progs.forEach(function (p) {
    $(".prog-head", p).addEventListener("click", function () { activateProg(p); });
    if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
      p.addEventListener("mouseenter", function () { activateProg(p); });
    }
  });

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox"), lbStage = $(".lb-stage", lb), lbItems = [], lbIndex = 0, lastFocus = null;
  var lbCounter = $("#lb-counter"), lbTitle = $("#lb-title"), lbDesc = $("#lb-desc");

  function renderLb() {
    var item = lbItems[lbIndex];
    if (!item) return;
    var img = $("img", item);
    var title = item.getAttribute("data-title") || (img ? img.alt : "Maths Academy Photo");
    var caption = item.getAttribute("data-caption") || "";

    lbStage.innerHTML = "";
    if (img && (img.currentSrc || img.src || img.getAttribute("src"))) {
      var c = document.createElement("img");
      c.src = img.currentSrc || img.src || img.getAttribute("src");
      c.alt = img.alt || title;
      lbStage.appendChild(c);
    }

    if (lbCounter) lbCounter.textContent = "Photo " + (lbIndex + 1) + " of " + lbItems.length;
    if (lbTitle) lbTitle.textContent = title;
    if (lbDesc) lbDesc.textContent = caption;
  }

  function openLb(items, i) {
    lbItems = items; lbIndex = i; lastFocus = document.activeElement;
    renderLb(); lb.hidden = false; document.body.style.overflow = "hidden";
    $(".lb-close", lb).focus();
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  function stepLb(d) { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; renderLb(); }

  $$("[data-gallery]").forEach(function (g) {
    var items = $$(".g-item", g);
    items.forEach(function (it, i) { it.addEventListener("click", function () { openLb(items, i); }); });
  });

  $(".lb-close", lb).addEventListener("click", closeLb);
  $(".lb-prev", lb).addEventListener("click", function () { stepLb(-1); });
  $(".lb-next", lb).addEventListener("click", function () { stepLb(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target === lbStage) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") stepLb(-1);
    if (e.key === "ArrowRight") stepLb(1);
    if (e.key === "Tab") { // keep focus inside dialog
      var f = $$("button", lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Enquiry form → WhatsApp ---------- */
  var cfg = window.MATHS_ACADEMY_CONFIG || { whatsappNumber: "918778311898", academyName: "Maths Academy" };
  var form = $("#enquiry-form"), submitBtn = $("#submit-btn"), success = $("#form-success");
  var submitting = false, lastPayload = "";

  function setErr(input, msg) {
    var field = input.closest(".field");
    field.classList.toggle("invalid", !!msg);
    $(".err", field).textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    return !msg;
  }
  function validPhone(v) {
    var s = v.replace(/[\s\-()]/g, "");
    return /^(?:\+?91|0)?[6-9]\d{9}$/.test(s) || /^\+\d{8,15}$/.test(s);
  }
  function validate() {
    var f = form.elements, ok = true, firstBad = null;
    function check(input, msg) { var good = setErr(input, msg); if (!good && !firstBad) firstBad = input; ok = ok && good; }
    check(f.parent, f.parent.value.trim().length < 2 ? "Please enter the parent’s name." : "");
    check(f.student, f.student.value.trim().length < 2 ? "Please enter the student’s name." : "");
    check(f.grade, f.grade.value.trim() === "" ? "Please enter the class or grade." : "");
    var p = f.phone.value.trim();
    check(f.phone, p === "" ? "Please enter a contact number." : (validPhone(p) ? "" : "Enter a valid 10-digit mobile number, or an international number starting with +."));
    if (firstBad) firstBad.focus();
    return ok;
  }
  ["parent", "student", "grade", "phone"].forEach(function (n) {
    form.elements[n].addEventListener("input", function () {
      if (this.closest(".field").classList.contains("invalid")) setErr(this, "");
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    success.hidden = true;
    if (!validate()) return;
    var f = form.elements;
    var lines = [
      "Hello " + cfg.academyName + ", I would like to enquire about classes.",
      "",
      "Parent's name: " + f.parent.value.trim(),
      "Student's name: " + f.student.value.trim(),
      "Class / Grade: " + f.grade.value.trim(),
      "Contact number: " + f.phone.value.trim()
    ];
    var msg = f.message.value.trim();
    if (msg) lines.push("Message: " + msg);
    var text = lines.join("\n");
    if (text === lastPayload && submitBtn.disabled) return;
    lastPayload = text;
    submitting = true; submitBtn.disabled = true;
    var url = "https://wa.me/" + String(cfg.whatsappNumber).replace(/\D/g, "") + "?text=" + encodeURIComponent(text);
    var w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch (err) { /* ignore */ } }
    else window.location.href = url; // popup blocked fallback
    success.hidden = false;
    setTimeout(function () { submitting = false; submitBtn.disabled = false; }, 6000);
  });

  /* ---------- Motion ---------- */
  var words = $$(".hero-word"), icons = $$(".hero-icon"), bgs = $$(".hero-bg"), dots = $$(".hero-dots i");
  var accents = ["#E9C22E", "#F2772F", "#3FB874", "#C564C4"];
  var current = -1;

  function setHeroStatic(i) {
    words.forEach(function (w, k) { w.style.opacity = k === i ? 1 : 0; });
    icons.forEach(function (w, k) { w.style.opacity = k === i ? 1 : 0; });
    bgs.forEach(function (w, k) { w.style.opacity = k === i ? 1 : 0; });
    dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    document.documentElement.style.setProperty("--accent", accents[i]);
  }

  if (!animate) {
    setHeroStatic(0);
    // show all drawn shapes and final values
    return;
  }

  function showWord(i) {
    var prev = current; current = i;
    var tl = gsap.timeline();
    var offset = 0;
    if (prev >= 0) {
      tl.to(words[prev], { yPercent: -35, opacity: 0, filter: "blur(8px)", scale: 1.02, duration: .45, ease: "power2.in" }, 0);
      tl.to(icons[prev], { y: -22, opacity: 0, scale: .85, duration: .4, ease: "power2.in" }, 0);
      tl.to(bgs[prev], { opacity: 0, duration: .9, ease: "power1.inOut" }, 0);
      offset = .3;
    }
    tl.fromTo(words[i], { yPercent: 40, opacity: 0, scale: .96, filter: "blur(10px)" },
      { yPercent: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: .75, ease: "power3.out" }, offset);
    tl.fromTo(icons[i], { scale: .7, rotation: -18, y: 16, opacity: 0 },
      { scale: 1, rotation: 0, y: 0, opacity: 1, duration: .85, ease: "back.out(1.6)" }, offset + .06);
    tl.to(bgs[i], { opacity: 1, duration: .9, ease: "power1.inOut" }, offset === 0 ? 0 : 0);
    dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
    document.documentElement.style.setProperty("--accent", accents[i]);
  }

  gsap.set(words, { opacity: 0 });
  gsap.set(icons, { opacity: 0, transformOrigin: "50% 60%" });
  var heroTimer;
  function loop() {
    heroTimer = gsap.delayedCall(1.75, function () { showWord((current + 1) % words.length); loop(); });
  }
  showWord(0); loop();

  var heroVisible = true;
  function syncHeroPause() {
    if (!heroTimer) return;
    if (document.hidden || !heroVisible) heroTimer.pause(); else heroTimer.resume();
  }
  document.addEventListener("visibilitychange", syncHeroPause);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; syncHeroPause(); }, { threshold: 0.05 })
      .observe($("#home"));
  }

  // hero grid parallax
  gsap.to(".hero-grid", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero-inner", { yPercent: -6, opacity: .6, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* Stat counters */
  $$("[data-count]").forEach(function (el) {
    var end = parseInt(el.getAttribute("data-count"), 10), suffix = el.getAttribute("data-suffix") || "";
    var o = { v: 0 };
    el.textContent = "0" + suffix;
    gsap.to(o, {
      v: end, duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString("en-US") + suffix; },
      onComplete: function () { el.textContent = end.toLocaleString("en-US") + suffix; }
    });
  });
  gsap.from(".stat", { y: 30, opacity: 0, duration: .8, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".stats-list", start: "top 90%", once: true } });

  /* Headline word reveals */
  $$(".split").forEach(function (h) {
    var words2 = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words2.map(function (w) { return '<span class="w" aria-hidden="true"><span class="wi">' + w + "</span></span>"; }).join(" ");
    gsap.from($$(".wi", h), { yPercent: 110, rotate: 3, duration: .9, stagger: .06, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } });
  });

  /* SVG stroke drawing (shape construction, grids, graphs) */
  $$(".draw").forEach(function (el) {
    if (el.classList.contains("road-path") || el.classList.contains("ring")) return;
    var dashed = el.hasAttribute("stroke-dasharray");
    if (dashed) {
      gsap.from(el, { opacity: 0, duration: 1.2, scrollTrigger: { trigger: el.ownerSVGElement, start: "top 85%", once: true } });
      return;
    }
    el.setAttribute("pathLength", "1");
    gsap.set(el, { strokeDasharray: 1, strokeDashoffset: 1 });
  });
  function drawGroup(svgSel, trigger) {
    $$(svgSel).forEach(function (svg) {
      var els = $$(".draw", svg).filter(function (e) { return e.getAttribute("pathLength") === "1" && !e.classList.contains("road-path") && !e.classList.contains("ring"); });
      if (!els.length) return;
      gsap.to(els, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", stagger: .2, scrollTrigger: { trigger: svg, start: "top 85%", once: true } });
    });
  }
  drawGroup(".stats-art"); drawGroup(".academy-art svg"); drawGroup(".founder-orbit");
  gsap.from(".academy-art .dots circle, .academy-art text", { opacity: 0, scale: .4, transformOrigin: "50% 50%", duration: .6, stagger: .08, delay: .8, scrollTrigger: { trigger: ".academy-art", start: "top 80%", once: true } });

  /* About Me: Background Mathematical Animations */
  var bgSvg = $(".founder-math-bg");
  var bgTweens = [];
  if (bgSvg && animate) {
    bgTweens.push(gsap.to(".c-rot-1", { rotation: 360, transformOrigin: "0 0", ease: "none", duration: 75, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-2", { rotation: -360, transformOrigin: "0 0", ease: "none", duration: 48, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-3", { rotation: 360, transformOrigin: "0 0", ease: "none", duration: 32, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-4", { rotation: 360, transformOrigin: "0 0", ease: "none", duration: 90, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-5", { rotation: -360, transformOrigin: "0 0", ease: "none", duration: 60, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-6", { rotation: 360, transformOrigin: "0 0", ease: "none", duration: 42, repeat: -1 }));
    bgTweens.push(gsap.to(".c-rot-7", { rotation: -360, transformOrigin: "0 0", ease: "none", duration: 28, repeat: -1 }));
    bgTweens.push(gsap.to(".math-travel-orbit", { rotation: 360, transformOrigin: "0 0", ease: "none", duration: 24, repeat: -1 }));

    // Floating symbols with gentle counter oscillation
    $$(".float-sym").forEach(function (sym, idx) {
      var dir = idx % 2 === 0 ? 1 : -1;
      bgTweens.push(gsap.to(sym, {
        y: "-=" + (12 + (idx % 4) * 3),
        x: "+=" + (dir * (6 + (idx % 3) * 2)),
        rotation: dir * (4 + (idx % 3) * 2),
        transformOrigin: "50% 50%",
        yoyo: true, repeat: -1, ease: "sine.inOut",
        duration: 3.2 + (idx * 0.4)
      }));
    });

    // Constellation pulsing dots
    $$(".c-node-pulse").forEach(function (dot, idx) {
      bgTweens.push(gsap.to(dot, {
        scale: 1.35, yoyo: true, repeat: -1, ease: "sine.inOut",
        duration: 2 + idx * 0.4, transformOrigin: "50% 50%"
      }));
    });

    // Wave curves subtle drift
    bgTweens.push(gsap.to(".math-wave-1", { y: -10, ease: "sine.inOut", yoyo: true, repeat: -1, duration: 6 }));
    bgTweens.push(gsap.to(".math-wave-2", { y: 12, ease: "sine.inOut", yoyo: true, repeat: -1, duration: 7.5 }));

    // Parallax on About Me background SVG
    gsap.to(".founder-math-svg", {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: "#about-me", start: "top bottom", end: "bottom top", scrub: true }
    });

    // Pause/Resume background animations when off-screen or tab hidden
    var founderSec = $("#about-me");
    if ("IntersectionObserver" in window && founderSec) {
      var founderIo = new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        bgTweens.forEach(function (tw) { if (visible && !document.hidden) tw.resume(); else tw.pause(); });
      }, { threshold: 0.05 });
      founderIo.observe(founderSec);
    }
  }

  /* Maths Academy Gliding Point Animation */
  var pointP = $(".point-p");
  if (pointP && animate) {
    var pMotion = { t: 0 };
    gsap.to(pMotion, {
      t: 1, duration: 7.5, repeat: -1, yoyo: true, ease: "sine.inOut",
      onUpdate: function () {
        var px = 175 + (310 - 175) * pMotion.t;
        var u = (px - 240) / 120;
        var py = 310 - 240 * (u * u);
        pointP.setAttribute("cx", px);
        pointP.setAttribute("cy", py);
        var halo = $(".point-p-halo");
        if (halo) { halo.setAttribute("cx", px); halo.setAttribute("cy", py); }
        var projX = $(".proj-x"), projY = $(".proj-y");
        if (projX) { projX.setAttribute("x1", px); projX.setAttribute("y1", py); projX.setAttribute("x2", px); projX.setAttribute("y2", 240); }
        if (projY) { projY.setAttribute("x1", px); projY.setAttribute("y1", py); projY.setAttribute("x2", 240); projY.setAttribute("y2", py); }
        var pLabel = $(".point-p-label");
        if (pLabel) { pLabel.setAttribute("x", px + 12); pLabel.setAttribute("y", py - 5); }
      }
    });
  }

  /* Image mask reveals */
  $$(".gallery").forEach(function (g) {
    var items = $$(".g-item", g);
    gsap.from(items, { clipPath: "inset(100% 0% 0% 0% round 24px)", duration: 1.2, stagger: .12, ease: "power4.out", scrollTrigger: { trigger: g, start: "top 82%", once: true } });
    items.forEach(function (it) {
      var inner = it.querySelector("img, .ph");
      if (inner) gsap.from(inner, { scale: 1.2, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: it, start: "top 92%", once: true } });
    });
  });

  /* Career collage staggered reveal */
  var careerCollage = $(".career-collage");
  if (careerCollage && animate) {
    var cCards = $$(".c-card", careerCollage);
    gsap.from(cCards, {
      y: 45, opacity: 0, duration: 1.1, stagger: 0.15, ease: "power3.out",
      scrollTrigger: { trigger: careerCollage, start: "top 80%", once: true }
    });
  }

  gsap.from(".mask-img", { clipPath: "inset(100% 0% 0% 0% round 200px 200px 28px 28px)", duration: 1.4, ease: "power4.out", scrollTrigger: { trigger: ".founder-photo", start: "top 80%", once: true } });

  /* Parallax */
  gsap.to("[data-parallax]", { y: -36, ease: "none", scrollTrigger: { trigger: ".founder", start: "top bottom", end: "bottom top", scrub: true } });

  /* Chips, lists, Vision & Mission, Statement */
  gsap.from(".chips li", { y: 18, opacity: 0, duration: .6, stagger: .06, ease: "power3.out", scrollTrigger: { trigger: ".chips", start: "top 90%", once: true } });
  gsap.from(".pull", { x: -24, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: ".pull", start: "top 92%", once: true } });
  gsap.from(".vm-card", { y: 32, opacity: 0, duration: .85, stagger: .18, ease: "power3.out", scrollTrigger: { trigger: ".vm", start: "top 86%", once: true } });
  gsap.from(".statement-wrap", { y: 30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".statement-wrap", start: "top 92%", once: true } });
  gsap.from(".prog", { clipPath: "inset(0 100% 0 0)", duration: 1, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".prog-list", start: "top 85%", once: true } });
  gsap.from(".approach-item", { y: 24, opacity: 0, duration: .7, stagger: .07, ease: "power3.out", scrollTrigger: { trigger: ".approach", start: "top 88%", once: true } });
  gsap.from(".services li", { x: -18, opacity: 0, duration: .6, stagger: .06, ease: "power3.out", scrollTrigger: { trigger: ".services", start: "top 88%", once: true } });
  gsap.from(".cert", { scale: .92, opacity: 0, duration: .8, ease: "back.out(1.4)", scrollTrigger: { trigger: ".cert", start: "top 90%", once: true } });

  /* Weekly Learning Cycle Interactive Controller */
  var cycleStages = [
    {
      tag: "Stage 1 of 5",
      title: "LEARN",
      color: "#E9C22E",
      desc: "Building core mathematical and scientific concepts from foundational first principles. Ensuring deep conceptual understanding before memorisation."
    },
    {
      tag: "Stage 2 of 5",
      title: "PRACTISE",
      color: "#F2772F",
      desc: "Applying concepts across diverse, progressive problem sets to develop natural analytical intuition and mathematical problem-solving agility."
    },
    {
      tag: "Stage 3 of 5",
      title: "ASSESS",
      color: "#3FB874",
      desc: "Rigorous weekly diagnostic assessments pinpoint subtle learning gaps and miscomprehensions early before they compound."
    },
    {
      tag: "Stage 4 of 5",
      title: "REVISE",
      color: "#C564C4",
      desc: "Structured weekly revision consolidates retention, clarifies lingering doubts, and solidifies academic mastery week by week."
    },
    {
      tag: "Stage 5 of 5",
      title: "IMPROVE",
      color: "#0D0D0C",
      desc: "Measurable academic elevation, heightened examination readiness, self-confidence, and independent critical thinking."
    }
  ];
  var curStage = 0;
  var cyclePaused = false;
  var cNodes = $$(".c-node");
  var stageDots = $$(".stage-dot");
  var stageTagEl = $("#stage-tag");
  var stageTitleEl = $("#stage-title");
  var stageDescEl = $("#stage-desc");
  var ringProg = $(".ring-progress");

  function activateStage(idx) {
    curStage = idx;
    var data = cycleStages[idx];
    if (!data) return;

    cNodes.forEach(function (n, i) {
      var on = i === idx;
      n.classList.toggle("is-active", on);
      var halo = $(".c-halo", n);
      if (halo) halo.style.fillOpacity = on ? "0.35" : "0";
    });

    stageDots.forEach(function (d, i) {
      d.classList.toggle("is-active", i === idx);
    });

    if (ringProg) {
      var total = 942.48;
      var offset = total - (total * ((idx + 1) / 5));
      ringProg.style.strokeDashoffset = String(offset);
      ringProg.style.stroke = data.color === "#0D0D0C" ? "#E9C22E" : data.color;
    }

    if (stageTagEl) stageTagEl.textContent = data.tag;
    if (stageTitleEl) {
      stageTitleEl.textContent = data.title;
      stageTitleEl.style.color = data.color === "#0D0D0C" ? "inherit" : data.color;
    }
    if (stageDescEl) {
      if (animate) {
        gsap.fromTo(stageDescEl, { opacity: 0.35, y: 3 }, { opacity: 1, y: 0, duration: 0.35 });
      }
      stageDescEl.textContent = data.desc;
    }
  }

  function cycleNext() {
    if (cyclePaused) return;
    activateStage((curStage + 1) % cycleStages.length);
  }

  if (cNodes.length) {
    cNodes.forEach(function (node, i) {
      node.addEventListener("click", function () { activateStage(i); cyclePaused = true; });
      node.addEventListener("mouseenter", function () { activateStage(i); cyclePaused = true; });
      node.addEventListener("mouseleave", function () { cyclePaused = false; });
      node.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateStage(i); } });
    });
    stageDots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { activateStage(i); cyclePaused = true; });
    });
    var cycleComp = $("#weekly-cycle-component");
    if (cycleComp) {
      cycleComp.addEventListener("mouseenter", function () { cyclePaused = true; });
      cycleComp.addEventListener("mouseleave", function () { cyclePaused = false; });
    }
    setInterval(cycleNext, 3800);
    activateStage(0);
  }

  /* Weekly cycle initial ring animation on scroll */
  var ring = $(".ring");
  if (ring && animate) {
    ring.setAttribute("pathLength", "1");
    gsap.set(ring, { strokeDasharray: 1, strokeDashoffset: 1, rotation: -90, svgOrigin: "200 200" });
    var ctl = gsap.timeline({ scrollTrigger: { trigger: ".cycle-svg", start: "top 80%", once: true } });
    ctl.to(ring, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" }, 0);
    ctl.from(".c-node", { opacity: 0, scale: .3, transformOrigin: "50% 50%", duration: .5, stagger: .25, ease: "back.out(2)" }, .2);
    ctl.from(".c-mid", { opacity: 0, y: 8, duration: .8 }, .3);
  }

  /* Teaching process + roadmap (responsive scrub lines) */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", function () {
    gsap.fromTo(".path-line i", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".process", start: "top 75%", end: "bottom 60%", scrub: true } });
  });
  mm.add("(max-width: 900px)", function () {
    gsap.fromTo(".path-line i", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".process", start: "top 70%", end: "bottom 60%", scrub: true } });
  });
  gsap.from(".stage", { y: 34, opacity: 0, duration: .8, stagger: .22, ease: "power3.out", scrollTrigger: { trigger: ".process", start: "top 78%", once: true } });

  var stops = $$(".rs");
  var roadPath = $(".road-path");
  if (roadPath) {
    roadPath.setAttribute("pathLength", "1");
    gsap.set(roadPath, { strokeDasharray: 1, strokeDashoffset: 1 });
  }
  function markStops(p) { stops.forEach(function (s, i) { s.classList.toggle("on", i === 0 ? p > 0.02 : p >= (i / (stops.length - 1)) * 0.96); }); }
  ScrollTrigger.create({
    trigger: ".roadmap", start: "top 80%", end: "bottom 55%", scrub: true,
    onUpdate: function (self) {
      if (roadPath) roadPath.style.strokeDashoffset = String(1 - self.progress);
      $(".road-stops").style.setProperty("--road", self.progress);
      markStops(self.progress);
    }
  });
  gsap.from(".rs h4, .rs p", { y: 16, opacity: 0, duration: .7, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: ".roadmap", start: "top 80%", once: true } });

  /* Contact + Premium Footer animations */
  gsap.from(".enquiry", { y: 40, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: ".enquiry", start: "top 90%", once: true } });
  
  if (animate) {
    gsap.from(".foot-col", {
      y: 35, opacity: 0, duration: .85, stagger: .14, ease: "power3.out",
      scrollTrigger: { trigger: ".site-footer", start: "top 88%", once: true }
    });
    var footWave = $(".foot-wave-active");
    if (footWave) {
      gsap.to(footWave, {
        strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut",
        scrollTrigger: { trigger: ".site-footer", start: "top 85%", once: true }
      });
    }
    if ($(".foot-location-panel")) {
      gsap.from(".foot-location-panel", {
        y: 35, opacity: 0, duration: .9, ease: "power3.out",
        scrollTrigger: { trigger: ".foot-location-panel", start: "top 90%", once: true }
      });
    }
  }

  // Handle visibility changes globally
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cyclePaused = true;
      bgTweens.forEach(function (tw) { tw.pause(); });
    } else {
      cyclePaused = false;
      bgTweens.forEach(function (tw) { tw.resume(); });
    }
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
