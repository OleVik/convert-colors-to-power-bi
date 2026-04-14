const chroma = globalThis.chroma;

export const colorRegex = /#([0-9A-Fa-f]{3}){1,2}\b|#([0-9A-Fa-f]{4}){1,2}\b/g;
export const defaultTextColor = "#000000";
export const defaultAltTextColor = "#FFFFFF";

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
 * Adjusts a background color to ensure sufficient contrast with black text.
 * @param {string} bgColor - The background color string.
 * @param {number} minContrast - The minimum contrast ratio required.
 * @returns {string} The adjusted color string.
 */
export function fitToBlackText(bgColor = "", minContrast = 7) {
  if (!bgColor) return bgColor;
  let color = chroma(bgColor);
  while (chroma.contrast(color, defaultTextColor) < minContrast) {
    color = color.brighten(0.5);
  }
  return color.hex("rgb");
}

/**
 * Gets a foreground color that meets accessibility standards for a given background.
 * @param {string} bgColor - The background color string.
 * @param {number} minContrast - The minimum contrast ratio required.
 * @returns {Object} An object with background and foreground color strings.
 */
export function getAccessibleColor(bgColor = "", minContrast = 4.5) {
  if (!bgColor)
    return {
      background: bgColor,
      foreground: defaultTextColor,
    };
  if (!colorRegex.test(bgColor) && chroma.valid(bgColor))
    return {
      background: chroma(bgColor).hex("rgb"),
      foreground: defaultTextColor,
    };
  const black = defaultTextColor;
  const white = defaultAltTextColor;
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
    foreground: foreground,
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
  options = { name: "ColorMap", indent: "  " }
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
  }
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
 * @returns {Object} The expanded data object.
 */
export function expandYAMLData(data) {
  Object.entries(data).forEach(([category, items]) => {
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
      data[category][name] = {
        Base: baseColor,
        Background: fitToBlackText(color).toUpperCase(),
        AltBackground: getAccessibleColor(color).background.toUpperCase(),
        AltForeground: getAccessibleColor(color).foreground.toUpperCase(),
      };
    });
  });
  return data;
}
