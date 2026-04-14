# Convert Colors To Power BI

A browser-based tool that takes YAML color definitions and outputs ready-to-use DAX code for Power BI reports.

## Features

- **YAML Editor** — Monaco-powered editor with syntax highlighting, validation, and inline color previews
- **Accessible colors** — Every `Background` color is automatically brightened to meet WCAG 2.1 AAA contrast (7:1 against black); an `AltBackground`/`AltForeground` pair is also derived for flexible use
- **DAX output** — Generates both a `DATATABLE` definition (Table DAX) and `LOOKUPVALUE` measure stubs (TMDL DAX), ready to paste into Power BI Desktop or a TMDL workspace
- **JSON output** — Expanded color map for use in other tooling or documentation
- **Persistent state** — Editor content is saved to `localStorage` and restored on reload
- **Dark/light theme** — Follows your system color scheme preference

---

## Supported Color Formats

Input colors in the YAML editor can be any format supported by [chroma-js](https://gka.github.io/chroma.js/):

| Format              | Example                |
| ------------------- | ---------------------- |
| 6-digit hex         | `"#FFEBC0"`            |
| 3-digit hex         | `#FFF`                 |
| 8-digit hex (alpha) | `"#FFE4C4BF"`          |
| RGB                 | `"rgb(255, 182, 193)"` |
| HSL                 | `"hsl(184 100% 60%)"`  |
| CSS named color     | `IndianRed`            |
| Raw integer         | `778899`               |

---

## Output Fields

Each color entry is expanded into four fields:

| Field           | Description                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| `Base`          | The original input value                                                       |
| `Background`    | Brightened to ≥ 7:1 contrast against black (`#000000`), output as 6-digit hex  |
| `AltBackground` | Alternative background with ≥ 4.5:1 contrast against the derived foreground    |
| `AltForeground` | Either `#000000` or `#FFFFFF`, whichever contrasts better with `AltBackground` |

---

## Usage

### Browser

Open `index.html` in a browser. All dependencies are loaded from `./lib/` (vendored local copies) — no build step or internet connection required.

Edit the YAML on the left; the DAX and JSON outputs update automatically.

### Node.js

Edit `const data =` in index.mjs and run `node index.mjs`.

## YAML Format

```yaml
CategoryName:
  ItemName: "#HexColor"
  AnotherItem: "css-color-name"

AnotherCategory:
  ItemName: "hsl(184 100% 60%)"
```

Top-level keys become DAX category values; nested keys become item names. Color values can be any format listed above.

## Dependencies

| Library                                                     | Version                          | Purpose                                     |
| ----------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| [chroma-js](https://gka.github.io/chroma.js/)               | 3.2.0                            | Color parsing and contrast calculation      |
| [js-yaml](https://github.com/nodeca/js-yaml)                | 4.1.1                            | YAML parsing                                |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | via `monaco-yaml-prebuilt` 1.0.2 | Code editor with YAML support               |
| [Prism.js](https://prismjs.com/)                            | 1.30.0                           | Syntax highlighting for DAX and JSON output |
| [Pico CSS](https://picocss.com/)                            | 2.1.1                            | Classless base styles                       |
