package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
)

const (
	dbName     = "tabit.db"
	schemaPath = "schema.sql"
	serverPort = "8080"
)

type HTTPError struct {
	Code    int    // HTTP status code
	Message string // Error message
	Err     error  // Underlying error (optional)
}

// Error satisfies the error interface
func (e *HTTPError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("HTTP error %d: %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("HTTP error %d: %s", e.Code, e.Message)
}

// Unwrap allows errors.Is and errors.As to work with wrapped errors
func (e *HTTPError) Unwrap() error {
	return e.Err
}

// Request and response types
type CreateUserRequest struct {
	UserID   string `json:"user_id"` // TODO: get from auth
	Username string `json:"username"`
}

type CreateHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Name   string `json:"name"`
}

type LogHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Day    string `json:"day"`     // Format: YYYY-MM-DD
}

type Response struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	// Initialize database
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	r := mux.NewRouter()

	// Set up HTTP handlers
	r.HandleFunc("/api/signup", handleUsers(db))
	r.HandleFunc("/api/habits/{id}/log", handleHabitLogs(db))
	r.HandleFunc("/api/habits", handleHabits(db))
	// Start server
	log.Printf("Starting server on port %s", serverPort)
	if err := http.ListenAndServe(":"+serverPort, r); err != nil {
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

// Handler for user-related endpoints
func handleUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req CreateUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
			return
		}
		user, err := createUser(r.Context(), db, req)
		if err != nil {
			sendErrorResponse(w, err.Message, err.Code)
			return
		}
		sendSuccessResponse(w, user)
	}
}

// Handler for habit-related endpoints
func handleHabits(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var req CreateHabitRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
				return
			}
			habit, err := createHabit(r.Context(), db, req)
			if err != nil {
				sendErrorResponse(w, err.Message, err.Code)
				return
			}
			sendSuccessResponse(w, habit)
		case http.MethodGet:
			// TODO: get user_id from auth
			habits, err := getHabits(r.Context(), db, "1")
			if err != nil {
				sendErrorResponse(w, err.Message, err.Code)
				return
			}
			sendSuccessResponse(w, habits)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// Handler for habit logging
func handleHabitLogs(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		habitID, err := strconv.ParseInt(vars["id"], 10, 64)
		if err != nil {
			sendErrorResponse(w, "habit id must be an int", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPost:
			var req LogHabitRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
				return
			}
			err := logHabit(r.Context(), db, req, int32(habitID))
			if err != nil {
				sendErrorResponse(w, err.Message, err.Code)
				return
			}
			sendSuccessResponse(w, "ok")
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(Response{
		Message: message,
	})
}

func sendSuccessResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Data: data,
	})
}
