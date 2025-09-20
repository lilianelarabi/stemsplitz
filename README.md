STEM Fit — Final Release
Created: 2025-09-19T18:24:42.441343Z

Contents:
- index.html (landing page)
- generator.html (training program generator)
- calories.html (calorie calculator)
- rehab.html (rehab & relief module)
- references.html (sources)
- styles.css (professional neon-dark theme, high contrast)
- script.js (site logic: generator, calorie calc, rehab, nav)
- exercises.json (exercise DB with rehab entries)
- assets/ (placeholder images/gifs)

How to run:
1. Unzip into D:\gym (or any folder).
2. Recommended: open in VS Code and run Live Server, or in terminal: python -m http.server 8000
3. Open http://localhost:8000 in browser.

Notes:
- The generator uses science-based mappings for splits and volumes. Edit 'exercises.json' to customize the DB.
- The rehab module shows quick relief exercises for common pains and stores a safety acknowledgement in localStorage.
- For local file:// access in some browsers, 'exercises.json' fetch may fail; use Live Server or Firefox to avoid fetch blocking.

If you want further edits (export PDF templates, full exercise GIFs, expand exercise DB with DOIs), tell me and I'll prepare a tailored update.
