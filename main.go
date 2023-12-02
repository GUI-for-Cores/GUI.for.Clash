package main

import (
	"embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/getlantern/systray"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Lang              string `yaml:"lang"`
	DisableResize     bool   `yaml:"disableResize"`
	WindowStartState  int    `yaml:"windowStartState"`
	CloseKernelOnExit bool   `yaml:"closeKernelOnExit"`
	Kernel            struct {
		Pid int32 `yaml:"pid"`
	} `yaml:"kernel"`
}

//go:embed all:frontend/dist
var assets embed.FS

//go:embed frontend/dist/favicon.ico
var icon []byte

var basePath string
var appName string

var config = &Config{
	DisableResize: true,
}

func main() {
	exePath, err := os.Executable()
	if err != nil {
		panic(err)
	}

	basePath = filepath.Dir(exePath)
	appName = filepath.Base(exePath)

	// Read Config file
	InitConfig()

	// Create an instance of the app structure
	app := NewApp()

	CreateTray(app)

	// Create application with options
	err = wails.Run(&options.App{
		Title:            "GUI.for.Clash",
		Width:            800,
		Height:           540,
		Frameless:        true,
		DisableResize:    config.DisableResize,
		StartHidden:      config.WindowStartState == 2,
		WindowStartState: options.WindowStartState(config.WindowStartState),
		MinWidth:         600,
		MinHeight:        400,
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			BackdropType:         windows.Acrylic,
		},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func InitConfig() {
	b, err := os.ReadFile(basePath + "/data/user.yaml")
	if err != nil {
		println("InitConfig Error:", err.Error())
		return
	}
	yaml.Unmarshal(b, &config)
}

func CreateTray(a *App) {
	menu := map[string]([2]string){
		"Show": {"Show", "Show Window"},
		"Hide": {"Hide", "Hide Window"},
		"Quit": {"Quit", "Quit Application"},
	}

	if config.Lang == "zh" {
		menu = map[string]([2]string){
			"Show": {"显示", "显示窗口"},
			"Hide": {"隐藏", "隐藏窗口"},
			"Quit": {"退出", "退出程序"},
		}
	}

	go func() {
		systray.Run(func() {
			systray.SetIcon(icon)
			systray.SetTitle("GUI.for.Clash")
			systray.SetTooltip("GUI.for.Clash")
			mShow := systray.AddMenuItem(menu["Show"][0], menu["Show"][1])
			mHide := systray.AddMenuItem(menu["Hide"][0], menu["Hide"][1])
			systray.AddSeparator()
			mQuit := systray.AddMenuItem(menu["Quit"][0], menu["Quit"][1])

			for {
				select {
				case <-mShow.ClickedCh:
					runtime.WindowShow(a.ctx)
				case <-mHide.ClickedCh:
					runtime.WindowHide(a.ctx)
				case <-mQuit.ClickedCh:
					InitConfig()
					if config.CloseKernelOnExit {
						info := a.ProcessInfo(config.Kernel.Pid)
						if info.Flag && strings.HasPrefix(info.Data, "mihomo") {
							a.KillProcess(int(config.Kernel.Pid))
						}
					}
					systray.Quit()
					runtime.Quit(a.ctx)
				}
			}
		}, nil)
	}()
}

func GetPath(path string) (string, error) {
	path = filepath.Join(basePath, path)
	path = filepath.Clean(path)
	if !strings.HasPrefix(path, basePath) {
		fmt.Println("Error Path: " + path)
		return "", errors.New("Path error:" + path)
	}
	return path, nil
}
