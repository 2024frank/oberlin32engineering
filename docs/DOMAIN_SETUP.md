# GitHub Pages and custom-domain setup

This site is prepared for the repository:

`2024frank/oberlin32engineering`

and the domain:

`oberlin32engineeringsociety.com`

## 1. Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Push to `main`, or run the **Build and deploy website to GitHub Pages** workflow manually from the Actions tab.
5. Confirm that the deployment finishes successfully before changing DNS.

The workflow publishes the generated `site/` directory. Its root contains `index.html`, which GitHub Pages requires.

## 2. Verify the domain in GitHub

Domain verification helps prevent another repository from claiming the domain.

1. Open your GitHub profile settings.
2. Go to **Pages**.
3. Add `oberlin32engineeringsociety.com` as a verified domain.
4. GitHub will provide a TXT record.
5. Add that TXT record at the company where the domain's DNS is managed.
6. Return to GitHub and complete verification.

Do not delete the verification TXT record after verification.

## 3. Configure DNS

At your domain provider, remove conflicting parking or forwarding records before adding the GitHub Pages records.

### Apex domain

Create these four `A` records for the host `@`:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | `185.199.108.153` |
| A | @ | `185.199.109.153` |
| A | @ | `185.199.110.153` |
| A | @ | `185.199.111.153` |

Optional IPv6 records:

| Type | Host | Value |
| --- | --- | --- |
| AAAA | @ | `2606:50c0:8000::153` |
| AAAA | @ | `2606:50c0:8001::153` |
| AAAA | @ | `2606:50c0:8002::153` |
| AAAA | @ | `2606:50c0:8003::153` |

### `www` subdomain

Create this record:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | www | `2024frank.github.io` |

Do not add a wildcard DNS record such as `*.oberlin32engineeringsociety.com`.

## 4. Set the custom domain in the repository

1. Return to **Repository Settings → Pages**.
2. Enter `oberlin32engineeringsociety.com` under **Custom domain**.
3. Save it.
4. Allow GitHub to complete its DNS and certificate checks.
5. Turn on **Enforce HTTPS** as soon as GitHub makes the option available.

The repository includes a `CNAME` file in the generated site as an additional record of the intended domain.

## 5. Confirm the launch

Check all of the following:

- The apex domain opens the website.
- The `www` address redirects or resolves correctly.
- HTTPS is active with no browser warning.
- The join form opens from every call-to-action button.
- Instagram and email links are correct.
- Mobile navigation works.
- The privacy page and disclaimer are visible.
- The latest Actions deployment is green.

## DNS troubleshooting

- DNS changes do not appear everywhere at the same moment.
- A parked-domain record can conflict with GitHub Pages.
- The `www` CNAME must point to `2024frank.github.io`, not to the repository URL.
- The custom domain entered in GitHub must match the domain used in `content/site.json`.
- Run the GitHub Pages workflow again after changing repository settings if the site does not refresh.
