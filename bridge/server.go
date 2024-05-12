package bridge

import (
	"context"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var serverMap = make(map[string]*http.Server)

type ResponseData struct {
	Status int
	Body   string
}

func (a *App) StartServer(address string) FlagResult {
	log.Printf("StartServer: %s", address)

	serverID := uuid.New().String()

	server := &http.Server{
		Addr: address,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := uuid.New().String()
			done := make(chan ResponseData)
			runtime.EventsEmit(a.Ctx, serverID, requestID, r.Method, r.URL.Path, r.URL.Query(), r.Header, r.Body)
			runtime.EventsOn(a.Ctx, requestID, func(data ...interface{}) {
				log.Printf("receive => %v", data...)
				runtime.EventsOff(a.Ctx, requestID)
				resp := ResponseData{200, "A sample http server"}
				if len(data) >= 2 {
					if status, ok := data[0].(int); ok {
						resp.Status = status
					}
					if body, ok := data[1].(string); ok {
						resp.Body = body
					}
				}
				done <- resp
			})
			res := <-done
			w.WriteHeader(res.Status)
			w.Write([]byte(res.Body))
		}),
	}

	go func() { server.ListenAndServe() }()

	serverMap[serverID] = server

	return FlagResult{true, serverID}
}

func (a *App) StopServer(id string) FlagResult {
	log.Printf("StopServer: %s", id)

	server, ok := serverMap[id]
	if !ok {
		return FlagResult{false, "server not found"}
	}

	err := server.Shutdown(context.TODO())
	if err != nil {
		return FlagResult{false, err.Error()}
	}

	delete(serverMap, id)

	return FlagResult{true, "Success"}
}

func (a *App) ListServer() {
	log.Printf("ListServer: %v", serverMap)
}
