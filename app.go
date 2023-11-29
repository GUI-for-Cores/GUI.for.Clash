package main

import (
	"archive/zip"
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/shirou/gopsutil/process"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

var (
	UserAgent = "GUI.for.Clash/1.0"
)

type ApiIOResult struct {
	Flag bool   `json:"flag"`
	Data string `json:"data"`
}

func (a *App) Writefile(path string, content string) ApiIOResult {
	fmt.Println("Writefile:", path)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)
	err = os.MkdirAll(filepath.Dir(path), os.ModePerm)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	err = os.WriteFile(path, []byte(content), 0644)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	return ApiIOResult{true, "Success"}
}

func (a *App) Readfile(path string) ApiIOResult {
	fmt.Println("Readfile:", path)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)
	b, err := os.ReadFile(path)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	return ApiIOResult{true, string(b)}
}

type ApiHTTPResult struct {
	Flag   bool        `json:"flag"`
	Header http.Header `json:"header"`
	Body   string      `json:"body"`
}

func (a *App) HttpGet(url string, headers map[string]string) ApiHTTPResult {
	fmt.Println("HttpGet:", url, headers)
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	header := make(http.Header)

	header.Set("User-Agent", UserAgent)

	for key, value := range headers {
		header.Set(key, value)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return ApiHTTPResult{false, nil, err.Error()}
	}

	req.Header = header

	resp, err := client.Do(req)
	if err != nil {
		return ApiHTTPResult{false, nil, err.Error()}
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return ApiHTTPResult{false, nil, err.Error()}
	}

	return ApiHTTPResult{true, resp.Header, string(b)}
}

func (a *App) Download(url string, path string) ApiIOResult {
	fmt.Println("Download:", url, path)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)
	err = os.MkdirAll(filepath.Dir(path), os.ModePerm)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	client := &http.Client{}
	header := make(http.Header)
	header.Set("User-Agent", UserAgent)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	req.Header = header

	resp, err := client.Do(req)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ApiIOResult{true, fmt.Sprintf("Code: %d", resp.StatusCode)}
	}

	file, err := os.Create(path)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, "Success"}
}

func (a *App) UnzipZIPFile(path string, output string) ApiIOResult {
	fmt.Println("UnzipZIPFile:", path, output)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)
	output = filepath.Join(cwd, output)

	archive, err := zip.OpenReader(path)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	defer archive.Close()

	for _, f := range archive.File {
		filePath := filepath.Join(output, f.Name)

		if !strings.HasPrefix(filePath, filepath.Clean(output)+string(os.PathSeparator)) {
			fmt.Println("invalid file path")
			return ApiIOResult{false, err.Error()}
		}
		if f.FileInfo().IsDir() {
			os.MkdirAll(filePath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil {
			return ApiIOResult{false, err.Error()}
		}

		dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return ApiIOResult{false, err.Error()}
		}
		defer dstFile.Close()

		fileInArchive, err := f.Open()
		if err != nil {
			return ApiIOResult{false, err.Error()}
		}
		defer fileInArchive.Close()

		if _, err := io.Copy(dstFile, fileInArchive); err != nil {
			return ApiIOResult{false, err.Error()}
		}
	}
	return ApiIOResult{true, "Success"}
}

func (a *App) Getcwd() ApiIOResult {
	fmt.Println("Getcwd:")
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	return ApiIOResult{true, cwd}
}

func (a *App) Exec(path string, args []string) ApiIOResult {
	fmt.Println("Exec:", path, args)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)

	cmd := exec.Command(path, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, string(out)}
}

func (a *App) StartKernel(path string, directory string) ApiIOResult {
	fmt.Println("StartKernel:", path, directory)
	cwd, err := os.Getwd()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}
	path = filepath.Join(cwd, path)
	directory = filepath.Join(cwd, directory)

	cmd := exec.Command(path, "-d", directory)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	err = cmd.Start()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	scanner := bufio.NewScanner(stdout)

	go func() {
		for scanner.Scan() {
			runtime.EventsEmit(a.ctx, "kernelLog", scanner.Text())
		}
		runtime.EventsEmit(a.ctx, "kernelLog", "msg=\"The kernel has stopped.\"")
		runtime.EventsEmit(a.ctx, "kernelStatus", 0)
	}()

	pid := cmd.Process.Pid

	runtime.EventsEmit(a.ctx, "kernelStatus", pid)

	return ApiIOResult{true, strconv.Itoa(pid)}
}

func (a *App) ProcessInfo(pid int32) ApiIOResult {
	fmt.Println("ProcessInfo:", pid)
	proc, err := process.NewProcess(pid)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	name, err := proc.Name()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, name}
}

func (a *App) KillProcess(pid int) ApiIOResult {
	fmt.Println("KillProcess:", pid)
	process, err := os.FindProcess(pid)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	err = process.Signal(syscall.SIGKILL)
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, "Success"}
}

// Maybe there is a better way
func (a *App) SetSystemProxy(enable bool, server string) ApiIOResult {
	fmt.Println("SetSystemProxy:", server)

	REG_DWORD, ProxyServer := "0", ""

	if enable {
		REG_DWORD = "1"
		ProxyServer = server
	}

	cmd := exec.Command("reg", "add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", REG_DWORD, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	cmd = exec.Command("reg", "add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyServer", "/d", ProxyServer, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err = cmd.CombinedOutput()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, string(out)}
}

func (a *App) GetSystemProxy() ApiIOResult {
	cmd := exec.Command("reg", "query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	cmd = exec.Command("reg", "add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyServer", "/t", "REG_SZ")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err = cmd.CombinedOutput()
	if err != nil {
		return ApiIOResult{false, err.Error()}
	}

	return ApiIOResult{true, string(out)}

}
