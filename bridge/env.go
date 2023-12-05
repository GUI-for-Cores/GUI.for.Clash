package bridge

import (
	"fmt"
	"net"
	"os/exec"
	"strings"
	"syscall"
)

func (a *App) GetEnv() EnvResult {
	return EnvResult{
		BasePath: Env.BasePath,
		AppName:  Env.AppName,
		OS:       Env.OS,
		ARCH:     Env.ARCH,
	}
}

// Maybe there is a better way
func (a *App) SetSystemProxy(enable bool, server string) FlagResult {
	if enable {
		fmt.Println("SetSystemProxy:", server)
	} else {
		fmt.Println("ClearSystemProxy:", server)
	}

	REG_DWORD, ProxyServer := "0", ""

	if enable {
		REG_DWORD = "1"
		ProxyServer = server
	}

	cmd := exec.Command("reg", "add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", REG_DWORD, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	cmd = exec.Command("reg", "add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyServer", "/d", ProxyServer, "/f")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err = cmd.CombinedOutput()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	return FlagResult{true, string(out)}
}

func (a *App) GetSystemProxy() FlagResult {
	fmt.Println("GetSystemProxy:")

	cmd := exec.Command("reg", "query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyEnable", "/t", "REG_DWORD")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	fields := strings.Fields(string(out))

	if len(fields) > 4 && fields[4] == "0x1" {
		cmd = exec.Command("reg", "query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings", "/v", "ProxyServer", "/t", "REG_SZ")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

		out, err = cmd.CombinedOutput()
		if err != nil {
			return FlagResult{false, err.Error()}
		}

		fields := strings.Fields(string(out))

		if len(fields) > 4 {
			return FlagResult{true, fields[4]}
		}

	}

	return FlagResult{true, ""}
}

func (a *App) GetInterfaces() FlagResult {
	interfaces, err := net.Interfaces()
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	var interfaceNames []string

	for _, inter := range interfaces {
		interfaceNames = append(interfaceNames, inter.Name)
	}

	return FlagResult{true, strings.Join(interfaceNames, "|")}
}
