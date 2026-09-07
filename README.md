# Mighty Blade Miniature Generator

Static browser application for creating scale-aware, foldable paper miniatures on an A4 sheet.

## Features

- Import multiple PNG, JPEG, or WebP creature images.
- Mighty Blade size presets plus custom printed height in millimetres.
- Exact 180-degree mirrored artwork for folding.
- Semicircular attachment tabs and separate circular slotted bases.
- A4 portrait or landscape preview.
- Immediate overflow validation when a miniature or base no longer fits.
- Client-side PDF generation; images never leave the browser.
- Responsive interface built with HTML, CSS, and vanilla JavaScript.

## Running locally

Open `index.html` directly in your browser. No installation, local server,
Python command, build process, or internet connection is required.

The PDF writer is implemented in the project's local JavaScript.

## Validation

Run the orientation regression check with:

```bash
node tests/orientation.test.mjs
```

The PDF invariant is: the generated 180-degree copy is placed above the fold line, while the untouched uploaded image is placed below it.

## Project structure

```text
index.html
css/styles.css
js/app.js
```

## License

This project does not include Mighty Blade artwork or copyrighted creature assets. Users provide their own images.
