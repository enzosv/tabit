package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

const (
	dbName     = "tabit.db"
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
type CreateHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Name   string `json:"name"`
}

type LogHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Day    string `json:"day"`     // Format: YYYY-MM-DD
	Count  string `json:"count"`
}

type SyncDataRequest struct {
	ClientTimestamp int64                     `json:"client_timestamp"` // Unix milliseconds UTC
	HabitData       map[string]map[string]int `json:"habit_data"`
}

type Response struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Failed to load env: %v", err)
	}
	// Initialize database
	var connStr string
	pg_url := os.Getenv("PG_URL")
	if pg_url != "" {
		connStr = pg_url
	} else {
		connStr = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
		)
	}

	ds, err := NewDataStore(PostgresDB, connStr)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	router := mux.NewRouter()

	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if the origin is allowed
			origin := r.Header.Get("Origin")
			allowed := origin == "https://tabits.netlify.app" || strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "--tabits.netlify.app")
			if !allowed {
				allowedOrigins := []string{
					"https://tabits.netlify.app",
				}
				for _, allowedOrigin := range allowedOrigins {
					if origin == allowedOrigin {
						allowed = true
						break
					}
				}
			}

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	router.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("asfasdfa")
		sendSuccessResponse(w, "pong")
	})
	router.HandleFunc("/api/habits/{id}", handleHabitLogs(ds))
	router.HandleFunc("/api/habits", handleHabits(ds))
	router.HandleFunc("/api/sync", handleSync(ds))
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		sendErrorResponse(w, "not found", http.StatusNotFound)
	})

	// Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = serverPort
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

}

func initDB() (*sql.DB, error) {
	// Check if database file exists
	_, err := os.Stat(dbName)
	if err != nil {
		return nil, err
	}

	// Open database connection
	db, err := sql.Open("sqlite3", dbName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}
	return db, nil
}

// Handler for habit-related endpoints
func handleHabits(ds DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var req CreateHabitRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
				return
			}
			if req.UserID == "" || req.Name == "" {
				sendErrorResponse(w, "user_id and name are required", http.StatusBadRequest)
				return
			}
			// habit, err := createHabit(r.Context(), db, req)
			// if err != nil {
			// 	sendErrorResponse(w, err.Message, err.Code)
			// 	return
			// }
			// sendSuccessResponse(w, habit)
			sendSuccessResponse(w, "ok")
		case http.MethodGet:
			// TODO: get user_id from auth
			// habits, err := getHabits(r.Context(), ds, "1")
			// if err != nil {
			// 	sendErrorResponse(w, err.Message, err.Code)
			// 	return
			// }
			// sendSuccessResponse(w, habits)
			sendSuccessResponse(w, "ok")
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

// Handler for habit logging
func handleHabitLogs(ds DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		habitID, err := strconv.ParseInt(vars["id"], 10, 64)
		if err != nil {
			sendErrorResponse(w, "habit id must be an int", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodPut:
			var req LogHabitRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				sendErrorResponse(w, "Invalid request format", http.StatusBadRequest)
				return
			}
			if req.UserID == "" || habitID == 0 || req.Day == "" {
				sendErrorResponse(w, "Missing request params", http.StatusBadRequest)
				return
			}
			_, err := time.Parse("2006-01-02", req.Day)
			if err != nil {
				sendErrorResponse(w, "Date format must be yyyy-mm-dd", http.StatusBadRequest)
				return
			}
			// db_err := logHabit(r.Context(), db, req, int32(habitID))
			// if db_err != nil {
			// 	sendErrorResponse(w, db_err.Message, db_err.Code)
			// 	return
			// }
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

// Handler for synchronizing the entire user state
func handleSync(ds DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req SyncDataRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendErrorResponse(w, "Invalid request format: "+err.Error(), http.StatusBadRequest)
			return
		}

		if req.HabitData == nil {
			sendErrorResponse(w, "Missing required fields: habit_data", http.StatusBadRequest)
			return
		}

		user_id, db_err := userFromToken(r.Context(), ds, r.Header.Get("Authorization"))
		if db_err != nil {
			sendErrorResponse(w, db_err.Error(), http.StatusUnauthorized)
			return
		}

		data, db_err := ds.SyncUserData(r.Context(), *user_id, req)
		if db_err != nil {
			sendErrorResponse(w, db_err.Message, db_err.Code)
			return
		}

		sendSuccessResponse(w, data)
	}
}
