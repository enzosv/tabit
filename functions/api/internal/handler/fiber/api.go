package fiberhandler

import (
	"strconv"
	api "tabit-serverless/internal/domain"

	"github.com/gofiber/fiber/v2"
)

// Ping server
func Ping(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).SendString("pong")
}

func LogHabit(c *fiber.Ctx) error {
	habitID, err := strconv.Atoi(c.Params("habitID"))
	if habitID == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "unable to find habit with id 0",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var req api.LogHabitRequest
	err = c.BodyParser(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}
	err = req.Validate()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// dbErr := logHabit(c.Context(), db, req, int32(habitID))
	// if dbErr != nil {
	// 	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
	// 		"error": err.Error(),
	// 	})
	// }
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "ok",
	})
}
