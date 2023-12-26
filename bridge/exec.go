package bridge

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"

	"github.com/shirou/gopsutil/process"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) Exec(path string, args []string) FlagResult {
	fmt.Println("Exec:", path, args)

	path, err := GetPath(path)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	cmd := exec.Command(path, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	return FlagResult{true, string(out)}
}

func (a *App) StartKernel(path string, directory string) FlagResult {
	fmt.Println("StartKernel:", path, directory)

	path, err := GetPath(path)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	directory, err = GetPath(directory)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	cmd := exec.Command(path, "-d", directory)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	err = cmd.Start()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	scanner := bufio.NewScanner(stdout)

	go func() {
		for scanner.Scan() {
			text := scanner.Text()
			runtime.EventsEmit(a.Ctx, "kernelLog", text)
			if strings.Contains(strings.ToLower(text), "start initial compatible provider default") {
				runtime.EventsEmit(a.Ctx, "kernelStarted", "")
			}
		}
		runtime.EventsEmit(a.Ctx, "kernelStopped", "")
	}()

	pid := cmd.Process.Pid

	runtime.EventsEmit(a.Ctx, "kernelPid", pid)

	return FlagResult{true, strconv.Itoa(pid)}
}

func (a *App) ProcessInfo(pid int32) FlagResult {
	fmt.Println("ProcessInfo:", pid)

	proc, err := process.NewProcess(pid)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	name, err := proc.Name()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	return FlagResult{true, name}
}

func (a *App) KillProcess(pid int) FlagResult {
	fmt.Println("KillProcess:", pid)

	process, err := os.FindProcess(pid)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	err = process.Signal(syscall.SIGKILL)
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	return FlagResult{true, "Success"}
}
