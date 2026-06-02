# Product Photos Requirements

## Project
Persuasion artifact for the HelloFresh creative team: document all product-image aspect ratios in production, and provide a hands-on crop viewer tool so the impact of single-ratio shooting is visible.

## Key files
- `surfaces.md` — machine-readable surface inventory (24 rows). Parsed at runtime by the viewer.
- `viewer/` — static HTML/CSS/JS crop preview tool. No build step.
- `Product Images Guidelines.md` — the persuasion doc for creative.
- `BACKLOG.md` — what's in progress, what's next, what's parked. **Check this before starting work.**

## Conventions
- Vanilla JS only. No frameworks, no build pipeline.
- `surfaces.md` is the single source of truth — the viewer reads it, the guidelines doc references it. Don't duplicate surface data.
- All images are center-cropped in production (`object-fit: cover; object-position: center`). The viewer must mirror this exactly.
- Safe zones from the existing PDF: Conservative (200/120px margins on 1200×800 source), Usable (66/60px margins).

## Workflow
- Serve locally with `python3 -m http.server 8080` from the project root, then open `http://localhost:8080/viewer/`.
- Test with a real 3:2 recipe photo (1200×800 minimum).

## Git & Deployment
- **Repo:** `ginta2/product-photos-requirements` on GitHub
- **GitHub CLI:** Use `gh` (authenticated as `ginta2`). This is the user's GitHub account.
- **Deploy:** Pushing to `main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`
- **Live URL:** https://ginta2.github.io/product-photos-requirements/viewer/
- **Workflow:** GitHub Actions → `actions/deploy-pages@v4` — deploys the entire repo root as a static site (no build step needed)

### Git commands
```bash
# Commit and push (triggers deploy)
git add -A && git commit -m "description" && git push

# Check deploy status
gh run list --limit 3

# View Pages URL
gh api repos/ginta2/product-photos-requirements/pages --jq '.html_url'
```
