# KNpay Web (knpay.knprovider.com)

Web-version af KNpay, bygget mens mobil-appen venter på godkendelse hos Apple/Google.
Samme Supabase-backend som mobil-appen — deler data 1:1 (companies, user_companies, invoices).

## Opsætning

1. `npm install`
2. Opret `.env.local` med:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://komuacyvvhqvpyvwmqtf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<jeres anon key fra Supabase Settings → API>
   SUPABASE_SERVICE_ROLE_KEY=<jeres service_role key — HEMMELIG, del aldrig denne>
   RESEND_API_KEY=<jeres Resend API-nøgle>
   RESEND_FROM_EMAIL=KNpay <noreply@knprovider.com>
   ```

   **OBS:** `RESEND_API_KEY` er til de brandede transaktionsmails (velkomst, betaling
   bekræftet), som køres fra selve appens kode. Det er ADSKILT fra Supabase Auth's
   egen login-bekræftelsesmail, som konfigureres separat i Supabase-dashboardet under
   Authentication → Settings → SMTP Settings (kan også pege på Resend, men er en
   selvstændig indstilling — tjek det der, ikke i denne kode).
3. `npm run dev` for at teste lokalt

## Deploy til Cloudflare Pages (samme metode som knbase.dk)

1. Opret et NYT Cloudflare Pages/Workers-projekt (adskilt fra knbase), koblet til GitHub-repoet for knpay-web
2. Sæt miljøvariablerne op i Cloudflare-projektet. VIGTIGT: `NEXT_PUBLIC_SUPABASE_URL` og
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` skal ligge under **Build variables** (Settings → Build → Variables
   and secrets), fordi Next.js bager dem ind i koden ved build. Hemmelige nøgler
   (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `GEMBA_*`) lægges under **Variables and secrets**
   (runtime). Mangler de to NEXT_PUBLIC-variabler ved build, giver live-siden 500-fejl.
3. Build-kommando: `npm run cf:build`
4. Deploy-kommando: `npm run cf:deploy`
5. Peg `knpay.knprovider.com` som custom domain på dette nye Cloudflare-projekt (Settings → Custom domains)

## VIGTIGE FORBEHOLD — skal testes/justeres

Denne kode er bygget ud fra det, jeg kunne se i jeres mobil-apps kode og database-skema,
men to ting er **bedste bud, ikke 100% bekræftet**, og skal testes:

1. **`create-invoice`-funktionens forventede felter** (`CreateInvoiceForm.tsx`):
   Jeg har gættet på `company_id`, `recipient_type`, `recipient_name`, `recipient_cvr`,
   `description`, `amount_ex_vat`, `due_date` ud fra feltnavne set i mobil-appens kode.
   Hvis oprettelse fejler, tjek den faktiske Edge Function-kode
   (`supabase/functions/create-invoice/index.ts`) for at bekræfte de præcise feltnavne.

2. **`company-info`-funktionens CVR-opslag** (`CreateCompanyForm.tsx`):
   Jeg har gættet på et GET-kald med `?cvr=XXXXXXXX` og et JSON-svar med
   `name/address/zipcode/city`. Hvis opslaget fejler, har jeg lagt en fallback ind,
   så man kan udfylde felterne manuelt i stedet.

3. **RLS (Row Level Security) på `companies`/`user_companies`:**
   Koden antager, at en logget-ind bruger må indsætte en ny række i `companies`
   og sig selv i `user_companies` direkte fra klienten. Hvis dette fejler med en
   RLS-fejl, skal I enten justere jeres RLS-policies, eller sige til, så laver jeg
   det om til et server-side Edge Function-kald i stedet (mere sikkert under alle
   omstændigheder, men kræver at jeg kender den præcise ønskede logik).

## Ny funktion: offentligt betalingslink til kunden

`/faktura/vis/[id]` er en **offentlig side uden login** — det er linket, virksomheden
deler med sin kunde (i stedet for at kunden skal scanne en QR-kode med en anden telefon).
Kunden kan åbne linket direkte på sin egen telefon, se betalingsoplysningerne, og trykke
"Jeg har overført pengene" — hvorefter fakturaen får status `bank_transfer_claimed`,
og virksomheden kan bekræfte den i deres dashboard.

## QR-kode bug rettet

Samme fix som i KNbase: QR-koden bruger "Belob" (uden ø) i selve QR-dataene for at undgå
encoding-korruption i visse kamera-apps — den synlige tekst på skærmen viser stadig
korrekt "Beløb".
