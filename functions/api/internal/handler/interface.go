package api

type APIHandler interface {
	Ping()
	// auth
	Register()
	Login()

	// auth required
	LogHabit()
	UpdateHabit()
	CreateHabit()
	DeleteHabit()
	Sync()
}
