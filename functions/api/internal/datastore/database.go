package datastore

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"

	"github.com/go-jet/jet/v2/qrm"
	. "github.com/go-jet/jet/v2/sqlite"

	_ "github.com/mattn/go-sqlite3"

	"tabit-serverless/.gen/model"
	. "tabit-serverless/.gen/table"
	api "tabit-serverless/internal/domain"
)

type UserSyncStateModel struct {
	UserID      string
	LastUpdated int64
	Data        string
}

// DataStore defines the interface for data storage operations
type DataStore interface {
	Close() error
	SyncUserData(ctx context.Context, user_id string, last_updated int64, jsonData []byte) (*UserSyncStateModel, error)
	CreateUser(ctx context.Context, user_id string) error
}

// DBType represents the supported database types
type DBType string

const (
	PostgresDB DBType = "postgres"
	SQLiteDB   DBType = "sqlite"
)

// PostgresDataStore implements DataStore for PostgreSQL
type PostgresDataStore struct {
	DB *sql.DB
}

type SQLiteDataStore struct {
	DB *sql.DB
}

// NewDataStore creates a new DataStore based on the provided configuration
func NewDataStore(dbType DBType, connectionString string) (DataStore, error) {
	db, err := sql.Open(string(dbType), connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	switch dbType {
	case PostgresDB:
		return &PostgresDataStore{DB: db}, nil
	// case SQLiteDB:
	// 	return &SQLiteDataStore{DB: db}, nil
	default:
		return nil, fmt.Errorf("unsupported database type: %s", dbType)
	}
}

type HabitInfo struct {
	HabitID int64
	Name    string
	Logs    []HabitLogCount
}

type HabitLogCount struct {
	Day   string
	Count int
}

func syncUserData(ctx context.Context, db *sql.DB, user_id string, req api.SyncDataRequest) (*model.UserSyncState, error) {
	jsonData, err := json.Marshal(req.HabitData)
	if err != nil {
		log.Printf("Error marshaling habit data for user %s: %v", user_id, err)
		return nil, fmt.Errorf("Failed to serialize data: %w", err)
	}

	var existing model.UserSyncState
	stmt := SELECT(UserSyncState.AllColumns).
		FROM(UserSyncState).
		WHERE(UserSyncState.UserID.EQ(String(user_id)))
	err = stmt.QueryContext(ctx, db, &existing)

	if err != nil && err != qrm.ErrNoRows {
		log.Printf("Error querying sync state for user %s: %v", user_id, err)
		return nil, fmt.Errorf("Error checking sync state: %w", err)
	}

	if existing.UserID != nil && existing.LastUpdated > int32(req.LastUpdated) {
		return &existing, nil
	}

	model := model.UserSyncState{UserID: &user_id, Data: string(jsonData), LastUpdated: int32(req.LastUpdated)}

	// Perform UPSERT
	upsert := UserSyncState.INSERT(UserSyncState.UserID, UserSyncState.Data, UserSyncState.LastUpdated).
		MODEL(model).
		ON_CONFLICT(UserSyncState.UserID).
		DO_UPDATE(
			SET(UserSyncState.Data.SET(UserSyncState.EXCLUDED.Data),
				UserSyncState.LastUpdated.SET(UserSyncState.EXCLUDED.LastUpdated),
			),
		)

	_, err = upsert.ExecContext(ctx, db)
	if err != nil {
		slog.ErrorContext(ctx, "Error upserting sync state", "user", user_id, "err", err)
		return nil, fmt.Errorf("Failed to save sync state: %w", err)
	}
	return &model, nil
}

func LogHabit(ctx context.Context, db *sql.DB, req api.LogHabitRequest, habitID int32) error {
	habitLog := model.HabitLogs{HabitID: habitID, Day: req.Day}
	stmt := HabitLogs.INSERT(HabitLogs.HabitID, HabitLogs.Day, HabitLogs.Count).
		MODEL(habitLog).
		ON_CONFLICT(HabitLogs.HabitID, HabitLogs.Day).
		DO_UPDATE(SET(HabitLogs.Count.SET(HabitLogs.EXCLUDED.Count)))
	_, err := stmt.ExecContext(ctx, db)
	if err != nil {
		return fmt.Errorf("Failed to log habit %w", err)
	}
	return nil
}

func createHabit(ctx context.Context, db *sql.DB, req api.CreateHabitRequest) (*model.Habits, error) {
	habit := model.Habits{UserID: req.UserID, Name: req.Name}
	stmt := Habits.INSERT(Habits.UserID, Habits.Name).MODEL(habit).RETURNING(Habits.AllColumns)

	dest := model.Habits{}
	err := stmt.QueryContext(ctx, db, &dest)
	if err != nil {
		return nil, fmt.Errorf("Failed to insert habit: %w", err)

	}
	return &dest, nil
}

func getHabits(ctx context.Context, db *sql.DB, user_id string) ([]HabitInfo, error) {

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
		return nil, fmt.Errorf("Failed to query habits: %w", err)
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
func createUser(ctx context.Context, db *sql.DB, user_id string) error {
	user := model.Users{UserID: &user_id}

	stmt := Users.INSERT(Users.UserID).MODEL(user).ON_CONFLICT().DO_NOTHING()

	_, err := stmt.ExecContext(ctx, db)
	if err != nil {
		return fmt.Errorf("Failed to create user: %w", err)
	}
	return nil
}
