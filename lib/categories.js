const CATEGORIES = {
  boards: ["Gloss", "Texture/Alpine", "600mm tops", "900mm tops", "Granite", "Masonite"],
  hardware: [
    "Handles",
    "Screws",
    "Wall Claddings/Panels",
    "Loose Edgings",
    "Sinks",
    "Glues",
    "Silicones",
    "Hinges",
    "Runners",
    "Legs",
  ],
};

// Standard edging formats the Phase 2 quoting AI must map free-text onto.
// Superseded by the more precise long/short-count matrix in lib/cutlist.js
// (EDGING_OPTIONS) — kept here only so nothing else that imported this
// breaks; new code should use lib/cutlist.js instead.
const EDGING_FORMATS = [
  "1 long",
  "1 short",
  "1 long 1 short",
  "2 long 1 short",
  "2 long 2 short", // aka "all round" / "all around"
  "No Edging", // aka "None"
];

module.exports = { CATEGORIES, EDGING_FORMATS };
