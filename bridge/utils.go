package bridge

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

func GetPath(path string) (string, error) {
	path = filepath.Join(Env.BasePath, path)
	path = filepath.Clean(path)
	if !strings.HasPrefix(path, Env.BasePath) {
		fmt.Println("Error Path: " + path)
		return "", errors.New("Path error:" + path)
	}
	return path, nil
}
