# ResolveX pricing and unit economics

Reviewed 25 September 2026 against current vendor pricing.

## Price list

| Item | Price | Notes |
| --- | --- | --- |
| Agent seat | $15 / month | Collaborators free |
| AI resolutions | 50 included per workspace per month, then $0.39 | Only when AI closes the conversation |
| AI voice (web or phone) | $0.20 / connected minute, rounded up per call | Changed from $0.02, which lost money |
| Phone numbers | Customer's own carrier | ResolveX never resells numbers |
| Free trial | 7 days, Arlo text only, 50 AI conversations | Voice and phone need an active paid plan |

## Cost per unit

| Unit | Our cost | Price | Gross margin |
| --- | --- | --- | --- |
| AI resolution (≈6 LLM calls, 18k in / 2.4k out tokens on DeepSeek v4 Flash at $0.049 / $0.098 per M) | ≈ $0.002–0.005 | $0.39 | ≈ 95% after payment fees |
| Web voice minute (ElevenLabs agents $0.08 / min + LLM) | ≈ $0.09 (worst case $0.17 at burst rates) | $0.20 | ≈ 50% (still positive at burst, after fees) |
| Phone minute (voice provider ≈ $0.045–0.06 / min) | ≈ $0.06 | $0.20 | ≈ 65% |
| Tool call (Composio: 100k free / month, then $0.0003) | ≈ $0 | included | — |
| Seat payment (Dodo: 4% + $0.40, +0.5% subscriptions, +1.5% international) | $1.08 US / $1.30 intl for 1 seat | $15 | ≈ 91–93% |

Fixed platform costs (Vercel, Supabase, provider plans, email) are roughly
$100–200 per month, so the business breaks even at about 10–15 paid seats.

## Loss guards

Every path that spends provider money is either billed or hard-capped so that
a workspace hitting every ceiling still costs less than it pays.

| Path | Guard |
| --- | --- |
| Voice and phone | Only on an active, paid, non-cancelling Dodo subscription. Trials, failed payments and scheduled cancellations are text-only. A worker sweep removes provider agents within a minute of a lapse so inbound calls cannot consume minutes; reactivation recreates them and reattaches numbers. |
| Voice billing | Every call with minutes is metered (including transferred and abandoned calls), rounded up per call, plus per-employee monthly budgets. |
| Widget AI | 5 AI replies per conversation; 150 new AI conversations per seat per day; trials limited to the 50 included conversations. |
| Decision API | Widget classification capped at 300 per seat per day; attention brief 20 / hour; CRM insights 60 / hour per workspace. |
| AI employees | 2,000 actions (LLM runs + app tool calls) per seat per month; none run without an active plan; recurring flows no more often than every 15 minutes; $1 spend cap per run. |
| Public site assistant | 12 questions per visitor per 10 minutes and 3,000 per day in total. |

Worst case per seat per month if every text ceiling is hit: about $6 of AI
cost (22,500 widget replies at ≈ $0.00025 plus 2,000 employee actions)
against $13.90 of seat revenue after fees, before any resolution revenue.

## Watch list

- **Decision API (Jev) price** is unconfirmed; it is volume-capped above, but confirm the per-call rate.
- **Disputes** ($30 each at Dodo) cannot be guarded in code; keep the refund policy clear.
- **Annual billing** at $12 / seat (two months free) would improve cash flow;
  add it as a separate Dodo product when ready.

Do not change a live price without creating a new Dodo product or meter price
first; existing subscriptions keep the product they were sold.
