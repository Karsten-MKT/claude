/**
 * Content Store – Knowledge base sourced from:
 *   1. https://www.mgm-cp.com/ (alle Unterseiten)
 *   2. https://insights.mgm-tp.com/de/category/consulting-de/
 *
 * This store provides the content that the AI chat assistant
 * uses to answer visitor questions. In a production setup this
 * would be replaced by a vector-search / RAG backend.
 */

const CONTENT_STORE = {

  /* ──────────────────────────────────────
     Company overview (mgm-cp.com)
     ────────────────────────────────────── */
  company: {
    name: "mgm consulting partners",
    legalName: "mgm consulting partners GmbH",
    tagline: "Innovation Implemented.",
    heroStatement: "Digitalisierung ist der Game Changer und wir sind die Change Maker",
    founded: 2005,
    headcount: "85+",
    headquarters: "Holländischer Brook 2, 20457 Hamburg",
    offices: [
      "Hamburg (Holländischer Brook 2)",
      "München (Taunusstraße 23)",
      "Köln (Hohenstaufenring 32)",
      "Salzburg (mgm consulting partners austria GmbH)"
    ],
    parentCompany: "mgm technology partners GmbH (gegründet 1994, 1.000+ Mitarbeitende, 19 Standorte weltweit)",
    sisterCompanies: [
      "mgm integration partners – Prozessoptimierung in SAP-Umgebungen",
      "mgm security partners – IT-Sicherheitsanalysen & Penetrationstests"
    ],
    values: "Professionalität, Integrität, Offenheit",
    description:
      "mgm consulting partners ist eine Managementberatung für Digitalisierung und Transformation. " +
      "Wir arbeiten mit Ihrem Business, der Organisation und IT und befähigen sie, den notwendigen Wandel " +
      "schnell, sicher und erfolgreich zu meistern. Unser integrierter Beratungsansatz bringt die " +
      "Perspektiven von Business, IT und Organisation zusammen.",
    url: "https://www.mgm-cp.com/"
  },

  /* ──────────────────────────────────────
     Services / Leistungen
     ────────────────────────────────────── */
  services: [
    {
      title: "Digital Consulting",
      summary: "Begleitung und Unterstützung von Organisationen auf dem Weg zur erfolgreichen Digitalisierung – mit maßgeschneiderten Lösungen und umfassender Beratung.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "CIO Advisory",
      summary: "Strategische Beratung für CIOs und IT-Entscheider. Wir helfen, IT-Strategien an Geschäftszielen auszurichten und IT als Treiber der digitalen Transformation zu positionieren.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Organisations- & Change Management",
      summary: "Organisatorische Neuausrichtungen begleiten, Mitarbeitende auf Veränderungen vorbereiten und eine offene Unternehmenskultur fördern – mit Change, Kommunikation, Prozess- und Agilem Management.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "SAP S/4HANA Transformation",
      summary: "Ganzheitliche Betrachtung der S/4HANA-Transformation – Business, IT und Organisation. Fünf kritische Erfolgsfaktoren für eine gelungene Implementierung.",
      url: "https://www.mgm-cp.com/software-product-consulting-und-it-management.html"
    },
    {
      title: "Business Transformation",
      summary: "Beratung zur strategischen Neuausrichtung und Transformation von Geschäftsmodellen im Kontext der Digitalisierung.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Program Management",
      summary: "Steuerung komplexer Transformationsprogramme mit klarer Struktur, transparenter Governance und professionellem Stakeholder-Management.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "KI-Integration & Strategie",
      summary: "Von der ersten Idee bis zur skalierbaren KI-Integration – wir helfen Unternehmen, Künstliche Intelligenz strategisch und operativ einzusetzen.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Merger & Carve-Out Management",
      summary: "Unterstützung bei M&A-Transaktionen mit Fokus auf maximale IT-Flexibilität und organisatorische Integration.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Process Mining & Management",
      summary: "Analyse und Optimierung von Geschäftsprozessen durch datengetriebene Methoden und Process Mining.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Skalierte Agilität",
      summary: "Einführung und Skalierung agiler Methoden in großen Organisationen für mehr Flexibilität und Innovationskraft.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "IT-Sicherheit (mit mgm security partners)",
      summary: "Mehr als 20 Jahre Erfahrung in Sicherheitsanalysen und Penetrationstests. Umfassende IT-Sicherheitsberatung.",
      url: "https://www.mgm-cp.com/"
    },
    {
      title: "Public Sector Consulting",
      summary: "Digitalisierung der öffentlichen Verwaltung – strategische Beratung, Change Management, IT-Koordination und Rollout für nachhaltige Strukturen.",
      url: "https://www.mgm-cp.com/"
    }
  ],

  /* ──────────────────────────────────────
     Specialties / Schwerpunkte
     ────────────────────────────────────── */
  specialties: [
    "Business Transformation",
    "Sourcing Advisory",
    "Business Intelligence",
    "Data Warehouse",
    "Program Management",
    "Change Management",
    "Digital Business Consulting",
    "CIO Advisory",
    "Agile",
    "Enterprise Software Consulting",
    "SAP S/4HANA Transformation",
    "Merger & Carve-Out Management",
    "Process Management",
    "Process Mining",
    "Digitalisierung",
    "Skalierte Agilität",
    "KI-Strategie"
  ],

  /* ──────────────────────────────────────
     Blog articles (insights.mgm-tp.com/de/category/consulting-de/)
     ────────────────────────────────────── */
  blogArticles: [
    {
      title: "mgm auf der TRANSFORM 2025: Business Transformation, Change Management, KI, Security & Low Code",
      date: "2025-02-19",
      author: "Karsten Kneese",
      summary: "Auf der TRANSFORM am 19. & 20. März 2025 in Berlin präsentierte mgm Lösungen zu Business Transformation, Change Management, KI, Security und Low Code.",
      url: "https://insights.mgm-tp.com/de/2025/consulting-de/mgm-auf-der-transform-2025-business-transformation-change-management-ki-low-code/"
    },
    {
      title: "Podcast: KI-Strategie – Was braucht es, damit KI echten strategischen Nutzen bringt?",
      date: "2025-01-20",
      author: "Karsten Kneese",
      summary: "Antje von Garrel und Jan Jikeli diskutieren, was nötig ist, damit KI echte strategische und operative Ergebnisse liefert. KI als integraler Bestandteil von Strategie, Prozessen, Infrastruktur und Kultur.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "Podcast: Transformation der Lother Group",
      date: "2025-02-18",
      author: "Karsten Kneese",
      summary: "Dirk Wullenweber von der Lother Group berichtet, wie die Unternehmenstransformation gemeinsam mit mgm consulting partners vorangetrieben wurde.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "NIS2-Richtlinie & Cyber Security",
      date: "2025-10-10",
      author: "Erik Schilling",
      summary: "Die NIS2-Richtlinie der EU erhöht die Anforderungen an Cyber- und Informationssicherheit erheblich. Der mgm NIS2 Check hilft Organisationen, ihren Compliance-Status zu bewerten.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "IT-Strategie trifft Business-Ziele (Teil 1): Warum Business-IT-Alignment oft scheitert",
      date: "2025-10-09",
      author: "Olaf Terhorst",
      summary: "Erster Teil einer Serie zur IT-Strategie: Warum 'Business-IT-Alignment' in der Praxis oft an strukturellen Gr\u00e4ben und kulturellen Unterschieden scheitert.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "IT-Strategie trifft Business-Ziele (Teil 2): Frühe Verschmelzung von IT und Business",
      date: "2025-10-16",
      author: "Olaf Terhorst",
      summary: "Organisationen, die IT und Business frühzeitig strukturell zusammenführen, profitieren von schnellerer Innovation, stärkerer Kundenorientierung und resilienteren Geschäftsmodellen.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "IT-Strategie trifft Business-Ziele (Teil 3): Co-Creation und Technologie-Architektur",
      date: "2025-10-23",
      author: "Olaf Terhorst",
      summary: "Wie Co-Creation die technologische Architektur und das organisatorische Design eines Unternehmens beeinflusst.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "eGovernment Award: mgm zum fünften Mal in Folge ausgezeichnet",
      date: "2025-09-26",
      author: "Karsten Kneese",
      summary: "mgm wurde zum fünften Mal in Folge mit dem eGovernment Readers' Choice Platinum Award in der Kategorie 'Berater' ausgezeichnet.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "Whitepaper: Digitale Transformation im Mittelstand",
      date: "2025-09-25",
      author: "Thomas Brugger",
      summary: "Ein neues Whitepaper von mgm consulting partners zeigt, wie mittelständische Unternehmen etablierte Strukturen transformieren können – Digitalisierung als strategischer Hebel für nachhaltiges Wachstum.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "DSAG Jahreskongress 2025",
      date: "2025-09-16",
      author: "Karsten Kneese",
      summary: "Bericht vom Jahreskongress der SAP-Community in Bremen unter dem Motto 'Die Kunst der Balance'.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "Smart Country Convention (SCCON) 2025",
      date: "2025-09-24",
      author: "Karsten Kneese",
      summary: "Roland Kreutzer, Leiter Public Sector Consulting bei mgm, und Kollegen demonstrierten auf der SCCON die Arbeit des NEGZ-Kompetenznetzwerks.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "SAP S/4HANA Implementierung: 5 kritische Erfolgsfaktoren",
      date: "2024-05-30",
      author: "Ariane Hager",
      summary: "Wettbewerbsfähig bleiben erfordert kontinuierliche Optimierung der Geschäftsprozesse. Fünf kritische Erfolgsfaktoren für die SAP S/4HANA Implementierung.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "mgm consulting partners erweitert Geschäftsführung",
      date: "2024-04-12",
      author: "Karsten Kneese",
      summary: "mgm consulting partners erweiterte das Management-Team um drei erfahrene Berater: Antje von Garrel, Merle Best und Roman Schleicher.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "DORA-Webinar: Regulierung effizient in den Arbeitsalltag integrieren",
      date: "2024-10-30",
      author: "Karsten Kneese",
      summary: "Ein Webinar, das zeigt, wie DORA-Regulierungen effizient und automatisiert in den täglichen Workflow integriert werden können.",
      url: "https://insights.mgm-tp.com/de/category/consulting-de/"
    },
    {
      title: "Business Agility, Change Management und Low Code: mgm auf der TRANSFORM 2024",
      date: "2024-02-19",
      author: "Karsten Kneese",
      summary: "mgm präsentierte auf der Bitkom B2B-Veranstaltung TRANSFORM in Berlin Lösungen zu Business Agility, Flight Levels, Change Management und Low Code.",
      url: "https://insights.mgm-tp.com/de/2024/consulting/business-agility-change-management-and-low-code-mgm-at-transform-2024/"
    },
    {
      title: "mgm consulting partners Salzburg treibt digitale Transformation in Österreich",
      date: "2024-03-15",
      author: "mgm consulting partners",
      summary: "Die 2020 gegründete mgm consulting partners austria GmbH in Salzburg begleitet österreichische Unternehmen bei der digitalen Transformation – Technik allein reicht nicht, die gesamte Organisation muss einbezogen werden.",
      url: "https://insights.mgm-tp.com/de/digitale-transformation-fuer-oesterreich-mgm-consulting-partners-in-salzburg/"
    }
  ],

  /* ──────────────────────────────────────
     Source URLs for reference
     ────────────────────────────────────── */
  sources: {
    mainWebsite: "https://www.mgm-cp.com/",
    insightsBlog: "https://insights.mgm-tp.com/de/category/consulting-de/",
    parentWebsite: "https://www.mgm-tp.com/",
    linkedin: "https://www.linkedin.com/company/mgm-consulting-partners-gmbh"
  }
};
