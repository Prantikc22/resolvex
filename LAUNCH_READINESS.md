# ResolveX launch readiness

Updated: 4 August 2026

## Ready now

- Marketing site, pricing, Intercom and Freshdesk comparisons, product demo, and responsive navigation
- Supabase authentication, organisations, workspace membership, and tenant-scoped core schema
- Tenant-scoped inbox loading, customer message persistence, agent replies, and conversation resolution
- Knowledge management, help-centre, team, billing, report, and voice setup surfaces
- Website and PDF knowledge ingestion APIs
- OpenRouter support-answer endpoint
- Embeddable messenger script and installation page
- Tenant-issued messenger keys, server-side workspace validation, approved-knowledge retrieval, conversation persistence, and per-session burst limits
- Google OAuth, email/password authentication, account recovery, onboarding, and protected workspace routing
- Idempotent Resend welcome email and internal new-workspace notification after onboarding
- Arlo answer generation through OpenRouter with approved-context boundaries and human-handoff language
- Razorpay order, verification, and webhook route scaffolding
- Terms, privacy, cancellation and refunds, digital delivery, cookie, acceptable-use, data-processing, contact, and company pages
- Consent preference UI with necessary, analytics, and preference categories

## Required before accepting production customers

- Replace all exposed development credentials and rotate Supabase, OpenRouter, and any other keys shared outside the deployment secret store
- Configure Razorpay live keys, webhook secret, plans, tax treatment, subscription lifecycle, dunning, invoices, cancellations, and customer billing portal
- Connect production inbound and outbound email with domain verification, unsubscribe handling, bounce processing, retries, and tenant routing
- Verify the ResolveX sending domain in Resend and replace the temporary `onboarding@resend.dev` sender before public onboarding
- Connect a voice provider for numbers, recording consent, call events, carrier pricing, geographic availability, and emergency-call restrictions
- Move ingestion and AI work to durable background jobs with retries, idempotency, rate limits, and dead-letter handling
- Store and scan uploads in managed object storage; enforce file type, size, malware, retention, and deletion policies
- Add production notifications, incident alerts, audit review, abuse controls, backup restoration tests, and error monitoring
- Run accessibility, browser, load, penetration, RLS, payment-webhook, and disaster-recovery tests
- Have counsel review the public policies and insert the contracting legal entity, governing law, tax registration, and jurisdiction

## Honest launch position

ResolveX is suitable for a private preview and controlled design-partner onboarding. The tenant messenger, core inbox, knowledge ingestion, replies, and resolution flow are real. The richer sample records and provider-connected interactions remain confined to `/demo`.

ResolveX is not yet feature-complete against Intercom or Freshdesk, and Razorpay is not the only remaining production dependency. Public paid launch should wait until the provider, reliability, security, and legal items above are complete.
