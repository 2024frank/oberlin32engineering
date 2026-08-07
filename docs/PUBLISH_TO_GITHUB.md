# Publish the prepared repository to GitHub

The website has already been built and committed locally. The configured remote is:

`https://github.com/2024frank/oberlin32engineering.git`

Never send a GitHub password, personal access token, recovery code, or private SSH key to another person or paste one into a chat.

## Easiest method: GitHub Desktop

1. Download and extract the **git-ready** website archive.
2. Open GitHub Desktop and sign in to the GitHub account that owns `2024frank/oberlin32engineering`.
3. Choose **File → Add Local Repository**.
4. Select the extracted `oberlin32engineering-final` folder.
5. Confirm that the current branch is `main`.
6. Click **Push origin**.
7. Open the repository on GitHub and confirm that the files and the first commit are visible.
8. Open **Actions** and confirm that the Pages deployment workflow runs.

## Terminal method

From the extracted git-ready folder:

```bash
git status
git remote -v
git push -u origin main
```

Authenticate through GitHub's supported browser or credential-manager flow when prompted. GitHub account passwords are not accepted for Git operations over HTTPS.

## After the push

1. Go to **Settings → Pages** in the repository.
2. Choose **GitHub Actions** under Build and deployment.
3. Confirm that the workflow publishes successfully.
4. Follow [`DOMAIN_SETUP.md`](DOMAIN_SETUP.md) to connect `oberlin32engineeringsociety.com` and enable HTTPS.
