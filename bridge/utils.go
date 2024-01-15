package bridge

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"golang.org/x/text/encoding/simplifiedchinese"
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

func ConvertByte2String(byte []byte) string {
	decodeBytes, _ := simplifiedchinese.GB18030.NewDecoder().Bytes(byte)
	return string(decodeBytes)
}

func (a *App) AbsolutePath(path string) FlagResult {
	fmt.Println("AbsolutePath:", path)

	if(filepath.IsAbs(path)){
		return FlagResult{true, path}
	}

	path, err := GetPath(path)
	if err != nil {
		return FlagResult{false, err.Error()}
	}
	
	return FlagResult{true, path}
}