import { cyanBright } from "yoctocolors";
/* @see https://unpkg.com/js-yaml@4.1.1/dist/js-yaml.min.js */
import yaml from "./docs/lib/js-yaml.mjs";
import chroma from "chroma-js";
globalThis.chroma = chroma;
const lib = await import("./index.js");

const data = `Sample:
  Students: "#FFEBC0"
  Employees: "#80C6FF"
  Externals: "#FABBC3"
  Faculties: "#498205"
  Divisions: "#005E50"
  Others: "#C3F8F9"

Tests:
  cyan: "#00ffFF"
  Teal: "hsl(184 100% 60%)"
  IndianRed: IndianRed
  paleTurquoise: #AFEEEE
  LightPink: "rgb(255, 182, 193)"
  Bisque: "#FFE4C4BF"
  LightSlateGray: 778899
  blank: ""`;

let yamlContent;
try {
  yamlContent = yaml.load(data);
  console.debug("YAML is valid, continuing ...");
} catch (e) {
  console.error(`${e.name}: ${e.reason}`);
}
console.log(cyanBright("YAML"));
console.log(yamlContent);

const colors = lib.expandYAMLData(yamlContent);
console.log(cyanBright("Table DAX"));
console.log(lib.generateColorMapDAX(colors));
console.log(cyanBright("TDML DAX"));
console.log(lib.generateColorMeasuresDAX(colors));
console.log(cyanBright("JSON"));
console.log(JSON.stringify(colors, null, 2));
