package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

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

func logHabit(ctx context.Context, db *sql.DB, req LogHabitRequest, habitID int32) *HTTPError {
	if req.UserID == "" || habitID == 0 || req.Day == "" {
		return &HTTPError{
			Code:    http.StatusBadRequest,
			Message: "Missing request params",
		}
	}
	_, err := time.Parse("2006-01-02", req.Day)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusBadRequest,
			Message: "Date format must be yyyy-mm-dd",
		}
	}
	habitLog := model.HabitLogs{HabitID: habitID, Day: req.Day}
	stmt := HabitLogs.INSERT(HabitLogs.HabitID, HabitLogs.Day).MODEL(habitLog)
	_, err = stmt.ExecContext(ctx, db)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to log habit",
		}
	}
	return nil
}

func createHabit(ctx context.Context, db *sql.DB, req CreateHabitRequest) (*model.Habits, *HTTPError) {
	if req.UserID == "" || req.Name == "" {
		return nil, &HTTPError{
			Code:    http.StatusBadRequest,
			Message: "user_id and name are required",
		}
	}
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
func createUser(ctx context.Context, db *sql.DB, req CreateUserRequest) (*model.Users, *HTTPError) {
	if req.UserID == "" || req.Username == "" {
		return nil, &HTTPError{
			Code:    http.StatusBadRequest,
			Message: "UserID and Username are required",
		}
	}

	user := model.Users{UserID: &req.UserID, Username: req.Username}

	stmt := Users.INSERT(Users.UserID, Users.Username).MODEL(user).RETURNING(Users.AllColumns)

	dest := model.Users{}
	err := stmt.QueryContext(ctx, db, dest)
	if err != nil {
		return nil, &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to create user",
			Err:     err,
		}
	}

	// TODO: login
	// TODO: return jwt token
	return &user, nil
}
