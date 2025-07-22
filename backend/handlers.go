package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gofrs/uuid"
	"github.com/gorilla/mux"
)

func ScheduleMeetingHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name     string `json:"name"`
			Email    string `json:"email"`
			Purpose  string `json:"purpose"`
			Date     string `json:"date"`
			Time     string `json:"time"`
			Timezone string `json:"timezone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// Validate date and time are not in the past (UTC)
		layout := "2006-01-02T15:04"
		meetingTime, err := time.Parse(layout, req.Date+"T"+req.Time)
		if err != nil {
			http.Error(w, "Invalid date or time format", http.StatusBadRequest)
			return
		}
		if meetingTime.Before(time.Now().UTC()) {
			http.Error(w, "Meeting date and time cannot be in the past", http.StatusBadRequest)
			return
		}

		id, err := uuid.NewV7()
		if err != nil {
			http.Error(w, "Failed to generate ID", http.StatusInternalServerError)
			return
		}

		createdAt := time.Now().UTC()
		_, err = db.Exec(`INSERT INTO meetings (id, name, email, purpose, date, time, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			id.String(), req.Name, req.Email, req.Purpose, req.Date, req.Time, req.Timezone, createdAt)
		if err != nil {
			http.Error(w, "Failed to save meeting", http.StatusInternalServerError)
			return
		}

		resp := map[string]string{"id": id.String()}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

func GetMeetingHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		id := vars["id"]
		row := db.QueryRow(`SELECT id, name, email, purpose, date, time, timezone, created_at FROM meetings WHERE id = ?`, id)
		var m Meeting
		err := row.Scan(&m.ID, &m.Name, &m.Email, &m.Purpose, &m.Date, &m.Time, &m.Timezone, &m.CreatedAt)
		if err == sql.ErrNoRows {
			http.Error(w, "Meeting not found", http.StatusNotFound)
			return
		} else if err != nil {
			http.Error(w, "Failed to fetch meeting", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(m)
	}
}
