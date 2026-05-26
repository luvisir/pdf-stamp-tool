# PDF Contract Stamp Tool Design

## Goal

Build a local browser tool for stamping a PDF contract with a prepared transparent PNG seal. The PDF may already contain the counterparty's seal. The tool must preserve the original PDF pages visually, overlay the user's seal image, and export a new stamped PDF.

This is a visual stamping tool, not a CA-backed digital signature system. It does not provide certificate-based tamper-proof signing.

## Chosen Scope

The first version supports manual placement:

- Upload a PDF contract.
- Upload one PNG seal image.
- Add a normal stamp to one or more pages by dragging it on the preview.
- Add a page-edge stamp by automatically splitting the seal across pages.
- Allow normal stamp and page-edge stamp to be enabled independently or together.
- Export a new PDF with all stamp overlays embedded.

Out of scope for the first version:

- Account system, cloud storage, approvals, or audit workflow.
- CA certificate signing.
- Automatic recognition of signature/stamp locations.
- Fixed contract templates.

## Approaches Considered

### A. Browser-only PDF stamping

Use a frontend app with PDF preview and client-side PDF export. PDF files and seal images never leave the user's machine.

Pros:
- Best privacy posture for contracts and seal images.
- Easy to run locally.
- No server deployment required.

Cons:
- Browser memory limits can matter for very large PDFs.
- Export fidelity depends on client-side PDF libraries.

### B. Local desktop wrapper

Package the same app in a desktop shell.

Pros:
- More native file handling.
- Easier to distribute to non-technical users after packaging.

Cons:
- More setup and packaging work.
- Slower first version.

### C. Server-side stamping

Upload PDFs and seal images to a backend that performs stamping.

Pros:
- Easier to centralize logs and permissions.
- Better for future multi-user workflows.

Cons:
- Bad fit for the current privacy-sensitive use case.
- Requires storage, upload handling, and server hardening.

Recommendation: start with A. It matches the user's current need and keeps documents local.

## User Interface

The app has three main areas:

- Left sidebar: PDF upload, PNG seal upload, stamp type checkboxes, page list.
- Center preview: current PDF page with draggable stamp overlays.
- Right panel: properties for the selected overlay and export controls.

Stamp type controls are checkboxes, not radio buttons:

- Normal stamp can be enabled alone.
- Page-edge stamp can be enabled alone.
- Both can be enabled together.

## Normal Stamp Behavior

The normal stamp is a movable overlay on a PDF page.

Supported controls:

- Drag to move.
- Resize by handle or size input.
- Rotate by input.
- Set opacity.
- Choose current page by default.

The first version may keep normal stamps page-specific. A later version can add "apply to selected pages" or "apply to all pages" if needed.

## Page-Edge Stamp Behavior

The page-edge stamp uses the same PNG seal image and splits it across pages.

Default behavior:

- Place on the right edge of every page.
- Use all PDF pages as the coverage range.
- Split the seal image into N vertical slices where N is the number of covered pages.
- Draw slice 1 on page 1, slice 2 on page 2, and so on.

Controls:

- Edge: right side first; left side can be added if simple.
- Covered page range: default all pages.
- Vertical position.
- Stamp height.
- Opacity.

## Data Model

The app tracks:

- PDF file bytes.
- Seal image bytes and decoded dimensions.
- Current page index.
- Normal stamp overlays:
  - page index
  - x/y position in PDF coordinate space
  - width/height
  - rotation
  - opacity
- Page-edge stamp settings:
  - enabled
  - edge
  - page range
  - vertical position
  - height
  - opacity

Coordinates should be stored in PDF page coordinates, not raw screen pixels, so export matches preview at different zoom levels.

## Export Flow

On export:

1. Load the original PDF bytes.
2. Embed the PNG seal image.
3. Draw normal stamp overlays onto their target pages.
4. Generate page-edge stamp slices and draw the correct slice onto each covered page.
5. Save and download the new PDF.

The original input file is not modified.

## Error Handling

Show clear messages for:

- Missing PDF.
- Missing PNG seal image.
- Unsupported or encrypted PDF.
- Failed PDF render.
- Failed export.

The app should avoid uploading files anywhere. Errors stay local.

## Testing

Minimum verification:

- Upload a multi-page PDF and preview pages.
- Upload a transparent PNG and place a normal stamp.
- Enable only normal stamp and export.
- Enable only page-edge stamp and export.
- Enable both stamp types and export.
- Confirm exported PDF opens and stamps appear on expected pages.
- Confirm original PDF remains unchanged.

## Open Decisions

No blocking open decisions remain for the first version. The design intentionally chooses manual placement, local processing, and independent normal/page-edge stamp toggles.
