package api

import (
	"fmt"
	"time"
)

// type APIHandler interface {
// 	Ping()
// 	// auth
// 	Register()
// 	Login()

// 	// auth required
// 	LogHabit()
// 	UpdateHabit()
// 	CreateHabit()
// 	DeleteHabit()
// 	Sync()
// }

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

type LogHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Day    string `json:"day"`     // Format: YYYY-MM-DD
	Count  string `json:"count"`
}

func (lh LogHabitRequest) Validate() error {
	if lh.UserID == "" || lh.Day == "" {
		return fmt.Errorf("Missing request params")
	}
	_, err := time.Parse("2006-01-02", lh.Day)
	if err != nil {
		return fmt.Errorf("Invalid date format")
	}
	// TODO: check id owned by user
	return nil
}

// Request and response types
type CreateHabitRequest struct {
	UserID string `json:"user_id"` // TODO: get from auth
	Name   string `json:"name"`
}

type SyncDataRequest struct {
	LastUpdated int64                `json:"client_timestamp"` // Unix milliseconds UTC
	HabitData   map[string]HabitData `json:"habit_data"`
}

type HabitData struct {
	Logs       map[string]int `json:"logs"`
	WeeklyGoal int            `json:"weekly_goal"`
	Sort       int            `json:"sort"`
}

type Response struct {
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}
