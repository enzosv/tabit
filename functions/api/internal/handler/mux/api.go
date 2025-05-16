package muxhandler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"slices"
	"strconv"
	"strings"
	api "tabit-serverless/internal/domain"
	"time"

	"github.com/gorilla/mux"
)

func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(api.Response{
		Message: message,
	})
}

func sendSuccessResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(api.Response{
		Data: data,
	})
}

func NewRouter(ds DataStore) *mux.Router {
	router := mux.NewRouter()
	// CORS middleware
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if the origin is allowed
			origin := r.Header.Get("Origin")
			// TODO: move hardcoded to config
			allowed := origin == "https://tabits.netlify.app" || strings.HasPrefix(origin, "http://localhost:") || strings.HasSuffix(origin, "--tabits.netlify.app")
			if !allowed {
				allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
				allowed = slices.Contains(allowedOrigins, origin)
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
	return router
}

// Handler for habit-related endpoints
func handleHabits(ds DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			var req api.CreateHabitRequest
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
			var req api.LogHabitRequest
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

// Handler for synchronizing the entire user state
func handleSync(ds DataStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req api.SyncDataRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendErrorResponse(w, "Invalid request format: "+err.Error(), http.StatusBadRequest)
			return
		}

		user_id, db_err := api.UserFromToken(r.Context(), ds, r.Header.Get("Authorization"))
		if db_err != nil {
			sendErrorResponse(w, db_err.Error(), http.StatusUnauthorized)
			return
		}

		jsonData, jsonErr := json.Marshal(req.HabitData)
		if jsonErr != nil {
			slog.ErrorContext(r.Context(), "Error marshaling habit data", "user", user_id, "err", jsonErr)
			sendErrorResponse(w, "Error decoding habit data", http.StatusInternalServerError)
			return
		}

		data, db_err := ds.SyncUserData(r.Context(), *user_id, req.LastUpdated, jsonData)
		if db_err != nil {
			sendErrorResponse(w, db_err.Message, db_err.Code)
			return
		}

		sendSuccessResponse(w, data)
	}
}
