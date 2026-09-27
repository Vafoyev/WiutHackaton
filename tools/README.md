# tools

One-off scripts used while building the EDA website. They are kept for the
record, not because anything depends on them — nothing in `src/`, `tests/` or
`eda-website/` imports from here.

| Script | What it did |
| --- | --- |
| `extract_frames.js` | Extracted the 4K WebP frames in `eda-website/public/video-frames/` from the source video. |
| `screenshot.js`, `check_layout*.js`, `full_audit.js` | Drove a headless browser to check the page layout while it was being built. |
| `i18n_patch*.js`, `i18n_patch.py`, `patch*.js`, `patch.py` | Applied bulk edits to `App.tsx` and the translation files during the move to three languages. Superseded by the files they edited. |
| `build.bat` | Windows helper for running the site build. |

These need their own dependencies:

```bash
cd tools && npm install
```

The website itself is built from `eda-website/`, and the model pipeline from
`src/`; neither needs anything in this directory.
