package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

func parseAndVerifyToken(token_string string) (*string, error) {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET not found in environment")
	}

	// Parse and verify the token
	token, err := jwt.Parse(token_string, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	subject, err := token.Claims.GetSubject()
	if err != nil {
		return nil, err
	}

	return &subject, nil
}

func UserFromToken(ctx context.Context, ds DataStore, token_string string) (*string, *HTTPError) {
	user_id, err := parseAndVerifyToken(token_string)
	if err != nil {
		fmt.Println(err)
		return nil, &HTTPError{Message: "Unauthorized", Code: http.StatusUnauthorized, Err: err}
	}
	db_err := ds.CreateUser(ctx, *user_id)
	if db_err != nil {
		return nil, db_err
	}
	return user_id, nil
}
