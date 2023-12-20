package bridge

import (
	"strings"

	"github.com/energye/systray"
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

			mShow.Click(func() {
				runtime.WindowShow(a.Ctx)
			})

			mHide.Click(func() {
				runtime.WindowHide(a.Ctx)
			})

			mQuit.Click(func() {
				InitBridge()
				if Config.CloseKernelOnExit {
					info := a.ProcessInfo(Config.Kernel.Pid)
					if info.Flag && strings.HasPrefix(info.Data, "mihomo") {
						a.KillProcess(int(Config.Kernel.Pid))
					}
					a.SetSystemProxy(false, "")
				}
				systray.Quit()
				runtime.Quit(a.Ctx)
			})

			systray.SetOnClick(func(menu systray.IMenu) {
				runtime.WindowShow(a.Ctx)
			})

			systray.SetOnRClick(func(menu systray.IMenu) {
				menu.ShowMenu()
			})
		}, nil)
	}()
}
