package main

import (
	"embed"
	"guiforclash/bridge"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed frontend/dist/favicon.ico
var icon []byte

func main() {
	bridge.InitBridge()

	isFromTaskSch := false
	for _, v := range os.Args {
		if v == "tasksch" {
			isFromTaskSch = true
		}
	}

	// Create an instance of the app structure
	app := bridge.NewApp()

	bridge.CreateTray(app, icon)

	// Create application with options
	err := wails.Run(&options.App{
		Title:         "GUI.for.Clash",
		Width:         800,
		Height:        540,
		Frameless:     true,
		DisableResize: false,
		StartHidden: func() bool {
			if isFromTaskSch {
				return bridge.Config.WindowStartState == 2
			}
			return false
		}(),
		WindowStartState: func() options.WindowStartState {
			if isFromTaskSch {
				return options.WindowStartState(bridge.Config.WindowStartState)
			}
			return 0
		}(),
		MinWidth:  600,
		MinHeight: 400,
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			BackdropType:         windows.Acrylic,
		},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.Startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
