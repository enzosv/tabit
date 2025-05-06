package main

import (
	"context"
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

func (ds *PostgresDataStore) SyncUserData(ctx context.Context, user_id string, last_updated int64, jsonData []byte) (*UserSyncStateModel, *HTTPError) {

	var existing model.UserSyncState
	stmt := SELECT(UserSyncState.AllColumns).
		FROM(UserSyncState).
		WHERE(UserSyncState.UserID.EQ(Text(user_id)))
	err := stmt.Query(ds.DB, &existing)

	if err != nil && err != qrm.ErrNoRows {
		log.Println(stmt.Sql())

		slog.ErrorContext(ctx, "Error querying sync state", "user", user_id, "error", err)
		return nil, &HTTPError{Code: http.StatusInternalServerError, Message: "Database error checking sync state", Err: err}
	}
	if err != qrm.ErrNoRows {
		if existing.UserID == "" {
			log.Println(stmt.Sql())
			slog.WarnContext(ctx, "existing is likely invalid", "data", existing.Data, "user", existing.UserID)
			return nil, &HTTPError{Code: http.StatusInternalServerError, Message: "Database error checking sync state"}
		}

		if existing.LastUpdated > last_updated {
			slog.InfoContext(ctx, "returning existing", "user", user_id, "last_updated", last_updated)
			return &UserSyncStateModel{
				UserID:      existing.UserID,
				LastUpdated: existing.LastUpdated,
				Data:        existing.Data,
			}, nil
		}
	}
	slog.InfoContext(ctx, "upserting new time", "user", user_id, "last_updated", last_updated)

	toInsert := UserSyncStateModel{UserID: user_id, Data: string(jsonData), LastUpdated: last_updated}

	// Perform UPSERT
	upsert := UserSyncState.INSERT(UserSyncState.UserID, UserSyncState.Data, UserSyncState.LastUpdated).
		MODEL(toInsert).
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

	var dest model.UserSyncState

	qins := SELECT(UserSyncState.AllColumns).
		FROM(UserSyncState)
	_ = qins.Query(ds.DB, &dest)
	log.Println(dest, string(jsonData))

	return &toInsert, nil
}
