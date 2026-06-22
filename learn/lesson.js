// lesson.js - MCQ interaction, progress tracking, score tracking, theme sync for lesson pages

(function () {
  const SESSION_KEY = "quantum_sandbox_session_v1";
  const PROGRESS_KEY = "qs_learn_progress";
  const SCORES_KEY   = "qs_learn_scores";   // { lessonId: { pts: N, max: 10 } }

  // Theme sync
  function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    var icon = document.getElementById("themeIcon");
    if (icon) {
      icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
  }

  function loadTheme() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        var session = JSON.parse(raw);
        if (session.currentTheme === "light" || session.currentTheme === "dark") {
          return session.currentTheme;
        }
      }
    } catch (e) {}
    return "dark";
  }

  function saveTheme(theme) {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      var session = raw ? JSON.parse(raw) : {};
      session.currentTheme = theme;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {}
  }

  var currentTheme = loadTheme();
  applyTheme(currentTheme);

  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      saveTheme(currentTheme);
    });
  }

  // Progress tracking
  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getLessonId() {
    var path = window.location.pathname;
    var filename = path.split("/").pop().replace(".html", "");
    return filename || "unknown";
  }

  function markLessonComplete() {
    var id = getLessonId();
    try {
      var progress = loadProgress();
      progress[id] = true;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function revealCongratsLink() {
    if (getLessonId() !== "15-the-future") return;
    var link = document.getElementById("congratsLink");
    if (link) link.hidden = false;
  }

  // Score tracking
  function loadScores() {
    try {
      var raw = localStorage.getItem(SCORES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveScore(lessonId, pts) {
    try {
      var scores = loadScores();
      if (!scores[lessonId] || scores[lessonId].pts < pts) {
        scores[lessonId] = { pts: pts, max: 10 };
        localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
      }
    } catch (e) {}
  }

  function renderScoreBadge(pts, allCorrect) {
    var badge = document.getElementById("lessonScoreBadge");
    if (!badge) return;
    badge.textContent = "Quiz complete: " + pts + " / 10 pts";
    badge.className = "lesson-score-badge " + (allCorrect ? "pts-correct" : "pts-partial");
    badge.hidden = false;
  }

  // MCQ interaction — points split evenly, awarded after the last check
  var allChecks = document.querySelectorAll(".lesson-check");
  var totalChecks = allChecks.length;
  var answeredChecks = 0;
  var correctChecks = 0;

  function finishQuiz() {
    var pts = totalChecks ? Math.round((correctChecks / totalChecks) * 10) : 0;
    renderScoreBadge(pts, correctChecks === totalChecks);
    saveScore(getLessonId(), pts);
    markLessonComplete();
    revealCongratsLink();
  }

  function initCheck(checkEl) {
    var options = checkEl.querySelectorAll(".check-option");
    var feedback = checkEl.querySelector(".check-feedback");
    var answered = false;

    options.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (answered) return;
        answered = true;

        var isCorrect = btn.dataset.correct === "true";
        btn.classList.add(isCorrect ? "correct" : "incorrect");

        if (!isCorrect) {
          // reveal the correct answer
          options.forEach(function (o) {
            if (o.dataset.correct === "true") o.classList.add("revealed");
          });
        } else {
          correctChecks++;
        }

        // disable all options
        options.forEach(function (o) { o.disabled = true; });

        // show feedback
        if (feedback) {
          feedback.classList.add("visible");
          feedback.classList.add(isCorrect ? "correct-feedback" : "incorrect-feedback");
          if (!feedback.textContent.trim()) {
            feedback.textContent = isCorrect
              ? "Correct! Well done."
              : "Hmm, not quite! The correct answer is highlighted above.";
          }
        }

        answeredChecks++;
        if (answeredChecks === totalChecks) finishQuiz();
      });
    });
  }

  // Score badge DOM injection (appended after the final question)
  (function injectScoreBadge() {
    if (!totalChecks) return;
    var lastCheck = allChecks[allChecks.length - 1];
    var badge = document.createElement("div");
    badge.id = "lessonScoreBadge";
    badge.className = "lesson-score-badge";
    badge.hidden = true;
    lastCheck.appendChild(badge);
  })();

  // Running score chip injected into lesson header actions
  (function renderRunningScore() {
    var scores = loadScores();
    var total = Object.values(scores).reduce(function(s, v) { return s + (v.pts || 0); }, 0);
    var actionsEl = document.querySelector(".top-actions");
    if (!actionsEl) return;
    var chip = document.createElement("span");
    chip.id = "runningScore";
    chip.className = "running-score-chip";
    chip.innerHTML = '<i class="fa-solid fa-star"></i> ' + total + ' pts';
    actionsEl.insertBefore(chip, actionsEl.firstChild);
  })();

  allChecks.forEach(initCheck);

  // Show congrats button immediately if this lesson was already completed before
  if (loadProgress()[getLessonId()]) revealCongratsLink();

  // Expand / accordion cards
  document.querySelectorAll(".expand-card").forEach(function (card) {
    var header = card.querySelector(".expand-card-header");
    if (!header) return;
    header.addEventListener("click", function () {
      card.classList.toggle("open");
    });
  });

  // Gate reference cards (click to expand detail)
  document.querySelectorAll(".gate-ref-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var wasOpen = card.classList.contains("expanded");
      document.querySelectorAll(".gate-ref-card.expanded").forEach(function (c) { c.classList.remove("expanded"); });
      if (!wasOpen) card.classList.add("expanded");
    });
  });

  // Probability slider
  document.querySelectorAll(".prob-slider").forEach(function (slider) {
    var wrap = slider.closest(".prob-slider-wrap");
    if (!wrap) return;
    var alphaBar = wrap.querySelector(".prob-bar-fill.alpha");
    var betaBar  = wrap.querySelector(".prob-bar-fill.beta");
    var alphaPct = wrap.querySelector(".prob-alpha-pct");
    var betaPct  = wrap.querySelector(".prob-beta-pct");
    var caption  = wrap.querySelector(".prob-slider-caption");

    function update() {
      var v = Number(slider.value);
      var p0 = Math.round(v);
      var p1 = 100 - p0;
      slider.style.setProperty("--slider-pct", p0 + "%");
      if (alphaBar) alphaBar.style.width = p0 + "%";
      if (betaBar)  betaBar.style.width  = p1 + "%";
      if (alphaPct) alphaPct.textContent = p0 + "%";
      if (betaPct)  betaPct.textContent  = p1 + "%";
      if (caption) {
        if (p0 === 100) caption.textContent = "Qubit is definitely |0⟩ — a classical state. No uncertainty.";
        else if (p1 === 100) caption.textContent = "Qubit is definitely |1⟩ — a classical state. No uncertainty.";
        else if (p0 === 50) caption.textContent = "Perfect 50/50 superposition — the outcome is genuinely random until measured.";
        else caption.textContent = p0 + "% chance of |0⟩, " + p1 + "% chance of |1⟩ when measured.";
      }
    }

    slider.addEventListener("input", update);
    update();
  });

  // Exponential growth chart
  document.querySelectorAll(".exp-growth-chart").forEach(function (chart) {
    var bars = chart.querySelectorAll(".exp-bar");
    if (!bars.length) return;
    var values = [];
    bars.forEach(function (b) { values.push(Number(b.dataset.value) || 1); });
    var max = Math.max.apply(null, values);
    bars.forEach(function (b, i) {
      var pct = (values[i] / max) * 100;
      b.style.height = Math.max(pct, 3) + "%";
    });
  });

})();
