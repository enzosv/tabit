package main

import (
	"crypto/rsa"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

const jwksURL = "https://<your-project-id>.supabase.co/auth/v1/keys"

type JWKS struct {
	Keys []JSONWebKey `json:"keys"`
}

type JSONWebKey struct {
	Kid string   `json:"kid"`
	Kty string   `json:"kty"`
	Alg string   `json:"alg"`
	Use string   `json:"use"`
	N   string   `json:"n"`
	E   string   `json:"e"`
	X5c []string `json:"x5c"`
}

func getRSAPublicKeyFromJWKS(kid string) (*rsa.PublicKey, error) {
	resp, err := http.Get(jwksURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, err
	}

	for _, key := range jwks.Keys {
		if key.Kid == kid {
			// Decode the x5c certificate to get the public key
			cert := "-----BEGIN CERTIFICATE-----\n" + key.X5c[0] + "\n-----END CERTIFICATE-----"
			parsedKey, err := jwt.ParseRSAPublicKeyFromPEM([]byte(cert))
			if err != nil {
				return nil, err
			}
			return parsedKey, nil
		}
	}

	return nil, errors.New("no matching key found")
}

func parseAndVerifyToken(tokenStr string) (*jwt.Token, error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		// Get the kid from header
		if kid, ok := token.Header["kid"].(string); ok {
			return getRSAPublicKeyFromJWKS(kid)
		}
		return nil, errors.New("kid not found in token header")
	}

	token, err := jwt.Parse(tokenStr, keyFunc, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return token, nil
}
