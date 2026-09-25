# ResolveX pricing and unit economics

Reviewed 25 September 2026 against current vendor pricing.

## Price list

| Item | Price | Notes |
| --- | --- | --- |
| Agent seat | $15 / month | Collaborators free |
| AI resolutions | 50 included per workspace per month, then $0.39 | Only when AI closes the conversation |
| AI voice (web or phone) | $0.12 / connected minute | Changed from $0.02, which lost money |
| Phone numbers | Customer's own carrier | ResolveX never resells numbers |
| Free trial | 7 days, Arlo text only | Voice and phone start with the paid plan |

## Cost per unit

| Unit | Our cost | Price | Gross margin |
| --- | --- | --- | --- |
| AI resolution (≈6 LLM calls, 18k in / 2.4k out tokens on DeepSeek v4 Flash at $0.049 / $0.098 per M) | ≈ $0.002–0.005 | $0.39 | ≈ 95% after payment fees |
| Web voice minute (ElevenLabs agents $0.08 / min + LLM) | ≈ $0.09 | $0.12 | ≈ 20% |
| Phone minute (voice provider ≈ $0.045–0.06 / min) | ≈ $0.06 | $0.12 | ≈ 45% |
| Tool call (Composio: 100k free / month, then $0.0003) | ≈ $0 | included | — |
| Seat payment (Dodo: 4% + $0.40, +0.5% subscriptions, +1.5% international) | $1.08 US / $1.30 intl for 1 seat | $15 | ≈ 91–93% |

Fixed platform costs (Vercel, Supabase, provider plans, email) are roughly
$100–200 per month, so the business breaks even at about 10–15 paid seats.

## What changed in this review

1. **Voice repriced to $0.12 / minute.** At $0.02 every voice minute lost about
   $0.07. The Dodo `voice.minute` meter was updated to 12 cents.
2. **Trials are text-only.** Voice and phone provisioning, voice sessions and
   number connection are blocked while a subscription is `trialing`, so a free
   trial can never create provider spend beyond cheap text replies.
3. **Per-employee voice budgets** remain enforced before every voice session
   and outbound call.

## Watch list

- **Web voice margin is thin (~20%).** Move to an ElevenLabs volume plan, or
  raise web voice to $0.15 if usage grows faster than negotiated rates fall.
- **Unresolved AI conversations are free.** A busy site whose chats never close
  pays only for seats. The LLM cost is tiny (≈ $0.002 per conversation), but
  add a fair-use ceiling (for example 2,000 AI conversations per seat each
  month) before enterprise-scale traffic arrives.
- **Decision API (Jev) cost** is not yet metered; confirm its per-call price.
- **Annual billing** at $12 / seat (two months free) would improve cash flow;
  add it as a separate Dodo product when ready.

Do not change a live price without creating a new Dodo product or meter price
first; existing subscriptions keep the product they were sold.
