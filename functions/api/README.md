# Habit Tracker API

A simple habit tracking API built with Go, SQLite, and go-jet.

## Setup Instructions

### Prerequisites

- Go 1.16+
- SQLite3

## Using with go-jet

- Generate go-jet models from schema:
   ```
   # Install the go-jet generator
   go install github.com/go-jet/jet/v2/cmd/jet@latest
   
   # Generate models
   jet -source=sqlite -dsn="./tabit.db" -path=./.gen
   ```


### Reset the database
- sqlite
```
# Delete the existing database 
rm tabit.db
# Regenerate database 
go run cmd/init_sqlite/main.go
# Regenerate models 
jet -source=sqlite -dsn="./tabit.db" -path=./.gen
```
- postgres
```
dropdb tabit && createdb tabit
migrate -source file://migrations -database "postgres://username:@localhost:5432/tabit?sslmode=disable" up
jet -source=postgres -host=localhost -port=5432 -user=username -dbname=tabit -path=./.gen_pg
```