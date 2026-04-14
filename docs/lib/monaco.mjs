// ─── Color Patterns ───────────────────────────────────────────────────────────

const NUM = String.raw`(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|turn|grad)?)`;
const NONE = String.raw`(?:none)`;
const COMP = `(?:${NUM}|${NONE})`;
const ALPHA = `(?:\\/\\s*${COMP})?`; // / <alpha>  (modern)
const LEGACY_ALPHA = `(?:,\\s*${COMP})?`; // , <alpha>  (legacy)

const COLOR_PATTERNS = [
  { re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/ },
  {
    re: new RegExp(
      String.raw`rgba?\(\s*${NUM}\s*,\s*${NUM}\s*,\s*${NUM}${LEGACY_ALPHA}\s*\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`rgba?\(\s*${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`hsla?\(\s*${NUM}\s*,\s*${NUM}\s*,\s*${NUM}${LEGACY_ALPHA}\s*\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`hsla?\(\s*${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`hwb\(\s*${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`(?:ok)?lab\(\s*${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`(?:ok)?lch\(\s*${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: new RegExp(
      String.raw`color\(\s*[-\w]+\s+${COMP}\s+${COMP}\s+${COMP}\s*${ALPHA}\)`,
      "i"
    ),
  },
  {
    re: /\b(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|transparent|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)\b/i,
  },
];

// ─── Color Conversion ─────────────────────────────────────────────────────────

/**
 * Converts any CSS color string to a Monaco IColor {red, green, blue, alpha},
 * all in the range [0, 1]. Returns null if the string is not a valid color.
 * Uses chroma.js for most formats; falls back to a canvas element for hwb()
 * and color() which chroma does not parse.
 * @param {string} cssString - The CSS color string to convert.
 * @returns {Object|null} The Monaco color object with red, green, blue, alpha properties, or null if invalid.
 */
export function cssToMonacoColor(cssString) {
  try {
    const c = chroma(cssString); // eslint-disable-line no-undef
    const [r, g, b, a] = c.rgba(false);
    return { red: r / 255, green: g / 255, blue: b / 255, alpha: a ?? 1 };
  } catch {
    return browserColorToMonaco(cssString);
  }
}

/**
 * Fallback function to convert CSS color strings using browser canvas context.
 * Used for formats not supported by chroma.js like hwb() and color().
 * @param {string} cssString - The CSS color string to convert.
 * @returns {Object|null} The Monaco color object or null if invalid.
 */
function browserColorToMonaco(cssString) {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = cssString;
    const [r, g, b, a] = chroma(ctx.fillStyle).rgba(false); // eslint-disable-line no-undef
    return { red: r / 255, green: g / 255, blue: b / 255, alpha: a ?? 1 };
  } catch {
    return null;
  }
}

// ─── Color Finder ─────────────────────────────────────────────────────────────

/**
 * Scans every line of the given Monaco model for known CSS color formats and
 * returns an array of { cssColor, monacoColor, className, range } objects.
 * This is the single source of truth shared by both the color provider and the
 * background decoration system.
 * @param {Object} model - The Monaco editor model to scan.
 * @returns {Array} Array of color match objects with cssColor, monacoColor, className, and range.
 */
export function findAllColors(model) {
  const results = [];
  const lines = model.getValue().split("\n");

  lines.forEach((line, i) => {
    // Only look for colors in the value part of a YAML key: value line.
    // This skips keys, comments, and bare scalars that are not values.
    const yamlValueMatch = line.match(/^[^:#]*:\s*("?)(.+?)\1\s*(?:#.*)?$/);
    if (!yamlValueMatch) return;

    // valueStart is the column offset where the value begins in the full line.
    const valueStart = line.indexOf(yamlValueMatch[2], line.indexOf(":") + 1);
    const valueText = yamlValueMatch[2];

    for (const { re } of COLOR_PATTERNS) {
      const globalRe = new RegExp(
        re.source,
        re.flags.includes("g") ? re.flags : re.flags + "g"
      );
      globalRe.lastIndex = 0;
      let match;
      while ((match = globalRe.exec(valueText)) !== null) {
        const cssColor = match[0];
        const monacoColor = cssToMonacoColor(cssColor);
        if (!monacoColor) continue;

        results.push({
          cssColor,
          monacoColor,
          className: "color-deco-" + cssColor.replace(/[^a-zA-Z0-9]/g, "_"),
          range: {
            startLineNumber: i + 1,
            startColumn: valueStart + match.index + 1,
            endLineNumber: i + 1,
            endColumn: valueStart + match.index + cssColor.length + 1,
          },
        });
      }
    }
  });

  return results;
}

// ─── Background Decorations ───────────────────────────────────────────────────

let _styleSheet = null;
let _decorationIds = [];

/**
 * Ensures a persistent <style> element exists for color decorations.
 * Creates and appends the style element to the document head if it doesn't exist.
 * @returns {CSSStyleSheet} The stylesheet object for adding CSS rules.
 */
function ensureStyleSheet() {
  if (_styleSheet) return _styleSheet;
  const style = document.createElement("style");
  style.id = "monaco-color-decorations";
  document.head.appendChild(style);
  _styleSheet = style.sheet;
  return _styleSheet;
}

/**
 * Injects per-color CSS rules into a persistent <style> element and applies
 * Monaco decorations that give each color token a matching background.
 * Existing decorations are atomically replaced on every call.
 * @param {Object} editor - The Monaco editor instance.
 * @param {Array} colorMatches - Array of color match objects from findAllColors.
 */
export function applyColorDecorations(editor, colorMatches) {
  const sheet = ensureStyleSheet();

  // Build a set of selectors already in the sheet to avoid duplicate rules.
  const existingSelectors = new Set(
    Array.from(sheet.cssRules).map((r) => r.selectorText)
  );

  for (const { cssColor, className } of colorMatches) {
    const selector = `.${className}`;
    if (existingSelectors.has(selector)) continue;

    // Pick a legible text color over the swatch.
    const luminance = cssToMonacoColor(cssColor)
      ? chroma(cssColor).luminance() // eslint-disable-line no-undef
      : 0.5;
    const textColor = luminance > 0.4 ? "#000" : "#fff";

    sheet.insertRule(
      `${selector} { background-color: ${cssColor}; color: ${textColor} !important; border-radius: 2px; }`,
      sheet.cssRules.length
    );
    existingSelectors.add(selector);
  }

  _decorationIds = editor.deltaDecorations(
    _decorationIds,
    colorMatches.map(({ range, className }) => ({
      range,
      options: {
        className, // keeps the background on the wrapper
        inlineClassName: className, // also applied to the mtk span — color wins here
        inlineClassNameAffectsLetterSpacing: false,
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }))
  );
}

// ─── Color Provider ───────────────────────────────────────────────────────────

/**
 * Registers Monaco's built-in color picker for the 'yaml' language.
 * provideDocumentColors reuses findAllColors so the picker and the background
 * decorations are always driven by the same regex logic.
 */
export function registerYamlColorProvider() {
  monaco.languages.registerColorProvider("yaml", {
    // eslint-disable-line no-undef
    provideDocumentColors(model) {
      return findAllColors(model).map(({ range, monacoColor }) => ({
        range,
        color: monacoColor,
      }));
    },

    provideColorPresentations(model, colorInfo) {
      const { red, green, blue, alpha } = colorInfo.color;
      const toHex = (v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0");
      const hex = `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
      const label =
        alpha < 1
          ? `rgba(${Math.round(red * 255)} ${Math.round(
              green * 255
            )} ${Math.round(blue * 255)} / ${alpha})`
          : hex;
      return [{ label }];
    },
  });
}

// ─── Editor Factory ───────────────────────────────────────────────────────────

/**
 * Creates and fully configures the Monaco editor.
 * Call this after monacoYaml.configureMonacoYaml() and registerYamlColorProvider().
 *
 * @param {HTMLElement} container  - Element to mount the editor into.
 * @param {string}      initialValue - Initial YAML content.
 * @returns {monaco.editor.IStandaloneCodeEditor}
 */
export function createEditor(container, initialValue = "") {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  const editor = monaco.editor.create(container, {
    // eslint-disable-line no-undef
    automaticLayout: true,
    fixedOverflowWidgets: true,
    model: monaco.editor.createModel(
      // eslint-disable-line no-undef
      initialValue,
      "yaml",
      monaco.Uri.parse("file:///groups.yaml") // eslint-disable-line no-undef
    ),
    minimap: { enabled: false },
    wordWrap: "on",
    tabSize: 2,
    colorDecorators: true,
    formatOnType: true,
    formatOnPaste: true,
    theme: prefersDark.matches ? "vs-dark" : "vs",
  });

  // Keep theme in sync if the OS preference changes while the page is open.
  prefersDark.addEventListener("change", (e) => {
    monaco.editor.setTheme(e.matches ? "vs-dark" : "vs"); // eslint-disable-line no-undef
  });

  // Wire up background color decorations: run once, then on every edit.
  const update = () =>
    applyColorDecorations(editor, findAllColors(editor.getModel()));
  update();
  editor.onDidChangeModelContent(update);

  return editor;
}
