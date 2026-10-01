const chroma = globalThis.chroma;

export const colorRegex = /#([0-9A-Fa-f]{3}){1,2}\b|#([0-9A-Fa-f]{4}){1,2}\b/g;
export const defaultTextColor = "#000000";
export const defaultAltTextColor = "#FFFFFF";

/**
 * Parses YAML top-level settings to override default contrast values.
 * @param {Object} data - The YAML data object.
 * @returns {Object} The parsed settings.
 */
export function parseYamlSettings(data = {}) {
  const settings = {
    textColor: defaultTextColor,
    altTextColor: defaultAltTextColor,
    minContrast: 4.1,
  };

  if (!data || typeof data !== "object") return settings;

  const parseColor = (value, fallback) => {
    if (typeof value !== "string" || !value.trim()) return fallback;
    try {
      return chroma(value).hex("rgb");
    } catch {
      return fallback;
    }
  };

  settings.textColor = parseColor(data.textColor, defaultTextColor);
  settings.altTextColor = parseColor(data.altTextColor, defaultAltTextColor);

  const rawMinContrast = Number(data.minContrast);
  if (Number.isFinite(rawMinContrast)) {
    if (rawMinContrast <= 0) {
      settings.minContrast = 1;
    } else if (rawMinContrast > 21) {
      settings.minContrast = 21;
    } else {
      settings.minContrast = rawMinContrast;
    }
  }

  return settings;
}

/**
 * Debounces a function to limit how often it can be called.
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Highlights Prism colors in code blocks and applies background colors to hex color strings.
 */
export function highlightPrismColors() {
  document.querySelectorAll("pre code").forEach((el) => {
    Prism.highlightElement(el);
    el.querySelectorAll("span.token.string").forEach((span) => {
      const match = span.textContent.match(/^"(#[0-9A-Fa-f]{6})"$/);
      if (match) {
        const hex = match[1];
        span.style.backgroundColor = hex;
        span.style.color =
          chroma.contrast(hex, defaultTextColor) > 4.5
            ? defaultTextColor
            : defaultAltTextColor;
        span.style.borderRadius = "3px";
        span.style.padding = "0 2px";
      }
    });
  });
}

/**
 * Inverts a hex color to ensure readable text.
 * @param {string} hex - The hex color string to invert.
 * @returns {string} The inverted hex color.
 * @see https://stackblitz.com/edit/monaco-editor-hex-color-higlight-decorator-example
 */
export const invertColor = (hex) => {
  const c = hex.replace("#", ""),
    r = parseInt(c.substring(0, 2), 16),
    g = parseInt(c.substring(2, 4), 16),
    b = parseInt(c.substring(4, 6), 16);
  const invertedR = (255 - r).toString(16).padStart(2, "0"),
    invertedG = (255 - g).toString(16).padStart(2, "0"),
    invertedB = (255 - b).toString(16).padStart(2, "0");
  return `#${invertedR}${invertedG}${invertedB}`;
};

/**
 * Adjusts a background color to ensure sufficient contrast with the configured text color.
 * @param {string} bgColor - The background color string.
 * @param {number} minContrast - The minimum contrast ratio required.
 * @param {string} textColor - The text color to compare against.
 * @returns {string} The adjusted color string.
 */
export function fitToBlackText(
  bgColor = "",
  minContrast = 7,
  textColor = defaultTextColor,
) {
  if (!bgColor) return bgColor;
  let color = chroma(bgColor);
  while (chroma.contrast(color, textColor) < minContrast) {
    color = color.brighten(0.5);
  }
  return color.hex("rgb");
}

/**
 * Gets a foreground color that meets accessibility standards for a given background.
 * @param {string} bgColor - The background color string.
 * @param {Object} options - Options for foreground selection.
 * @param {string} options.textColor - The primary text color.
 * @param {string} options.altTextColor - The alternative text color.
 * @param {number} options.minContrast - The minimum contrast ratio required.
 * @returns {Object} An object with background and foreground color strings.
 */
export function getAccessibleColor(
  bgColor = "",
  options = {
    textColor: defaultTextColor,
    altTextColor: defaultAltTextColor,
    minContrast: 4.5,
  },
) {
  const {
    textColor = defaultTextColor,
    altTextColor = defaultAltTextColor,
    minContrast = 4.5,
  } = options;

  if (!bgColor)
    return {
      background: bgColor,
      foreground: textColor,
    };

  if (!colorRegex.test(bgColor) && chroma.valid(bgColor))
    return {
      background: chroma(bgColor).hex("rgb"),
      foreground: textColor,
    };

  const black = textColor;
  const white = altTextColor;
  const minContrastRatio = minContrast;
  let color = chroma(bgColor);
  const contrastWithBlack = chroma.contrast(color, black);
  const contrastWithWhite = chroma.contrast(color, white);
  const foreground = contrastWithWhite > contrastWithBlack ? white : black;
  let brightness = 0;

  while (
    chroma.contrast(color, foreground) < minContrastRatio &&
    brightness < 1
  ) {
    brightness += 0.05;
    color = chroma(bgColor).brighten(brightness);
  }

  return {
    background: color.hex("rgb"),
    foreground,
  };
}

/**
 * Generates DAX code for a color map data table.
 * @param {Object} data - The color data object.
 * @param {Object} options - Options for the DAX code generation.
 * @param {string} options.name - The name of the data table.
 * @param {string} options.indent - The indentation string.
 * @returns {string} The generated DAX code.
 */
export function generateColorMapDAX(
  data,
  options = { name: "ColorMap", indent: "  " },
) {
  let daxCode = `${options.name} = DATATABLE(\n`;
  daxCode += `${options.indent}"Category", STRING,\n`;
  daxCode += `${options.indent}"Name", STRING,\n`;
  daxCode += `${options.indent}"Base", STRING,\n`;
  daxCode += `${options.indent}"Background", STRING,\n`;
  daxCode += `${options.indent}"AltBackground", STRING,\n`;
  daxCode += `${options.indent}"AltForeground", STRING,\n`;
  daxCode += `${options.indent}{\n`;
  const rows = [];
  for (const [category, items] of Object.entries(data)) {
    for (const [itemName, colors] of Object.entries(items)) {
      const row = `${options.indent}${options.indent}{"${category}", "${itemName}", "${colors.Base}", "${colors.Background}", "${colors.AltBackground}", "${colors.AltForeground}"}`;
      rows.push(row);
    }
  }
  daxCode += rows.join(",\n");
  daxCode += `\n${options.indent}}\n)`;
  return daxCode;
}

/**
 * Generates DAX code for color measures.
 * @param {Object} data - The color data object.
 * @param {Object} options - Options for the DAX code generation.
 * @param {string} options.name - The name of the color map table.
 * @param {string} options.lookupTable - The name of the lookup table.
 * @returns {string} The generated DAX measures code.
 */
export function generateColorMeasuresDAX(
  data,
  options = {
    name: "ColorMap",
    lookupTable: "TableName",
  },
) {
  let measuresCode = "";
  for (const category of Object.keys(data)) {
    measuresCode += `measure 'Color ${category}' = LOOKUPVALUE(${options.name}[Background], ${options.name}[Category], "${category}", ${options.name}[Name], SELECTEDVALUE(${options.lookupTable}[${category}]), "${defaultAltTextColor}")\n`;
  }
  return measuresCode;
}

/**
 * Expands YAML color data by processing colors and generating variants.
 * @param {Object} data - The YAML data object to expand.
 * @param {Object} settings - Contrast settings from YAML.
 * @param {string} settings.textColor - The primary text color.
 * @param {string} settings.altTextColor - The alternative text color.
 * @param {number} settings.minContrast - The minimum contrast ratio.
 * @returns {Object} The expanded data object.
 */
export function expandYAMLData(data, settings = {}) {
  const resolvedSettings = {
    textColor: defaultTextColor,
    altTextColor: defaultAltTextColor,
    minContrast: 7,
    ...settings,
  };

  const reservedKeys = new Set(["textColor", "altTextColor", "minContrast"]);
  const expandedData = {};

  Object.entries(data).forEach(([category, items]) => {
    if (
      reservedKeys.has(category) ||
      !items ||
      typeof items !== "object" ||
      Array.isArray(items)
    ) {
      return;
    }

    expandedData[category] = {};

    Object.entries(items).forEach(([name, color]) => {
      const baseColor = color;
      if (!color) color = "";
      if (!colorRegex.test(color)) {
        try {
          color = chroma(baseColor).hex("rgb");
        } catch (e) {
          console.warn("Invalid color format:", baseColor);
          color = "";
        }
      }

      expandedData[category][name] = {
        Base: baseColor,
        Background: fitToBlackText(
          color,
          resolvedSettings.minContrast,
          resolvedSettings.textColor,
        ).toUpperCase(),
        AltBackground: getAccessibleColor(
          color,
          resolvedSettings,
        ).background.toUpperCase(),
        AltForeground: getAccessibleColor(
          color,
          resolvedSettings,
        ).foreground.toUpperCase(),
      };
    });
  });

  return expandedData;
}
