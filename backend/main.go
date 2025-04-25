package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

const (
	dbName     = "tabit.db"
	schemaPath = "schema.sql"
	serverPort = "8080"
)

// Request and response types
type CreateUserRequest struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
}

type CreateHabitRequest struct {
	UserID string `json:"userId"`
	Name   string `json:"name"`
}

type LogHabitRequest struct {
	HabitID int64  `json:"habitId"`
	Day     string `json:"day"` // Format: YYYY-MM-DD
}

type Response struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	// Initialize database
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// TODO: Set up HTTP handlers

	// Start server
	log.Printf("Starting server on port %s", serverPort)
	if err := http.ListenAndServe(":"+serverPort, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
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
		return nil, fmt.Errorf("failed to execute schema: %w", err)
	}
	log.Println("Database schema initialized successfully")

	return db, nil
}

func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(Response{
		Message: message,
	})
}

func sendSuccessResponse(w http.ResponseWriter, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Message: message,
		Data:    data,
	})
}
