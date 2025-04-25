package main

import (
	"context"
	"database/sql"
	"net/http"

	. "github.com/go-jet/jet/v2/sqlite"

	_ "github.com/mattn/go-sqlite3"

	"tabit-serverless/.gen/model"
	. "tabit-serverless/.gen/table"
)

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

func getHabits(ctx context.Context, db *sql.DB, user_id string) error {
	stmt := SELECT(Habits.HabitID, Habits.Name).FROM(Habits).WHERE(Habits.UserID.EQ(String(user_id))).ORDER_BY(Habits.CreatedAt)

	var dest []struct {
		HabitID int64  `json:"habit_id"`
		Name    string `json:"name"`
	}
	err := stmt.QueryContext(ctx, db, dest)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to query habits",
		}
	}
	return nil
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
