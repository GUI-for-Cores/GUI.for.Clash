package bridge

import (
	"strings"

	"github.com/getlantern/systray"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func CreateTray(a *App, icon []byte) {
	menu := map[string]([2]string){
		"Show": {"Show", "Show Window"},
		"Hide": {"Hide", "Hide Window"},
		"Quit": {"Quit", "Quit Application"},
	}

	if Config.Lang == "zh" {
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
					runtime.WindowShow(a.Ctx)
				case <-mHide.ClickedCh:
					runtime.WindowHide(a.Ctx)
				case <-mQuit.ClickedCh:
					InitBridge()
					if Config.CloseKernelOnExit {
						info := a.ProcessInfo(Config.Kernel.Pid)
						if info.Flag && strings.HasPrefix(info.Data, "mihomo") {
							a.KillProcess(int(Config.Kernel.Pid))
						}
					}
					systray.Quit()
					runtime.Quit(a.Ctx)
				}
			}
		}, nil)
	}()
}
