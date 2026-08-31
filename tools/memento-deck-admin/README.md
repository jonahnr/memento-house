# The Memento Deck Card Builder

A local production tool for creating Memento House’s personalized wedding experience: guests draw or choose varied prompt cards, write something meaningful, sign it, and build the couple’s deck during the wedding.

## Run locally

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

Open the local address shown in the terminal. Use `npm test` for production calculations and `npm run build` to verify the release build.

## Production workflow

1. **Couple:** enter names, wedding details, first-met and first-date details, and the couple’s story.
2. **Photo:** upload JPG, PNG, or WEBP. Drag directly in the crop editor or live card; scroll to zoom; use precision sliders, rotate, or Center & Fill. Decorative frames sit over the photo and do not reduce its image area.
3. **Style:** choose one of nine composed themes, a palette, and separate display, body, and label typography.
4. **Prompts:** configure Remember, Advise, Predict, Adventure, Together, and Confess. Each line in a category’s prompt library becomes a different card.
5. **Quantity:** choose the deck size, category distribution, guest mode, rare Golden Mementos, and numbering.
6. **Review:** browse every prompt variation with the arrows above the preview, flip cards, and run preflight.
7. **Export:** download the current card PNG, complete print PDF, organized ZIP, or portable project JSON.

Projects autosave in local browser storage. Ctrl+Z and Ctrl+Shift+Z provide undo and redo.

## Guest modes

- **Choose:** guests select the category that speaks to them.
- **Draw:** cards are shuffled face-down; the Memento chooses the guest.
- **Mixed:** guests choose a category, then draw a random prompt from that stack.

The deck also includes a couple cover, guest instruction card, subtle Golden Mementos, and an after-wedding **First Read** card.

## Print dimensions

Flagship Memento cards:

- Trim: 3.5 × 5 inches
- Bleed: 0.125 inch on every edge
- Full canvas: 3.75 × 5.25 inches
- Raster export: 1125 × 1575 pixels at 300 DPI equivalent
- Safe area: 0.125 inch inside trim on every edge

Table sign:

- Trim: 5 × 7 inches
- Full canvas: 5.25 × 7.25 inches
- Export: 1575 × 2175 pixels
- Safe area: 0.125 inch inside trim on every edge

Preview guides never appear in final output. Browser-generated files use RGB/sRGB; a commercial printer may perform final CMYK conversion. Confirm duplex orientation, stock, bleed, crop marks, and color workflow with the printer and approve a physical proof before production.

## Architecture

Models are in `src/types.ts`, product defaults and dimensions in `src/data.ts`, calculations and prompt assignment in `src/utils.ts`, rendering in `src/components/CardCanvas.tsx`, and exports in `src/exporter.ts`. Categories are template objects, making future prompt libraries and Memento House products straightforward to add without duplicating card markup.
