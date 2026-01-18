# Self-Contained HTML Generation

This document explains spike.land's ability to create standalone HTML files
from codeSpaces that can be deployed anywhere.

---

## Table of Contents

- [Overview](#overview)
- [Build Functions](#build-functions)
- [R2 Deployment](#r2-deployment)
- [HTML Structure](#html-structure)
- [Build Modes](#build-modes)
- [Current Status](#current-status)

---

## Overview

spike.land can bundle codeSpaces into **self-contained HTML files** that:

- Include all JavaScript, CSS, and HTML inline
- Run independently without the spike.land server
- Can be hosted on any static hosting (R2, S3, GitHub Pages)
- Preserve all functionality including React interactivity

### Use Cases

1. **Archiving**: Create permanent snapshots of codeSpaces
2. **Sharing**: Share interactive demos via simple HTML files
3. **Embedding**: Embed codeSpaces in other websites
4. **Offline**: Run codeSpaces without internet connection

---

## Build Functions

**Location**: `packages/code/src/@/lib/use-archive.ts`

### getSpeedy2()

Creates an optimized ESM build and deploys to `/live-cms/`:

```typescript
export const getSpeedy2 = async () => {
  const codeSpace = getCodeSpace(location.pathname);

  // Build with code splitting (ESM format)
  const res = await build({
    codeSpace,
    splitting: true,
    origin: location.origin,
    format: "esm",
  });

  // Fetch additional assets
  const css = await fetch(`/live/${codeSpace}/index.css`).then(r => r.text());
  const appCss = await fetch(`/assets/app.css`).then(r => r.text());
  const htm = await fetch(`/live/${codeSpace}/htm`).then(r => r.text());

  // Extract wrapper files
  const wrapperJs = res.find(x => x.path.includes("wrapper.mjs"))?.text || "";
  const wrapperCss = res.find(x => x.path.includes("wrapper.css"))?.text || "";

  // Build self-contained HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeSpace archive for ${codeSpace}</title>
  <style type="text/css">
    ${appCss}
    ${wrapperCss}
    ${css}
  </style>
</head>
<body>
  <div id="embed">${htm}</div>
  <script type="module">${wrapperJs}</script>
</body>
</html>`;

  // Deploy to R2
  await fetch(`/live-cms/${codeSpace}.html`, {
    method: "PUT",
    headers: { "Content-Type": "text/html" },
    body: html,
  });
};
```

### useArchive()

Creates an IIFE build with content-addressed URL:

```typescript
export const useArchive = async (codeSpace: string) => {
  // Build as IIFE (single bundle)
  const indexMjs = await build({
    codeSpace,
    origin: location.origin,
    format: "iife",
  });

  const css = await fetch(`/live/${codeSpace}/index.css`).then(r => r.text());
  const htm = await fetch(`/live/${codeSpace}/htm`).then(r => r.text());

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CodeSpace archive for ${codeSpace}</title>
  <style type="text/css">${css}</style>
</head>
<body>
  <div id="embed">${htm}</div>
  <script>${indexMjs}</script>
</body>
</html>`;

  // Content-addressed deployment
  const md = md5(html);
  await fetch(`/my-cms/${md}/${codeSpace}.html`, {
    method: "PUT",
    headers: { "Content-Type": "text/html" },
    body: html,
  });

  // Redirect to new URL
  location.href = `${location.origin}/my-cms/${md}/${codeSpace}.html`;
};
```

### useSpeedy()

Creates an ESM build with font embedding:

```typescript
export const useSpeedy = async (codeSpace: string) => {
  const indexMjs = await build({
    codeSpace,
    splitting: true,
    origin: location.origin,
    format: "esm",
  });

  // Upload fonts to R2
  indexMjs
    .filter(f => !f.path.endsWith(".css") && !f.path.endsWith(".mjs"))
    .forEach(async (f) => {
      const extension = f.path.split(".").pop();
      const mimeType = getMimeType(extension);
      await fetch(f.path.slice(1), {
        method: "PUT",
        body: f.contents,
        headers: { "Content-Type": mimeType },
      });
    });

  // Update CSS paths
  const css = indexMjs.find(f => f.path.endsWith("/index.css"))?.text;
  const updatedCss = css?.replace(
    /url\((["']?)\/assets\//g,
    `url($1https://testing.spike.land/live/${codeSpace}/api/my-cms/assets/`,
  );

  const htm = await fetch(`/live/${codeSpace}/htm`).then(r => r.text());

  const html = buildHtml(codeSpace, updatedCss, htm, indexMjs[0]?.text);

  const md = md5(html);
  await fetch(`/my-cms/${md}/${codeSpace}.html`, {
    method: "PUT",
    headers: { "Content-Type": "text/html" },
    body: html,
  });
};
```

---

## R2 Deployment

### Deployment Endpoints

| Endpoint                     | Storage      | URL Pattern                  |
| ---------------------------- | ------------ | ---------------------------- |
| `/live-cms/{name}.html`      | Live CMS     | Named, mutable               |
| `/my-cms/{hash}/{name}.html` | Personal CMS | Content-addressed, immutable |

### PUT Request

```javascript
// Deploy to live-cms (overwritable)
await fetch(`/live-cms/${codeSpace}.html`, {
  method: "PUT",
  headers: { "Content-Type": "text/html" },
  body: htmlContent,
});

// Deploy to my-cms (content-addressed)
const hash = md5(htmlContent);
await fetch(`/my-cms/${hash}/${codeSpace}.html`, {
  method: "PUT",
  headers: { "Content-Type": "text/html" },
  body: htmlContent,
});
```

### Access URLs

After deployment:

- Live CMS: `https://testing.spike.land/live-cms/{codeSpace}.html`
- My CMS: `https://testing.spike.land/my-cms/{hash}/{codeSpace}.html`

---

## HTML Structure

### Basic Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <meta name="description" content="spike.land codeSpace">

  <!-- Fonts (if needed) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap" rel="stylesheet">

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' https://esm.sh https://cdn.jsdelivr.net blob: 'unsafe-eval' 'unsafe-inline';
    worker-src 'self' https://esm.sh blob:;
    style-src 'self' https://esm.sh 'unsafe-inline' https://fonts.googleapis.com;
    connect-src 'self' https://esm.sh blob:;
    font-src 'self' data: blob: https://esm.sh https://fonts.gstatic.com;
    img-src 'self' https://esm.sh data: blob:;
  ">

  <title>CodeSpace: {codeSpace}</title>

  <!-- Inlined CSS -->
  <style type="text/css">
    /* Base app styles */
    ${appCss}

    /* Wrapper styles */
    ${wrapperCss}

    /* Component-specific CSS */
    ${css}
  </style>
</head>
<body>
  <!-- Server-rendered HTML for fast initial paint -->
  <div id="embed">${htm}</div>

  <!-- Inlined JavaScript (ESM) -->
  <script type="module">${wrapperJs}</script>
</body>
</html>
```

### Theme Support

The template includes dark mode support:

```css
:root {
  --bg-color: #ffffff;
  --text-color: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #000000;
    --text-color: #ffffff;
  }
}

body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

---

## Build Modes

### IIFE Mode (useArchive)

- **Output**: Single JavaScript bundle
- **Pros**: Maximum compatibility, single file
- **Cons**: Larger file size, no code splitting
- **Use for**: Simple components, maximum portability

```typescript
await build({
  codeSpace,
  format: "iife", // Immediately Invoked Function Expression
});
```

### ESM Mode (getSpeedy2, useSpeedy)

- **Output**: ES Modules with potential splitting
- **Pros**: Modern syntax, better debugging
- **Cons**: Requires ESM support in browser
- **Use for**: Modern browsers, better performance

```typescript
await build({
  codeSpace,
  format: "esm",
  splitting: true, // Enable code splitting
});
```

---

## Current Status

### Working Features

- Basic HTML generation with inlined CSS/JS
- R2 deployment via PUT/POST
- Content-addressed URLs (md5 hashing)
- Server-side HTML rendering

### Known Limitations

1. **Font Handling**: Fonts may need manual path updates
2. **External Dependencies**: Some CDN imports may not work offline
3. **Large Bundles**: Complex codeSpaces may produce large files
4. **CSP Restrictions**: Some embedded contexts may block inline scripts

### Roadmap Items

| Item                              | Status        | Priority |
| --------------------------------- | ------------- | -------- |
| Verify getSpeedy2 functionality   | Needs testing | HIGH     |
| Add server-side HTML construction | Planned       | HIGH     |
| Optimize font embedding           | Planned       | MEDIUM   |
| Add offline CDN bundling          | Future        | LOW      |

---

## Usage from Console

These functions are exposed on `globalThis` for console debugging:

```javascript
// In browser console on a codeSpace page
await getSpeedy2(); // Build and deploy to live-cms

// Or for versioned archive
await useArchive("my-codespace"); // Build and redirect to my-cms
```

---

## Download Hook

**Location**: `packages/code/src/hooks/useDownload.ts`

For user-triggered downloads:

```typescript
export const useDownload = (codeSpace: string, onlyReturn = false) => {
  return () => download(codeSpace, onlyReturn);
};

// Usage in component
const handleDownload = useDownload(codeSpace);
<button onClick={handleDownload}>Download HTML</button>;
```

This:

1. Calls `getSpeedy2()` to build
2. Fetches the generated HTML from `/live-cms/`
3. Creates a blob and triggers download

---

## Related Documentation

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) - Agent rules and recipes
- [TRANSPILATION_PIPELINE.md](./TRANSPILATION_PIPELINE.md) - How code is transformed
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
