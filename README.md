# Tabit
- App to keep track of your habits
- Be reminded whenever you open a new tab
- Main purpose is to learn [hugo](https://github.com/gohugoio/hugo) and [go-jet](https://github.com/go-jet/jet)

## Features
- Local first. Fast and works offline.
- [Cal-Heatmap](https://cal-heatmap.com) per habit

# TODO
- [ ] Go API for accounts and sync
  - [ ] in netlify functions
  - [ ] use [Supabase Postgres](https://www.netlify.com/integrations/supabase/) for persistence
  - [ ] use [go-jet](https://github.com/go-jet/jet) to interact with database
  - [ ] use [golang-migrate](https://github.com/golang-migrate/migrate) for migrations
  - [ ] accounts
    - [x] bulk sync
    - [ ] forgot password
    - [ ] apple signin
    - [x] email password login
    - [ ] signup
- [ ] Chrome extension
- [ ] Search and add using same text input
  - [x] Add if new
  - [x] Log if existing
  - [ ] Shortcut to activate text input
  - [x] filter
- [ ] edit mode
  - [ ] rename
  - [ ] change colors
  - [ ] reorder
- [ ] dark/light mode toggle
- [ ] IAP
  - [ ] more colors
  - [ ] multiple habits
  - [ ] webhooks
  - [ ] import
  - [ ] export

