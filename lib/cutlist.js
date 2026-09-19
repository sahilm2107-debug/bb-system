// ---------------------------------------------------------------------
// Cutlist automation — fundamentals only.
//
// This file is deliberately built as a set of small, swappable pieces
// so that when the real AI/NLU spec is ready (voice transcription,
// South African language/slang handling, actual Cutlist software import
// format), only `parseCutlistText()` and `buildCutlistCsv()` need to
// change — the data model, API routes, and Automation-page workflow
// around them stay the same.
// ---------------------------------------------------------------------

const { CATEGORIES } = require("./categories");

// The exact edging combinations requested, keyed by (longCount, shortCount).
// "All Around" / "All Round" is just the 2-long-2-short case; "No Edging"
// is the 0-long-0-short case, kept from the original brief so the option
// still exists even though it wasn't in the latest list.
//
// Ordered longest-label-first is NOT required here — parseCutlistText
// sorts its own working copy before matching, so a segment like
// "2 long 2 short" can't accidentally match the shorter "2 Long" entry
// first. Keep this array in whatever order reads best for the UI.
const EDGING_OPTIONS = [
  { longCount: 1, shortCount: 0, label: "1 Long" },
  { longCount: 1, shortCount: 1, label: "1 Long 1 Short" },
  { longCount: 2, shortCount: 0, label: "2 Long" },
  { longCount: 2, shortCount: 1, label: "2 Long 1 Short" },
  { longCount: 0, shortCount: 1, label: "1 Short" },
  { longCount: 0, shortCount: 2, label: "2 Short" },
  { longCount: 2, shortCount: 2, label: "2 Long 2 Short", aliases: ["All Around", "All Round"] },
  { longCount: 0, shortCount: 0, label: "No Edging", aliases: ["None", "No Edge"] },
];

// Material keywords the parser can recognize inside a segment, drawn
// from the real Boards categories so a detected material lines up with
// something that actually exists in Inventory.
const MATERIAL_KEYWORDS = CATEGORIES.boards;

function edgingLabel(longCount, shortCount) {
  const match = EDGING_OPTIONS.find((o) => o.longCount === longCount && o.shortCount === shortCount);
  if (match) return match.label;
  // Falls back to a generic label for any combination outside the
  // standard set (e.g. if a customer asks for something unusual) —
  // this keeps the system from breaking on input it doesn't recognize,
  // it just won't match a "standard" button in the UI.
  return `${longCount} Long ${shortCount} Short`;
}

// Matches every edging phrase/alias in the given text, longest phrase
// first, so "2 Long 2 Short" is found before the shorter "2 Long" entry
// that would otherwise match as a substring.
const EDGING_BY_LENGTH = [...EDGING_OPTIONS].sort(
  (a, b) => b.label.length - a.label.length
);

function findEdging(text) {
  const lower = text.toLowerCase();
  for (const option of EDGING_BY_LENGTH) {
    if (lower.includes(option.label.toLowerCase())) return option;
    if ((option.aliases || []).some((alias) => lower.includes(alias.toLowerCase()))) return option;
  }
  return null;
}

function findMaterial(text) {
  const lower = text.toLowerCase();
  return MATERIAL_KEYWORDS.find((m) => lower.includes(m.toLowerCase())) || null;
}

// A board dimension outside this range almost certainly isn't a board
// dimension — it's a phone number fragment, an order number, a date, a
// price, etc. Keeps the size pattern from firing on unrelated digits.
const MIN_DIMENSION_MM = 10;
const MAX_DIMENSION_MM = 6000;

// (qty x )? length x width (x thickness)?  — each number may have a
// decimal point and an optional trailing "mm"; "x" may also be "×" or "*".
const SIZE_PATTERN =
  /(?:(\d+)\s*[x×*]\s*)?(\d+(?:\.\d+)?)\s*(?:mm)?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:mm)?(?:\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:mm)?)?/i;
const QTY_WORD_PATTERN = /(\d+)\s*(?:pieces?|pcs?|off)\b/i;

// Splits a message into one chunk per requested item, so each item gets
// its own quantity, size, edging and material read independently instead
// of one edging phrase being applied to every size found in the message.
function splitIntoSegments(rawText) {
  return rawText
    .split(/,|;|\n|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Small, intentionally naive first pass at reading a cutlist request out
// of free text — it does NOT do voice transcription or slang/carpentry
// language understanding, which is what the full Phase 2 spec calls for.
// It exists so the rest of the pipeline (confirmation queue, CSV export)
// has something real to run against while the actual parsing logic is
// designed around the specifics you provide. Confidence is deliberately
// capped low, which is what routes every request to the human
// confirmation queue for now regardless of how clean the input was.
function parseCutlistText(rawText) {
  const segments = splitIntoSegments(rawText);
  const items = [];
  let matchedSegments = 0;

  segments.forEach((segment) => {
    const sizeMatch = segment.match(SIZE_PATTERN);
    if (!sizeMatch) return;

    const [, leadingQty, a, b, thicknessRaw] = sizeMatch;
    const length = parseFloat(a);
    const width = parseFloat(b);

    // Sanity check: reject anything that isn't a plausible board size in
    // mm, so stray numbers elsewhere in the message (phone numbers,
    // dates, order numbers) can't be misread as a dimension.
    if (
      !Number.isFinite(length) ||
      !Number.isFinite(width) ||
      length < MIN_DIMENSION_MM ||
      length > MAX_DIMENSION_MM ||
      width < MIN_DIMENSION_MM ||
      width > MAX_DIMENSION_MM
    ) {
      return;
    }

    let quantity = 1;
    if (leadingQty) {
      quantity = parseInt(leadingQty, 10);
    } else {
      const qtyWordMatch = segment.match(QTY_WORD_PATTERN);
      if (qtyWordMatch) quantity = parseInt(qtyWordMatch[1], 10);
    }
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;

    const edging = findEdging(segment);
    const material = findMaterial(segment);

    items.push({
      quantity,
      lengthMm: length,
      widthMm: width,
      thicknessMm: thicknessRaw ? parseFloat(thicknessRaw) : null,
      material,
      edgingLongCount: edging ? edging.longCount : 0,
      edgingShortCount: edging ? edging.shortCount : 0,
      edgingLabel: edging ? edging.label : "No Edging",
      notes: edging ? null : "Edging not mentioned — defaulted to No Edging, please verify.",
    });

    matchedSegments++;
  });

  // Confidence reflects how many of the message's segments actually
  // produced a usable item, capped well below any reasonable
  // auto-send threshold. Every request still lands in the human
  // confirmation queue on the Automation page — this number is a
  // diagnostic for the admin reviewing it, not a decision-maker.
  const rawConfidence = segments.length > 0 ? matchedSegments / segments.length : 0;
  const confidence = items.length > 0 ? Math.min(rawConfidence, 0.6) : 0;

  return { items, confidence };
}

// Builds the CSV handed off to the Cutlist software. Column layout is a
// reasonable placeholder — swap it for whatever Cutlist's actual import
// format needs once that's confirmed.
function buildCutlistCsv(cutlistRequest) {
  const header = [
    "Item",
    "Quantity",
    "Length_mm",
    "Width_mm",
    "Thickness_mm",
    "Material",
    "Edging_Long",
    "Edging_Short",
    "Edging_Label",
    "Notes",
  ];
  const rows = cutlistRequest.items.map((item, i) => [
    i + 1,
    item.quantity,
    item.lengthMm,
    item.widthMm,
    item.thicknessMm ?? "",
    item.material ?? "",
    item.edgingLongCount,
    item.edgingShortCount,
    item.edgingLabel ?? edgingLabel(item.edgingLongCount, item.edgingShortCount),
    (item.notes ?? "").replace(/,/g, ";"),
  ]);

  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

module.exports = { EDGING_OPTIONS, edgingLabel, parseCutlistText, buildCutlistCsv };
