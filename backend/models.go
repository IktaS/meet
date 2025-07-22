package main

import "time"

// Meeting represents a scheduled meeting
// ID is a UUID v7 string
// Date and Time are stored as strings for simplicity
// CreatedAt is a timestamp

type Meeting struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	Purpose   string    `json:"purpose" db:"purpose"`
	Date      string    `json:"date" db:"date"`
	Time      string    `json:"time" db:"time"`
	Timezone  string    `json:"timezone" db:"timezone"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

