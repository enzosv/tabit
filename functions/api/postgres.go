package main

import (
	"context"
	"encoding/json"
	"log"
	"log/slog"
	"net/http"

	"github.com/go-jet/jet/v2/qrm"

	"tabit-serverless/.gen_pg/tabit/public/model"
	. "tabit-serverless/.gen_pg/tabit/public/table"

	. "github.com/go-jet/jet/v2/postgres"
	_ "github.com/lib/pq"
)

func (ds *PostgresDataStore) Close() error {
	return ds.DB.Close()
}

func (ds *PostgresDataStore) CreateUser(ctx context.Context, user_id string) *HTTPError {
	user := model.Users{UserID: user_id}

	stmt := Users.INSERT(Users.UserID).MODEL(user).ON_CONFLICT().DO_NOTHING()

	_, err := stmt.ExecContext(ctx, ds.DB)
	if err != nil {
		return &HTTPError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to create user",
			Err:     err,
		}
	}
	return nil
}

func (ds *PostgresDataStore) SyncUserData(ctx context.Context, user_id string, req SyncDataRequest) (*UserSyncStateModel, *HTTPError) {
	jsonData, jsonErr := json.Marshal(req.HabitData)
	if jsonErr != nil {
		log.Printf("Error marshaling habit data for user %s: %v", user_id, jsonErr)
		return nil, &HTTPError{Code: http.StatusInternalServerError, Message: "Failed to serialize data", Err: jsonErr}
	}

	var existing UserSyncStateModel
	stmt := SELECT(UserSyncState.AllColumns).
		FROM(UserSyncState).
		WHERE(UserSyncState.UserID.EQ(String(user_id)))
	err := stmt.QueryContext(ctx, ds.DB, &existing)

	if err != nil && err != qrm.ErrNoRows {
		slog.ErrorContext(ctx, "Error querying sync state", "user", user_id, "error", err)
		return nil, &HTTPError{Code: http.StatusInternalServerError, Message: "Database error checking sync state", Err: err}
	}

	if existing.LastUpdated > req.ClientTimestamp {
		return &existing, nil
	}

	model := UserSyncStateModel{UserID: user_id, Data: string(jsonData), LastUpdated: req.ClientTimestamp}

	// Perform UPSERT
	upsert := UserSyncState.INSERT(UserSyncState.UserID, UserSyncState.Data, UserSyncState.LastUpdated).
		MODEL(model).
		ON_CONFLICT(UserSyncState.UserID).
		DO_UPDATE(
			SET(UserSyncState.Data.SET(UserSyncState.EXCLUDED.Data),
				UserSyncState.LastUpdated.SET(UserSyncState.EXCLUDED.LastUpdated),
			),
		)

	_, err = upsert.ExecContext(ctx, ds.DB)
	if err != nil {
		slog.ErrorContext(ctx, "Error upserting sync state", "user", user_id, "err", err)
		return nil, &HTTPError{Code: http.StatusInternalServerError, Message: "Failed to save sync state", Err: err}
	}
	return &model, nil
}
