   ┌─────────────┐
   │   Your PC   │
   │ (Write HTML │
   │   files)    │
   └──────┬──────┘
          │ push/pull code
          ▼
   ┌─────────────┐
   │   GitHub    │
   │ (Code repo) │
   └──────┬──────┘
          │ Auto deploy (Pages/Workers)
          ▼
   ┌─────────────┐
   │ Cloudflare  │
   │  Workers &  │
   │   Pages     │
   └──────┬──────┘
          │ serve website
          ▼
   ┌─────────────┐
   │  Web Users  │
   │ (Browser)   │
   └─────────────┘
