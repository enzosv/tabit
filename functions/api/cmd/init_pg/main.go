package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

const (
	schemaPath = "pg_schema.sql"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	_, err = initDB()
	if err != nil {
		log.Fatal(err)
	}
}

// Initialize the database from schema.sql
func initDB() (*sql.DB, error) {
	// Construct connection string from environment variables
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)
	fmt.Println(connStr)

	// Open database connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	// Read schema file
	schemaBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read schema file: %w", err)
	}

	// Execute schema
	_, err = db.Exec(string(schemaBytes))
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to execute schema: %w", err)
	}
	log.Println("Database schema initialized successfully")

	return db, nil
}
