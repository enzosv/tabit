package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"os"
	fiberhandler "tabit-serverless/internal/handler/fiber"
	muxhandler "tabit-serverless/internal/handler/mux"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/core"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/awslabs/aws-lambda-go-api-proxy/gorillamux"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	_ "github.com/mattn/go-sqlite3"
)

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

// Unwrap allows errors.Is and errors.As to work with wrapped errors
func (e *HTTPError) Unwrap() error {
	return e.Err
}

var muxLambda *gorillamux.GorillaMuxAdapter
var fiberLambda *fiberadapter.FiberLambda

func init() {
	err := godotenv.Load()
	if err != nil {
		slog.Warn("Failed to load env", "err", err)
	}
	// Initialize database
	connStr := os.Getenv("PG_URL")
	if connStr == "" {
		log.Fatal("Database connection string is empty")
	}
	fmt.Println("connStr", connStr)

	ds, err := NewDataStore(PostgresDB, connStr)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize router
	router := muxhandler.NewRouter(ds)
	muxLambda = gorillamux.New(router)

	app := fiber.New()
	app.Post("/:habitID/log", fiberhandler.LogHabit)
	fiberLambda = fiberadapter.New(app)
}

func main() {
	lambda.Start(Handler)
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	r, err := muxLambda.ProxyWithContext(ctx, *core.NewSwitchableAPIGatewayRequestV1(&req))
	return *r.Version1(), err
}
