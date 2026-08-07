# Publish to GitHub

The intended repository is:

`https://github.com/2024frank/oberlin32engineering`

## First publication

```bash
git init
git branch -M main
git remote add origin https://github.com/2024frank/oberlin32engineering.git
git add .
git commit -m "Launch Oberlin 3-2 Engineering Society website"
git push -u origin main
```

Use a credential manager, GitHub CLI, or a short-lived fine-grained token. Never place a token in a remote URL, source file, shell script, screenshot, issue, or chat message.

## Normal updates

```bash
python scripts/build.py
python scripts/check_site.py
git add .
git commit -m "Describe the update"
git push
```

A successful push to `main` runs the Pages workflow automatically.
