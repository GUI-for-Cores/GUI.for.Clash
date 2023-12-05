package bridge

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func (a *App) HttpGet(url string, headers map[string]string) HTTPResult {
	fmt.Println("HttpGet:", url, headers)

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	header := make(http.Header)

	header.Set("User-Agent", Env.UserAgent)

	for key, value := range headers {
		header.Set(key, value)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return HTTPResult{false, nil, err.Error()}
	}

	req.Header = header

	resp, err := client.Do(req)
	if err != nil {
		return HTTPResult{false, nil, err.Error()}
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return HTTPResult{false, nil, err.Error()}
	}

	return HTTPResult{true, resp.Header, string(b)}
}

func (a *App) Download(url string, path string) FlagResult {
	fmt.Println("Download:", url, path)

	path, err := GetPath(path)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	err = os.MkdirAll(filepath.Dir(path), os.ModePerm)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	client := &http.Client{}
	header := make(http.Header)
	header.Set("User-Agent", Env.UserAgent)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	req.Header = header

	resp, err := client.Do(req)
	if err != nil {
		return FlagResult{false, err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return FlagResult{true, fmt.Sprintf("Code: %d", resp.StatusCode)}
	}

	file, err := os.Create(path)
	if err != nil {
		return FlagResult{false, err.Error()}
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	return FlagResult{true, "Success"}
}
