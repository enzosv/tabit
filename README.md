# Tabit
- App to keep track of your habits
- Be reminded whenever you open a new tab
- Main purpose is to learn [hugo](https://github.com/gohugoio/hugo) and [go-jet](https://github.com/go-jet/jet)

## Features
- Local first. Fast and works offline.
- [Cal-Heatmap](https://cal-heatmap.com) per habit

# TODO
- [ ] Go API for accounts and sync
  - [x] in netlify functions
  - [x] use [Supabase Postgres](https://www.netlify.com/integrations/supabase/) for persistence
  - [x] use [go-jet](https://github.com/go-jet/jet) to interact with database
  - [x] use [golang-migrate](https://github.com/golang-migrate/migrate) for migrations
  - [ ] accounts
    - [x] bulk sync
    - [ ] forgot password
    - [ ] apple signin
    - [x] email password login
    - [x] signup
  - [ ] per event api call
- [ ] Chrome extension
- [ ] Search and add using same text input
  - [x] Add if new
  - [x] Log if existing
  - [ ] Shortcut to activate text input
  - [x] filter
- [ ] dark/light mode toggle
- [ ] IAP
  - [ ] more colors
  - [ ] multiple habits
  - [ ] webhooks
  - [ ] import
  - [ ] export
- Habits
  - [x] streak label
  - [ ] weekly target 🏆
  - [ ] order
  - [ ] color
  - [ ] rename
- Optimization
  - [ ] only rerender per habit.html if there is a change
  - [ ] bundler to remove [unused css](https://github.com/apaleslimghost/postcss-remove-unused)

