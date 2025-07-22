package main

import (
	"database/sql"
	"log"
	_ "github.com/mattn/go-sqlite3"
)

func InitDB(filepath string) *sql.DB {
	db, err := sql.Open("sqlite3", filepath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	createTable := `CREATE TABLE IF NOT EXISTS meetings (
		id TEXT PRIMARY KEY,
		name TEXT,
		email TEXT,
		purpose TEXT,
		date TEXT,
		time TEXT,
		timezone TEXT,
		created_at DATETIME
	);`

	_, err = db.Exec(createTable)
	if err != nil {
		log.Fatalf("failed to create meetings table: %v", err)
	}

	return db
}

