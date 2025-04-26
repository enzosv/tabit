package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"

	_ "github.com/mattn/go-sqlite3"

	"tabit-serverless/.gen/model"
	. "tabit-serverless/.gen/table"
)

type HabitInfo struct {
	HabitID int64
	Name    string
	Logs    []HabitLogCount
}

type HabitLogCount struct {
	Day   string
	Count int
}

func syncUserData(ctx context.Context, db *sql.DB, user_id string, req SyncDataRequest) *HTTPError {
	jsonData, jsonErr := json.Marshal(req.HabitData)
	if jsonErr != nil {
		log.Printf("Error marshaling habit data for user %s: %v", user_id, jsonErr)
		return &HTTPError{Code: http.StatusInternalServerError, Message: "Failed to serialize data", Err: jsonErr}
	}

	// Query current timestamp for the user (if exists)
	var currentTimestamp sql.NullInt64 // Use sql.NullInt64 to handle no existing row
	stmt := SELECT(UserSyncState.LastUpdatedClient).
		FROM(UserSyncState).
		WHERE(UserSyncState.UserID.EQ(String(user_id)))
	err := stmt.QueryContext(ctx, db, &currentTimestamp)

	if err != nil && err != qrm.ErrNoRows {
		log.Printf("Error querying sync state for user %s: %v", user_id, err)
		return &HTTPError{Code: http.StatusInternalServerError, Message: "Database error checking sync state", Err: err}
	}

	// Compare timestamps (Last Write Wins)
	// If incoming data is older than existing data, return error
	if err == nil && currentTimestamp.Valid && req.ClientTimestamp < currentTimestamp.Int64 {
		slog.Info("Sync skipped", "user", user_id, "incoming", req.ClientTimestamp, "current", currentTimestamp.Int64)
		return &HTTPError{Code: http.StatusConflict, Message: "Sync skipped"}
	}

	model := model.UserSyncState{UserID: &user_id, Data: string(jsonData), LastUpdatedClient: int32(req.ClientTimestamp)}

	// Perform UPSERT
	upsert := UserSyncState.INSERT(UserSyncState.UserID, UserSyncState.Data, UserSyncState.LastUpdatedClient).
		MODEL(model).
		ON_CONFLICT(UserSyncState.UserID).
		DO_UPDATE(
			SET(UserSyncState.Data.SET(UserSyncState.EXCLUDED.Data),
				UserSyncState.LastUpdatedClient.SET(UserSyncState.EXCLUDED.LastUpdatedClient),
			),
		)

	_, err = upsert.ExecContext(ctx, db)
	if err != nil {
		slog.ErrorContext(ctx, "Error upserting sync state", "user", user_id, "err", err)
		return &HTTPError{Code: http.StatusInternalServerError, Message: "Failed to save sync state", Err: err}
	}
	return nil
}

func logHabit(ctx context.Context, db *sql.DB, req LogHabitRequest, habitID int32) *HTTPError {
	habitLog := model.HabitLogs{HabitID: habitID, Day: req.Day}
	stmt := HabitLogs.INSERT(HabitLogs.HabitID, HabitLogs.Day, HabitLogs.Count).
		MODEL(habitLog).
		ON_CONFLICT(HabitLogs.HabitID, HabitLogs.Day).
		DO_UPDATE(SET(HabitLogs.Count.SET(HabitLogs.EXCLUDED.Count)))
	_, err := stmt.ExecContext(ctx, db)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to log habit",
		}
	}
	return nil
}

func createHabit(ctx context.Context, db *sql.DB, req CreateHabitRequest) (*model.Habits, *HTTPError) {
	habit := model.Habits{UserID: req.UserID, Name: req.Name}
	stmt := Habits.INSERT(Habits.UserID, Habits.Name).MODEL(habit).RETURNING(Habits.AllColumns)

	dest := model.Habits{}
	err := stmt.QueryContext(ctx, db, &dest)
	if err != nil {
		return nil, &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to insert habit",
		}
	}
	return &dest, nil
}

func getHabits(ctx context.Context, db *sql.DB, user_id string) ([]HabitInfo, *HTTPError) {

	// 	select habit_id, name, day, count(day)
	// from habits h
	// join habit_logs hl using (habit_id)
	// group by habit_id, day;

	stmt := SELECT(
		Habits.HabitID, Habits.Name.AS("name"),
		HabitLogs.Day.AS("day"), COUNT(HabitLogs.Day).AS("count")).
		FROM(Habits.
			LEFT_JOIN(HabitLogs,
				Habits.HabitID.EQ(HabitLogs.HabitID))).
		WHERE(Habits.UserID.EQ(String(user_id))).
		GROUP_BY(Habits.HabitID, HabitLogs.Day).
		ORDER_BY(Habits.CreatedAt)

	var dest []struct {
		HabitID int64
		Name    string
		Day     string
		Count   int
	}
	err := stmt.QueryContext(ctx, db, &dest)
	if err != nil {
		return nil, &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to query habits",
		}
	}

	habitMap := make(map[int64]*HabitInfo)

	for _, row := range dest {
		fmt.Println(row.HabitID, row.Name, row.Day, row.Count)
		habit, exists := habitMap[row.HabitID]
		if !exists {
			habit = &HabitInfo{
				HabitID: row.HabitID,
				Name:    row.Name,
				Logs:    []HabitLogCount{},
			}
			habitMap[row.HabitID] = habit
		}

		if row.Day != "" {
			habit.Logs = append(habit.Logs, HabitLogCount{
				Day:   row.Day,
				Count: row.Count,
			})
		}
	}

	var habitInfos []HabitInfo
	for _, habit := range habitMap {
		habitInfos = append(habitInfos, *habit)
	}
	return habitInfos, nil
}

// Create a new user
func createUser(ctx context.Context, db *sql.DB, user_id string) *HTTPError {
	user := model.Users{UserID: &user_id}

	stmt := Users.INSERT(Users.UserID).MODEL(user).ON_CONFLICT().DO_NOTHING()

	_, err := stmt.ExecContext(ctx, db)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to create user",
			Err:     err,
		}
	}
	return nil
}

func userFromToken(ctx context.Context, db *sql.DB, token_string string) (*string, *HTTPError) {
	user_id, err := parseAndVerifyToken(token_string)
	if err != nil {
		fmt.Println(err)
		return nil, &HTTPError{Message: "Unauthorized", Code: http.StatusUnauthorized, Err: err}
	}
	db_err := createUser(ctx, db, *user_id)
	if db_err != nil {
		return nil, db_err
	}
	return user_id, nil
}
