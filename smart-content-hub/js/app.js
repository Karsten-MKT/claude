/**
 * Smart Content Hub – Chat Application
 *
 * Provides an interactive chat interface that answers visitor questions
 * based on content from mgm-cp.com and the mgm Insights Consulting blog.
 *
 * In production this would connect to a RAG/LLM backend.
 * Currently uses keyword matching against CONTENT_STORE (content-store.js).
 */

(function () {
  "use strict";

  const messagesEl = document.getElementById("messages");
  const formEl = document.getElementById("input-form");
  const inputEl = document.getElementById("user-input");
  const typingEl = document.getElementById("typing-indicator");

  // ── Helpers ──────────────────────────────────────

  function addMessage(html, role) {
    const div = document.createElement("div");
    div.classList.add("message", role);
    div.innerHTML = html;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    typingEl.classList.add("visible");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    typingEl.classList.remove("visible");
  }

  function escapeHtml(text) {
    const el = document.createElement("span");
    el.textContent = text;
    return el.innerHTML;
  }

  function sourceLink(url, label) {
    return `<a class="source-link" href="${url}" target="_blank" rel="noopener">↗ ${escapeHtml(label)}</a>`;
  }

  // ── Keyword-based response engine ────────────────

  function normalise(text) {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchesAny(input, keywords) {
    const n = normalise(input);
    return keywords.some(function (kw) {
      return n.includes(normalise(kw));
    });
  }

  function findResponse(raw) {
    var input = normalise(raw);
    var store = CONTENT_STORE;

    // ── About the company ──
    if (matchesAny(input, ["wer ist mgm", "ueber mgm", "was macht mgm", "was ist mgm", "unternehmen", "firma", "company", "who is"])) {
      var c = store.company;
      return (
        "<strong>" + escapeHtml(c.name) + "</strong><br>" +
        escapeHtml(c.description) +
        "<br><br>Gegründet: " + c.founded +
        " · Mitarbeitende: " + c.headcount +
        " · Hauptsitz: " + escapeHtml(c.headquarters) +
        "<br>Standorte: " + c.offices.join(", ") +
        "<br><br>Muttergesellschaft: " + escapeHtml(c.parentCompany) +
        "<br>" + sourceLink(c.url, "mgm-cp.com")
      );
    }

    // ── Services overview ──
    if (matchesAny(input, ["leistung", "service", "angebot", "beratung", "was bietet", "portfolio"])) {
      var lines = store.services.map(function (s) {
        return "<strong>" + escapeHtml(s.title) + "</strong> – " + escapeHtml(s.summary);
      });
      return (
        "mgm consulting partners bietet ein breites Leistungsspektrum:<br><br>" +
        lines.join("<br><br>") +
        "<br><br>" + sourceLink(store.sources.mainWebsite, "Alle Leistungen auf mgm-cp.com")
      );
    }

    // ── CIO Advisory ──
    if (matchesAny(input, ["cio", "it strategie", "it-strategie"])) {
      var cio = store.services.find(function (s) { return s.title.includes("CIO"); });
      var blogs = store.blogArticles.filter(function (a) { return normalise(a.title).includes("it strategie") || normalise(a.title).includes("it-strategie"); });
      var resp = "<strong>CIO Advisory</strong><br>" + escapeHtml(cio.summary);
      if (blogs.length) {
        resp += "<br><br><strong>Aktuelle Blog-Beiträge dazu:</strong><br>";
        blogs.forEach(function (b) {
          resp += "• " + escapeHtml(b.title) + " (" + b.date + ")<br>";
        });
      }
      resp += "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com");
      return resp;
    }

    // ── SAP / S4HANA ──
    if (matchesAny(input, ["sap", "s4hana", "s/4hana", "s 4hana", "hana"])) {
      var sap = store.services.find(function (s) { return s.title.includes("SAP"); });
      var sapBlogs = store.blogArticles.filter(function (a) { return normalise(a.title).includes("sap"); });
      var resp2 = "<strong>SAP S/4HANA Transformation</strong><br>" + escapeHtml(sap.summary);
      if (sapBlogs.length) {
        resp2 += "<br><br><strong>Blog-Beiträge:</strong><br>";
        sapBlogs.forEach(function (b) {
          resp2 += "• " + escapeHtml(b.title) + " (" + b.date + ")<br>";
        });
      }
      resp2 += "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com");
      return resp2;
    }

    // ── Change Management ──
    if (matchesAny(input, ["change management", "change", "veraenderung", "wandel", "organisationsentwicklung"])) {
      var cm = store.services.find(function (s) { return s.title.includes("Change"); });
      return (
        "<strong>Organisations- & Change Management</strong><br>" +
        escapeHtml(cm.summary) +
        "<br><br>Digitalisierungsprojekte gehen über Technik und IT hinaus – die gesamte Organisation und Fachabteilungen müssen einbezogen werden, mit Change, Kommunikation, Prozess-, Organisations- und Agilem Management." +
        "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com")
      );
    }

    // ── Digital Transformation ──
    if (matchesAny(input, ["digital", "transformation", "digitalisierung"])) {
      var dtBlog = store.blogArticles.find(function (a) { return normalise(a.title).includes("whitepaper"); });
      return (
        "<strong>Digitale Transformation mit mgm</strong><br>" +
        "mgm consulting partners ist eine Managementberatung für Digitalisierung und Transformation. " +
        "Wir arbeiten mit Business, Organisation und IT und befähigen sie, den notwendigen Wandel schnell, sicher und erfolgreich zu meistern." +
        "<br><br>Unser integrierter Beratungsansatz bringt die Perspektiven von Business, IT und Organisation zusammen – " +
        "wir helfen, gemeinsame Grundlagen zwischen IT und anderen Abteilungen zu finden." +
        (dtBlog ? "<br><br><strong>Aktuell:</strong> " + escapeHtml(dtBlog.title) + " – " + escapeHtml(dtBlog.summary) : "") +
        "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com")
      );
    }

    // ── KI / AI ──
    if (matchesAny(input, ["ki ", "kuenstliche intelligenz", "artificial intelligence", " ai ", "ai-", "ki-strategie"])) {
      var aiService = store.services.find(function (s) { return s.title.includes("KI"); });
      var aiBlog = store.blogArticles.find(function (a) { return normalise(a.title).includes("ki-strategie") || normalise(a.title).includes("ki strategie"); });
      return (
        "<strong>KI-Integration & Strategie</strong><br>" +
        escapeHtml(aiService.summary) +
        (aiBlog ? "<br><br><strong>Podcast:</strong> " + escapeHtml(aiBlog.title) + "<br>" + escapeHtml(aiBlog.summary) : "") +
        "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com")
      );
    }

    // ── Security / NIS2 / DORA ──
    if (matchesAny(input, ["sicherheit", "security", "nis2", "dora", "cyber", "penetration"])) {
      var secBlogs = store.blogArticles.filter(function (a) {
        var n = normalise(a.title);
        return n.includes("nis2") || n.includes("security") || n.includes("sicherheit") || n.includes("dora");
      });
      var secService = store.services.find(function (s) { return s.title.includes("Sicherheit"); });
      var resp3 = "<strong>IT-Sicherheit</strong><br>" + escapeHtml(secService.summary);
      if (secBlogs.length) {
        resp3 += "<br><br><strong>Aktuelle Insights:</strong><br>";
        secBlogs.forEach(function (b) {
          resp3 += "• " + escapeHtml(b.title) + " (" + b.date + ") – " + escapeHtml(b.summary) + "<br>";
        });
      }
      resp3 += "<br>" + sourceLink(store.sources.insightsBlog, "Insights Blog");
      return resp3;
    }

    // ── Blog / Insights ──
    if (matchesAny(input, ["blog", "insight", "artikel", "beitrag", "podcast", "news", "aktuell", "neuigkeit"])) {
      var recent = store.blogArticles.slice(0, 8);
      var resp4 = "<strong>Aktuelle Consulting-Insights:</strong><br><br>";
      recent.forEach(function (a) {
        resp4 += "• <strong>" + escapeHtml(a.title) + "</strong><br>" +
                 "  " + a.date + " · " + escapeHtml(a.author) + "<br>" +
                 "  " + escapeHtml(a.summary) + "<br><br>";
      });
      resp4 += sourceLink(store.sources.insightsBlog, "Alle Consulting-Artikel im Insights Blog");
      return resp4;
    }

    // ── Public Sector ──
    if (matchesAny(input, ["public sector", "oeffentlich", "verwaltung", "egovernment", "ozg", "sccon"])) {
      var psService = store.services.find(function (s) { return s.title.includes("Public"); });
      var psBlogs = store.blogArticles.filter(function (a) {
        var n = normalise(a.title);
        return n.includes("egovernment") || n.includes("smart country") || n.includes("sccon");
      });
      var resp5 = "<strong>Public Sector Consulting</strong><br>" + escapeHtml(psService.summary);
      if (psBlogs.length) {
        resp5 += "<br><br><strong>Aktuelle Beiträge:</strong><br>";
        psBlogs.forEach(function (b) {
          resp5 += "• " + escapeHtml(b.title) + " (" + b.date + ")<br>";
        });
      }
      resp5 += "<br>" + sourceLink(store.sources.insightsBlog, "Insights Blog");
      return resp5;
    }

    // ── Agile ──
    if (matchesAny(input, ["agil", "scrum", "flight level", "skaliert"])) {
      var agile = store.services.find(function (s) { return s.title.includes("Agilität"); });
      return (
        "<strong>Skalierte Agilität</strong><br>" +
        escapeHtml(agile.summary) +
        "<br><br>mgm präsentiert regelmäßig auf Events wie der TRANSFORM zu Themen wie Business Agility, Flight Levels und Change Management." +
        "<br>" + sourceLink(store.sources.mainWebsite, "mgm-cp.com")
      );
    }

    // ── Standorte / Kontakt ──
    if (matchesAny(input, ["standort", "kontakt", "adresse", "buero", "office", "wo ", "hamburg", "muenchen", "koeln", "salzburg"])) {
      var c2 = store.company;
      return (
        "<strong>Unsere Standorte:</strong><br><br>" +
        c2.offices.map(function (o) { return "• " + escapeHtml(o); }).join("<br>") +
        "<br><br>" + sourceLink(c2.url, "Kontakt auf mgm-cp.com")
      );
    }

    // ── Karriere / Jobs ──
    if (matchesAny(input, ["job", "karriere", "stell", "arbeit", "bewerb"])) {
      return (
        "Informationen zu offenen Stellen und Karrieremöglichkeiten bei mgm consulting partners finden Sie auf unserer Karriere-Seite." +
        "<br><br>" + sourceLink("https://www.mgm-cp.com/jobs.html", "Jobs bei mgm consulting partners")
      );
    }

    // ── Fallback ──
    return (
      "Vielen Dank für Ihre Frage! Zu diesem Thema kann ich Ihnen leider noch keine detaillierte Antwort geben. " +
      "Hier einige Vorschläge, wie ich Ihnen weiterhelfen kann:<br><br>" +
      "• Fragen Sie mich nach den <strong>Leistungen</strong> von mgm consulting partners<br>" +
      "• Erfahren Sie mehr über <strong>digitale Transformation</strong> oder <strong>Change Management</strong><br>" +
      "• Lesen Sie aktuelle <strong>Blog-Insights</strong> zu Consulting-Themen<br>" +
      "• Informieren Sie sich über <strong>KI-Strategie</strong>, <strong>SAP S/4HANA</strong> oder <strong>IT-Sicherheit</strong><br><br>" +
      "Oder besuchen Sie direkt:<br>" +
      sourceLink(store.sources.mainWebsite, "mgm-cp.com") + "<br>" +
      sourceLink(store.sources.insightsBlog, "Insights Blog: Consulting")
    );
  }

  // ── Chat interaction ─────────────────────────────

  function handleUserMessage(text) {
    addMessage(escapeHtml(text), "user");
    inputEl.value = "";
    showTyping();

    var delay = 400 + Math.random() * 600;
    setTimeout(function () {
      hideTyping();
      try {
        var response = findResponse(text);
        addMessage(response, "assistant");
      } catch (err) {
        console.error("Smart Content Hub error:", err);
        addMessage(
          "<strong>Debug-Info:</strong> " + escapeHtml(err.message) +
          "<br><br><em>Dieser Fehler wird nach dem Debugging entfernt.</em>",
          "assistant"
        );
      }
    }, delay);
  }

  // ── Event listeners ──────────────────────────────

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = inputEl.value.trim();
    if (!text) return;
    handleUserMessage(text);
  });

  // Topic chips
  document.querySelectorAll(".topic-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var query = this.getAttribute("data-query");
      if (query) handleUserMessage(query);
    });
  });

  // ── Welcome message ──────────────────────────────

  if (typeof CONTENT_STORE === "undefined") {
    addMessage(
      "<strong>Fehler:</strong> Die Wissensdatenbank (content-store.js) konnte nicht geladen werden. " +
      "Bitte laden Sie die Seite neu (Strg+Shift+R).",
      "assistant"
    );
  } else {
    addMessage(
      "Willkommen beim <strong>Smart Content Hub</strong> von mgm consulting partners!<br><br>" +
      "Ich bin Ihr KI-Assistent und beantworte Fragen zu unseren Leistungen, Kompetenzen und aktuellen Consulting-Insights.<br><br>" +
      "Wählen Sie ein Thema aus der Seitenleiste oder stellen Sie mir direkt eine Frage.",
      "assistant"
    );
  }
})();
