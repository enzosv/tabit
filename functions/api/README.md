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
```
# Delete the existing database 
rm tabit.db
# Regenerate database 
go run cmd/init/main.go
# Regenerate models 
jet -source=sqlite -dsn="./tabit.db" -path=./.gen
```