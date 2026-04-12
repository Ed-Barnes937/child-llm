# Legal & Privacy

## Context
Product is being built in the UK. Primary legal framework is UK GDPR + Age Appropriate Design Code (AADC). COPPA (US) applies if/when US users sign up.

## UK Age Appropriate Design Code (AADC) — Primary Framework

The AADC is stricter than COPPA in most respects. Key requirements:

- **Privacy by default** — highest privacy settings must be applied by default. Aligns with our "sensible defaults, parents loosen from there" model.
- **DPIA required** — formal Data Protection Impact Assessment must be conducted before launch. Will likely need professional help.
- **Best interests of the child** — design choices must demonstrably benefit the child. A regulator could challenge features that serve the business at the child's expense.
- **Profiling restrictions** — profiling children is off by default. If the AI adapts to a child's interests (e.g. suggesting more science topics), that may constitute profiling and needs careful handling.
- **Nudge technique restrictions** — gamification (badges, streaks) must not encourage children to weaken their privacy or provide more data.
- **Age estimation** — must establish user age with certainty appropriate to risk. Parent-created accounts help, but need safeguards against children creating fake parent accounts.
- **Enforced by the ICO** — they've been active (forced TikTok changes). Being a small startup doesn't exempt you.

## COPPA (US) — Secondary Framework

Applies to services directed at children under 13 or that knowingly collect their data. Key requirements:
- Verifiable Parental Consent (VPC) before data collection — checkbox isn't enough. Payment, ID, or signed forms required.
- Data minimisation — only collect what's strictly necessary.
- Parental access and deletion rights.
- Data retention limits — must define a purge window.
- No behavioural advertising.
- Reasonable security measures.

## Cross-Border Strategy
- Design for UK AADC from day one (legally required)
- UK AADC compliance gets ~90% of the way to COPPA compliance for free (it's stricter)
- Main COPPA gap: specific verifiable parental consent mechanisms
- Don't geo-restrict — close the gap before actively marketing to US

## The Data Storage Tension

Core tension: parent conversation review (a key product feature) requires storing data about children (a compliance liability).

Possible approaches:
- **Short retention window** — store for 30-90 days, then auto-purge. Simple, defensible.
- **Summary-only storage** — store AI-generated summaries/flags, not raw transcripts. Reduces data footprint while preserving parent notifications.
- **Parent-controlled retention** — parents choose their window. Processing with explicit consent for a defined purpose.
- **On-device storage** — conversations on child's device only. Reduces server-side compliance burden but creates UX problems.

## Impact on Architecture
- Robust data retention and deletion pipeline from day one
- Storage designed with purging in mind (not an afterthought)
- Audit logging (who accessed what, when)
- Encryption at rest and in transit — mandatory
- Safeguards against children creating fake parent accounts
- Careful design of any adaptive/personalisation features re: profiling

## COPPA Safe Harbor
Programs like kidSAFE or PRIVO provide guidelines, audits, and a trust signal for parents. Worth considering for go-to-market credibility.

## Liability
- If the AI says something harmful despite guardrails — legally murky, evolving area
- Mitigations: clear ToS positioning product as supplement to (not replacement for) parental oversight, flag-and-forward system, disclaimers about AI limitations

## Questions to Decide

1. Do we store full conversation transcripts, summaries only, or nothing?
2. If we store conversations, what's the retention window before auto-purging?
3. Does a paid subscription serve as verifiable parental consent, or do we need additional verification?
4. Do we need to collect the child's age for legal compliance (AADC age estimation) even though the product doesn't use age tiers?
5. Should we pursue a COPPA Safe Harbor program for credibility?
6. How do we prevent children from creating fake parent accounts?
7. If the AI adapts to a child's interests, does that constitute profiling under the AADC — and if so, how do we handle it?
8. Do we need a DPIA consultant, or can the initial assessment be done in-house?
9. How do we handle gamification features (badges, streaks) without falling foul of AADC nudge restrictions?
10. Who carries liability if the AI says something inappropriate — and how do we mitigate in ToS?
