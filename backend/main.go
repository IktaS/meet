package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	db := InitDB("database.sqlite")
	defer db.Close()

	r := mux.NewRouter()

	// API endpoints (handlers to be implemented)
	r.HandleFunc("/api/schedule", ScheduleMeetingHandler(db)).Methods("POST")
	r.HandleFunc("/api/meeting/{id}", GetMeetingHandler(db)).Methods("GET")

	// WebSocket for signaling (to be implemented)
	r.HandleFunc("/ws/signaling", func(w http.ResponseWriter, r *http.Request) {
		SignalingHandler(db, w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	log.Printf("Server running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(r)))
}
