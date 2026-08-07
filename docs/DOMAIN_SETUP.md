# Domain and GitHub Pages setup

The production domain is `oberlin32engineeringsociety.com`. The generated site also includes a `CNAME` file, although GitHub treats the custom-domain value saved in the repository Pages settings as authoritative when a custom Actions workflow is used.

## 1. Verify the domain in GitHub first

Before changing the public DNS records, verify ownership of the domain in GitHub to reduce the risk of another account claiming one of its subdomains.

1. Open **GitHub → Settings → Pages** for the `2024frank` account.
2. Under **Verified domains**, add `oberlin32engineeringsociety.com`.
3. GitHub will provide a TXT record name and value.
4. Add that TXT record at the domain registrar.
5. Return to GitHub after DNS propagation and complete verification.

Keep the verification TXT record in DNS after verification.

## 2. Configure the repository Pages settings

1. Open the `2024frank/oberlin32engineering` repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Under **Custom domain**, enter `oberlin32engineeringsociety.com` and save it.
5. Push or manually run the **Build, validate, and deploy website** workflow.
6. Enable **Enforce HTTPS** after GitHub finishes its DNS and certificate checks.

## 3. Configure DNS at the registrar

Remove conflicting parking, forwarding, wildcard, apex A/AAAA, or `www` CNAME records before adding the records below.

### Apex domain

Create four `A` records with host/name `@`:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | `185.199.108.153` |
| A | @ | `185.199.109.153` |
| A | @ | `185.199.110.153` |
| A | @ | `185.199.111.153` |

### WWW subdomain

Create this record:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | www | `2024frank.github.io` |

Do not append the repository name to the CNAME target. Do not use a wildcard record such as `*.oberlin32engineeringsociety.com`.

## 4. Verify the release

DNS changes can take up to 24 hours to propagate. After GitHub reports that the domain is configured, verify:

- `https://oberlin32engineeringsociety.com`
- `https://www.oberlin32engineeringsociety.com`
- The `www` address redirects correctly to the canonical apex domain
- The HTTPS certificate is valid and **Enforce HTTPS** is enabled
- The membership form, Instagram, email, images, sitemap, and custom 404 page work
- The GitHub Pages workflow passes

The GitHub Pages IP addresses can change in the future. Check GitHub's current custom-domain documentation before replacing these records later.
