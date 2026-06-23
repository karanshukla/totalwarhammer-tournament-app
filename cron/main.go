package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI environment variable is required")
	}

	scriptPath := os.Getenv("SCRIPT_PATH")
	if scriptPath == "" {
		log.Fatal("SCRIPT_PATH environment variable is required")
	}

	abs, err := filepath.Abs(scriptPath)
	if err != nil {
		log.Fatalf("cannot resolve script path %q: %v", scriptPath, err)
	}

	if _, err := os.Stat(abs); os.IsNotExist(err) {
		log.Fatalf("script not found: %s", abs)
	}

	fmt.Printf("running script: %s\n", abs)

	cmd := exec.Command("mongosh", "--nodb", "--norc", mongoURI, "--file", abs)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatalf("script failed: %v", err)
	}

	fmt.Println("script completed successfully")
}
