# Pricing tiers (proposed for GitHub Marketplace)

Status: proposal for owner decision. Prices are in US dollars, billed monthly through GitHub Marketplace. Confirm the plan types and fee terms in GitHub's current Marketplace documentation before publishing.

## Billing unit

**Repositories monitored.** A repository counts when Parmana checks its pull requests. Repositories in a company's installation that have no settings files do not count. This matches how the value is delivered, and it is easy for a customer to predict.

## Tiers

| | **Pilot (free)** | **Team** | **Business** | **Enterprise** |
| --- | --- | --- | --- | --- |
| Price | $0 | $49 per month | $299 per month | Contact sales |
| Repositories included | 1 | Up to 10 | Up to 100 | Custom |
| Mode | Report-only | Report-only or enforced | Report-only or enforced | Report-only or enforced |
| Rules | 1 (approval for deploy, command or outside-connection access) | Up to 5 | Unlimited | Unlimited |
| Approvals | Manual | Manual, with expiry | Manual, with expiry and two-person approval | Manual, with expiry, two-person approval, and custom approver groups |
| Settings file types | 1 | All in Release 1.0 | All in Release 1.0 | All in Release 1.0, plus custom formats on request |
| Decision records | Stored, unsigned | Signed, 90-day retention | Signed, exportable, 1-year retention | Signed, exportable, custom retention, offline verification |
| Dashboard | None | Basic | Full | Full, plus shared views |
| Access | One administrator | Up to 5 users | Role-based access, unlimited users | Single sign-on and role-based access |
| Notifications | None | Email | Email and chat | Email, chat and custom webhooks |
| Support | Community | Business hours by email | Business hours, plus 24/7 for critical issues | Named contact, custom response times |
| Data location | Default | Default | Default | Choice of region, including Mumbai |
| Free trial | Not applicable | 14 days | 14 days | Arranged with sales |

## When each tier can be sold

- **Pilot (free):** can be listed once the pilot is running (Stage 1 in `ROADMAP.md`).
- **Team, Business and Enterprise:** must not be sold until the features in their columns are built and tested (Release 1.0, Stage 2). Selling before then would break the claims in `VALUE-PROPOSITION.md`.

## Why these choices

- **The free pilot** lets a team try the product on one repository without a purchase decision. It produces the evidence the owner needs for the enforcement decision.
- **Repositories as the unit** grows with use, and avoids charging per person, which would discourage developers from adopting the tool.
- **Four tiers** cover a small team, a mid-sized company and a large enterprise, without an option for every size.
- **Enterprise is by contact** because single sign-on, regional data and custom retention are negotiated per customer.

## Decisions for the owner

1. Confirm the four price points, or change them.
2. Confirm the repository caps (10 and 100).
3. Confirm that the free pilot is listed on Marketplace, or kept private for design partners only.
4. Confirm the trial length.
5. Confirm the enforcement and approval features that make each paid tier worth its price.

## Checks before publishing

- GitHub Marketplace supports the billing model chosen (per repository, or the closest per-unit option it offers). If it doesn't, the billing unit changes, and the tables change with it.
- GitHub's current fee on Marketplace sales is included in the price, or the prices are adjusted to cover it.
- Customer terms and data processing terms are reviewed by counsel (see OD-06).
