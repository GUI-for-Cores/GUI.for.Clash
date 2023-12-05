package bridge

import (
	"context"
	"os"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"
)

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) Startup(ctx context.Context) {
	a.Ctx = ctx
}

var Env = &EnvResult{
	BasePath:  "",
	AppName:   "",
	UserAgent: "GUI.for.Clash/1.0",
	OS:        runtime.GOOS,
	ARCH:      runtime.GOARCH,
}

var Config = &AppConfig{
	DisableResize: true,
}

func InitBridge() {
	// step1: Set Env
	exePath, err := os.Executable()
	if err != nil {
		panic(err)
	}

	Env.BasePath = filepath.Dir(exePath)
	Env.AppName = filepath.Base(exePath)

	// step2: Read Config
	b, err := os.ReadFile(Env.BasePath + "/data/user.yaml")
	if err == nil {
		yaml.Unmarshal(b, &Config)
	}
}
