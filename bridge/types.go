package bridge

import (
	"context"
	"net/http"
)

// App struct
type App struct {
	Ctx context.Context
}

type EnvResult struct {
	BasePath  string `json:"basePath"`
	AppName   string `json:"appName"`
	UserAgent string `json:"UserAgent"`
	OS        string `json:"os"`
	ARCH      string `json:"arch"`
}

type FlagResult struct {
	Flag bool   `json:"flag"`
	Data string `json:"data"`
}

type HTTPResult struct {
	Flag   bool        `json:"flag"`
	Header http.Header `json:"header"`
	Body   string      `json:"body"`
}

type AppConfig struct {
	Lang              string `yaml:"lang"`
	WindowStartState  int    `yaml:"windowStartState"`
	CloseKernelOnExit bool   `yaml:"closeKernelOnExit"`
	Kernel            struct {
		Pid int32 `yaml:"pid"`
	} `yaml:"kernel"`
}
