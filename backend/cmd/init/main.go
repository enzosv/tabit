package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

const (
	dbName     = "tabit.db"
	schemaPath = "schema.sql"
)

func main() {
	_, err := initDB()
	if err != nil {
		log.Fatal(err)
	}
}

// Initialize the database from schema.sql
func initDB() (*sql.DB, error) {
	// Check if database file exists
	_, err := os.Stat(dbName)
	dbExists := !os.IsNotExist(err)

	// Open database connection
	db, err := sql.Open("sqlite3", dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	if dbExists {
		log.Println("Using existing database")
		return db, nil
	}

	// If database doesn't exist or we want to reinitialize, load schema
	// Read schema file
	schemaBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read schema file: %w", err)
	}

	// Execute schema
	_, err = db.Exec(string(schemaBytes))
	if err != nil {
		db.Close()
		os.Remove(dbName)
		return nil, fmt.Errorf("failed to execute schema: %w", err)
	}
	log.Println("Database schema initialized successfully")

	return db, nil
}
