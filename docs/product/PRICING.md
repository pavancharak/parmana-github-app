# Pricing tiers (for GitHub Marketplace)

Status: proposal for owner decision. Prices are in US dollars.

## What GitHub Marketplace allows (checked 2026-11-26)

Sources: GitHub Docs, "Pricing plans for GitHub Marketplace apps"; "Set listing pricing plans"; "Receiving payment for app purchases".

- **Plan types:** free, flat-rate, or per-unit. Flat-rate is a set monthly or yearly fee. Per-unit charges per user in an organization. Per-unit does not match this product (see below).
- **Repository limits are not a Marketplace option.** GitHub only bills by flat rate or by user. Each tier is therefore a separate flat-rate plan, and Parmana enforces the repository limit itself. GitHub sends plan change events to the app, and the app must process them.
- **Plans per listing:** up to 10. The four tiers fit.
- **Each paid plan needs a monthly price and a yearly price.**
- **Paid plans need a verified publisher** and financial onboarding before publishing.
- **Free trials:** 14 days, for flat-rate and per-unit plans. A trial converts to a paid subscription unless cancelled. Each customer can start one trial per listing.
- **Fee:** GitHub keeps 5% of Marketplace transaction income. Quoted prices are what the customer pays. The amount Parmana receives is 95% of each payment. Check the current Marketplace Developer Agreement before publishing, because the fee rate may change.

## Billing unit

**Repositories monitored**, enforced by Parmana, not by GitHub billing. A repository counts when Parmana checks its pull requests. Repositories with no settings files do not count. Each tier is a flat-rate plan with its repository cap written into the plan description.

**Users are never a billing unit.** Every tier allows unlimited users.

## Tiers

| | **Pilot (free)** | **Team** | **Business** | **Enterprise** |
| --- | --- | --- | --- | --- |
| Marketplace plan type | Free | Flat rate | Flat rate | Not listed; agreed directly with sales |
| Monthly price | $0 | $49 | $299 | Custom |
| Yearly price | $0 | $490 (two months free) | $2,990 (two months free) | Custom |
| Repositories included | 1 | Up to 10 | Up to 100 | Custom |
| Mode | Report-only | Report-only or enforced | Report-only or enforced | Report-only or enforced |
| Rules | 1 (approval for deploy, command or outside-connection access) | Up to 5 | Unlimited | Unlimited |
| Approvals | Manual | Manual, with expiry | Manual, with expiry and two-person approval | Manual, with expiry, two-person approval, and custom approver groups |
| Settings file types | 1 | All in Release 1.0 | All in Release 1.0 | All in Release 1.0, plus custom formats on request |
| Decision records | Stored, unsigned | Signed, 90-day retention | Signed, exportable, 1-year retention | Signed, exportable, custom retention, offline verification |
| Dashboard | None | Basic | Full | Full, plus shared views |
| Access | Sign-in included, unlimited users | Unlimited users | Role-based, unlimited users | Single sign-on and role-based, unlimited users |
| Notifications | None | Email | Email and chat | Email, chat and custom webhooks |
| Support | Community | Business hours by email | Business hours, plus 24/7 for critical issues | Named contact, custom response times |
| Data location | Default | Default | Default | Choice of region, including Mumbai |
| Free trial (14 days) | Not applicable | Yes | Yes | Arranged with sales |

**Enterprise is not a Marketplace plan.** Custom contracts are agreed outside Marketplace. The Marketplace listing can show "Contact sales" only if GitHub's listing rules allow it. Check this before publishing.

## Revenue after GitHub's fee

| Tier | Monthly price | Parmana receives per month (95%) |
| --- | --- | --- |
| Team | $49 | $46.55 |
| Business | $299 | $284.05 |

## When each tier can be sold

- **Pilot (free):** can be listed once the pilot is running (Stage 1 in `ROADMAP.md`).
- **Team, Business and Enterprise:** must not be sold until the features in their columns are built and tested (Release 1.0). Selling before then would break the claims in `VALUE-PROPOSITION.md`.
- **Paid listing:** requires a verified publisher. Start that application before Release 1.0.

## Why these choices

- **Repository caps, enforced by Parmana:** GitHub does not bill by repository, so Parmana does. Plan change events tell the app when a customer moves tier, and the app must apply the new cap.
- **Flat-rate tiers:** the only paid model that does not charge per user.
- **Free pilot:** lets a team try the product on one repository without a purchase.
- **Four tiers:** a small team, a mid-sized company, a large company, and a custom enterprise contract.

## Decisions for the owner

1. Confirm the four price points and the yearly discount.
2. Confirm the repository caps (10 and 100).
3. Confirm whether the free pilot is listed on Marketplace, or offered privately to design partners only.
4. Confirm whether Enterprise appears on the listing as "Contact sales", or is sold outside Marketplace.
5. Confirm which features justify each paid tier.

## Before publishing

- Apply for verified publisher status, which paid plans require.
- Build the plan change handling, so an upgrade or downgrade changes the repository cap in Parmana.
- Read the current Marketplace Developer Agreement for the fee rate and payment terms.
- Have counsel review the customer terms and data terms (see OD-06).
