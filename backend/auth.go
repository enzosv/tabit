package main

import (
	"errors"
	"fmt"
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
