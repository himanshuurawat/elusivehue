# CI/CD learning guide

## What this branch adds

The GitHub Actions workflow in `.github/workflows/ci.yml` runs:

1. `npm ci`: install exactly the versions in `package-lock.json`.
2. `npm run build`: run TypeScript checks, then create the Vite production build.
3. `node --test tests/build-smoke.test.mjs`: check the generated entry, local asset references, privacy page and terms page.

It runs on pushes to `main` and `ci-checks-learning`, and pull requests targeting `main`. Later feature branches receive checks through their pull requests. Push and PR events can produce two runs while this learning branch has a PR open. Older runs for the same branch or PR are cancelled when replaced.

## Safety and cost

- Standard `ubuntu-24.04` runner, one job, ten-minute timeout.
- Repository access is read-only. Checkout does not keep credentials.
- No deployment tokens, Supabase credentials, paid runner, uploaded artifacts or dependency cache.
- Actions are pinned to commit SHAs. Review version updates before changing those pins.
- Standard GitHub-hosted runners in public repositories are free under GitHub's current billing rules. Recheck billing before making the repository private or choosing larger runners.
- The workflow does not deploy, merge, create users, upload artwork, send emails or run database migrations.

## What green does and does not mean

Green means these checks passed for the tested commit. It does not prove the design looks right, animations are smooth on a phone, Google sign-in works, permissions are correct or buying is ready. Those need separate tests and review.

These are **built-file smoke tests**, not browser tests or account end-to-end tests. CI uses the default configuration without a live account connection. Cloudflare's environment-specific build remains separate.

This branch does not make checks mandatory. Main branch protection has not been configured. A red CI run does not stop Cloudflare from independently building a preview. Human review and explicit merge approval still matter.

## CI versus CD

CI is the automatic checking added here. The existing GitHub-connected Cloudflare Pages project handles deployment separately. A production deployment follows a change to its configured production branch. This workflow contains no deployment job and does not make deployment wait for CI.

Do not merge this branch until the checks and diff have been reviewed and merge approval has been given.

## Try the same checks locally

Use Node.js 24, the same major version as CI. In the repository folder:

```sh
npm ci
npm run build
node --test tests/build-smoke.test.mjs
```

The tests require `dist` from the build. They do not query a live website.

## Optional hands-on pass/fail exercise

Results should first be reviewed and explained by the project maintainer. The user does not need to inspect logs or run this exercise to receive support. Manual UI, flow and bug checks continue alongside CI.

For optional hands-on practice, do this only on a separate learning branch, never on `main`:

1. Open the pull request's Checks tab. Read the commit SHA and each green step.
2. Explain what each of the three commands does before making an edit.
3. In `tests/build-smoke.test.mjs`, change the expected mount ID from `root` to `training-missing-root`. Commit it to the learning branch.
4. Open the new red run. Find `Test built output`, the failing test name and its assertion. The application source was not changed; only the test expectation was intentionally wrong.
5. Restore the expectation to `root` and commit again. Confirm the new run is green for the new SHA.
6. Compare the two runs and explain the failure and fix in your own words.

A test-file edit may still trigger Cloudflare's independent branch preview build. It does not change the site's application source. Never merge the deliberate failing exercise.

## Resume wording

After reviewing the real pass/fail results and understanding the setup, a narrow, truthful starting point is:

> Configured GitHub Actions CI for a React/TypeScript project with locked dependency installation, type checking, production builds and built-output smoke tests.

Add Cloudflare deployment experience only after reviewing the actual deployment path yourself. Do not claim browser E2E coverage, enforced release gates, zero-downtime releases or production delivery by this Actions workflow.

## Official references

- https://docs.github.com/en/actions/get-started/continuous-integration
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
