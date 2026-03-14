.PHONY: build run dev test clean migrate-up migrate-down

BINARY=bin/server
MAIN=./cmd/server

build:
	go build -o $(BINARY) $(MAIN)

run: build
	./$(BINARY)

dev:
	go run $(MAIN)

test:
	go test ./...

clean:
	rm -rf bin/

tidy:
	go mod tidy

migrate-up:
	@echo "Run: migrate -database $$DATABASE_URL -path internal/db/migrations up"

migrate-down:
	@echo "Run: migrate -database $$DATABASE_URL -path internal/db/migrations down"

lint:
	golangci-lint run ./...
