# Checks Energy Dashboard (React + Vite)

Dashboard privata React pronta da avviare, con:
- login reale su `/api/v1/auth/login`
- fetch a `/api/v1/auth/me`, `/api/v1/dashboard/summary`, `/api/v1/activities`
- sezioni Reports / Credits / Operators / Branding con fallback demo

## Avvio

```bash
npm install
cp .env.example .env
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Note
- Se il backend non ha certificato valido HTTPS, imposta `VITE_API_BASE` con `http://...` (browser permettendo mixed content in locale) oppure servi frontend e API sullo stesso protocollo.
- Alcune sezioni usano dati demo in attesa di endpoint backend dedicati.
