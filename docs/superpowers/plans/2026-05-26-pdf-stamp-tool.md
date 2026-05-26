# PDF Stamp Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-version local browser app for manually placing a PNG seal on a PDF and optionally adding a page-edge stamp before exporting a new PDF.

**Architecture:** A Vite vanilla JavaScript app runs fully in the browser. PDF.js renders previews, pdf-lib embeds the PNG seal and writes the exported PDF, and a small geometry module keeps coordinate conversion and page-edge slicing testable.

**Tech Stack:** Vite, vanilla HTML/CSS/JS, `pdfjs-dist`, `pdf-lib`, Node built-in `node:test`.

---

### Task 1: Project Scaffold And Geometry Tests

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/stampGeometry.js`
- Create: `tests/stampGeometry.test.js`

- [ ] **Step 1: Write failing geometry tests**

Create tests for viewport-to-PDF coordinate conversion and page-edge slice calculation.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test`
Expected: FAIL because `src/stampGeometry.js` does not exist yet.

- [ ] **Step 3: Implement geometry helpers**

Implement `screenRectToPdfRect`, `pdfRectToScreenRect`, and `getEdgeStampSlices`.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test`
Expected: PASS.

### Task 2: Browser UI Shell

**Files:**
- Create: `src/main.js`
- Create: `src/styles.css`
- Modify: `index.html`

- [ ] **Step 1: Build static UI shell**

Add file inputs, stamp type checkboxes, page list, canvas preview area, selected stamp controls, and export button.

- [ ] **Step 2: Run app**

Run: `npm run dev`
Expected: Vite serves the app locally.

### Task 3: PDF Preview And Normal Stamp Interaction

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Load PDF and PNG seal**

Use PDF.js to render the selected page. Use object URLs to preview the PNG seal overlay.

- [ ] **Step 2: Add normal stamp overlay**

When normal stamp is checked and a seal exists, show a draggable overlay on the current page. Store its geometry in PDF coordinates.

- [ ] **Step 3: Add property controls**

Support width, rotation, and opacity for the selected normal stamp.

### Task 4: Page-Edge Stamp Preview And Export

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Preview page-edge stamp**

When page-edge stamp is checked, show the slice that belongs to the current page on the right edge.

- [ ] **Step 2: Export stamped PDF**

Use pdf-lib to embed the PNG seal, draw normal stamps, crop and draw page-edge slices, then download the new PDF.

- [ ] **Step 3: Verify export combinations**

Manually verify normal-only, page-edge-only, and both together with a sample PDF and PNG.

### Task 5: Final Verification

**Files:**
- Modify only if verification finds a bug.

- [ ] **Step 1: Run automated tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS.
