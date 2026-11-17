// SłupStal – program dla Windows: okno WebView2 z interfejsem SlupStal.html
// (jak BelkaStal/SłupŻB). Most JS ↔ Go:
//   hostRequest(json) – operacje plikowe: {id, op:'save'|'open', path, name, content, b64, filter}
//                       → odpowiedź window.__hostReply(id, {ok, path, content, err})
//   hostStore(json)   – autozapis stanu (%LOCALAPPDATA%\SlupStal\autosave.json)
//   hostTitle(text)   – tytuł okna
// Przy starcie: window.__AUTOSAVE (ostatni stan) i window.__hostOpenFile
// (plik podany w wierszu poleceń – np. dwuklik na *.slupstal).
//go:build windows

package main

import (
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

//go:embed SlupStal.html
var appHTML string

const appName = "SłupStal"

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	comdlg32 = syscall.NewLazyDLL("comdlg32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")

	procMessageBoxW                   = user32.NewProc("MessageBoxW")
	procSetProcessDpiAwarenessContext = user32.NewProc("SetProcessDpiAwarenessContext")
	procSetProcessDPIAware            = user32.NewProc("SetProcessDPIAware")
	procGetOpenFileNameW              = comdlg32.NewProc("GetOpenFileNameW")
	procGetSaveFileNameW              = comdlg32.NewProc("GetSaveFileNameW")
	procShellExecuteW                 = shell32.NewProc("ShellExecuteW")
)

func utf16z(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func messageBox(title, text string, flags uintptr) {
	procMessageBoxW.Call(0, uintptr(unsafe.Pointer(utf16z(text))), uintptr(unsafe.Pointer(utf16z(title))), flags)
}

// katalog danych programu: %LOCALAPPDATA%\SlupStal
func dataDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	d := filepath.Join(base, "SlupStal")
	_ = os.MkdirAll(d, 0o755)
	return d
}

/* ------------------------------------------------------------ okna wyboru plików (comdlg32) */
type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	Flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        uintptr
	dwReserved        uint32
	FlagsEx           uint32
}

const (
	ofnOverwritePrompt = 0x00000002
	ofnNoChangeDir     = 0x00000008
	ofnPathMustExist   = 0x00000800
	ofnFileMustExist   = 0x00001000
	ofnExplorer        = 0x00080000
)

type filterDef struct {
	pairs []string // opis, wzorzec, opis, wzorzec…
	ext   string
}

func filterFor(kind string) filterDef {
	switch kind {
	case "html":
		return filterDef{[]string{"Raport HTML (*.html)", "*.html;*.htm", "Wszystkie pliki (*.*)", "*.*"}, "html"}
	case "odt":
		return filterDef{[]string{"Dokument OpenDocument (*.odt)", "*.odt", "Wszystkie pliki (*.*)", "*.*"}, "odt"}
	case "json":
		return filterDef{[]string{"Dane JSON (*.json)", "*.json", "Wszystkie pliki (*.*)", "*.*"}, "json"}
	default:
		return filterDef{[]string{"Projekt SłupStal (*.slupstal)", "*.slupstal", "Raport SłupStal z danymi (*.html)", "*.html;*.htm", "Dane JSON (*.json)", "*.json", "Wszystkie pliki (*.*)", "*.*"}, "slupstal"}
	}
}

func filterUTF16(f filterDef) *uint16 {
	s := strings.Join(f.pairs, "\x00") + "\x00\x00"
	u := syscall.StringToUTF16(s)
	return &u[0]
}

func fileDialog(owner uintptr, save bool, kind, defName, title string) (string, bool) {
	f := filterFor(kind)
	buf := make([]uint16, 32768)
	if defName != "" {
		copy(buf, syscall.StringToUTF16(defName))
	}
	ofn := openFileName{
		hwndOwner:    owner,
		lpstrFilter:  filterUTF16(f),
		nFilterIndex: 1,
		lpstrFile:    &buf[0],
		nMaxFile:     uint32(len(buf)),
		lpstrTitle:   utf16z(title),
		lpstrDefExt:  utf16z(f.ext),
	}
	ofn.lStructSize = uint32(unsafe.Sizeof(ofn))
	var r uintptr
	if save {
		ofn.Flags = ofnOverwritePrompt | ofnPathMustExist | ofnExplorer | ofnNoChangeDir
		r, _, _ = procGetSaveFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	} else {
		ofn.Flags = ofnFileMustExist | ofnPathMustExist | ofnExplorer | ofnNoChangeDir
		r, _, _ = procGetOpenFileNameW.Call(uintptr(unsafe.Pointer(&ofn)))
	}
	if r == 0 {
		return "", false
	}
	return syscall.UTF16ToString(buf), true
}

func shellOpen(path string) {
	procShellExecuteW.Call(0, uintptr(unsafe.Pointer(utf16z("open"))), uintptr(unsafe.Pointer(utf16z(path))), 0, 0, 1)
}

/* ------------------------------------------------------------ most JS ↔ Go */
type request struct {
	ID      int    `json:"id"`
	Op      string `json:"op"`
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
	B64     bool   `json:"b64"`
	Filter  string `json:"filter"`
	URL     string `json:"url"`
}

type reply struct {
	OK      bool   `json:"ok"`
	Path    string `json:"path,omitempty"`
	Content string `json:"content,omitempty"`
	Err     string `json:"err,omitempty"`
}

func jsonStr(v interface{}) string { b, _ := json.Marshal(v); return string(b) }

func handle(w webview2.WebView, req request) reply {
	owner := uintptr(w.Window())
	switch req.Op {
	case "save":
		p := req.Path
		if p == "" {
			sel, ok := fileDialog(owner, true, req.Filter, req.Name, "Zapisz jako")
			if !ok {
				return reply{OK: false}
			}
			p = sel
		}
		var data []byte
		if req.B64 {
			b, err := base64.StdEncoding.DecodeString(req.Content)
			if err != nil {
				return reply{Err: err.Error()}
			}
			data = b
		} else {
			data = []byte(req.Content)
		}
		if err := os.WriteFile(p, data, 0o644); err != nil {
			return reply{Err: err.Error()}
		}
		return reply{OK: true, Path: p}
	case "open":
		p, ok := fileDialog(owner, false, req.Filter, "", "Otwórz")
		if !ok {
			return reply{OK: false}
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return reply{Err: err.Error()}
		}
		return reply{OK: true, Path: p, Content: string(b)}
	case "shell":
		if req.URL != "" {
			shellOpen(req.URL)
		}
		return reply{OK: true}
	}
	return reply{Err: "nieznana operacja: " + req.Op}
}

func main() {
	// ostrość na monitorach o dużej gęstości pikseli
	if procSetProcessDpiAwarenessContext.Find() == nil {
		procSetProcessDpiAwarenessContext.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
	} else if procSetProcessDPIAware.Find() == nil {
		procSetProcessDPIAware.Call()
	}
	dir := dataDir()
	htmlPath := filepath.Join(dir, "SlupStal.html")
	_ = os.WriteFile(htmlPath, []byte(appHTML), 0o644)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title:  appName,
			Width:  1440,
			Height: 900,
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		messageBox(appName, "Nie można uruchomić środowiska Microsoft Edge WebView2.\r\nZainstaluj WebView2 Runtime (Evergreen) ze strony Microsoft i uruchom program ponownie.\r\n\r\nInterfejs można też otworzyć bez instalacji: plik "+htmlPath+" w przeglądarce.", 0x10)
		return
	}
	defer w.Destroy()

	// stan z autozapisu
	if b, err := os.ReadFile(filepath.Join(dir, "autosave.json")); err == nil && json.Valid(b) {
		w.Init("window.__AUTOSAVE = " + string(b) + ";")
	}
	// plik z wiersza poleceń
	if len(os.Args) > 1 {
		p := os.Args[1]
		if b, err := os.ReadFile(p); err == nil {
			w.Init("window.__hostOpenFile = " + jsonStr(map[string]string{"path": p, "content": string(b)}) + ";")
		}
	}

	_ = w.Bind("hostRequest", func(s string) {
		var req request
		if err := json.Unmarshal([]byte(s), &req); err != nil {
			return
		}
		go w.Dispatch(func() {
			res := handle(w, req)
			w.Eval("window.__hostReply(" + jsonStr(req.ID) + ", " + jsonStr(res) + ");")
		})
	})
	_ = w.Bind("hostStore", func(s string) {
		if json.Valid([]byte(s)) {
			_ = os.WriteFile(filepath.Join(dir, "autosave.json"), []byte(s), 0o644)
		}
	})
	_ = w.Bind("hostTitle", func(s string) { w.SetTitle(s) })

	w.Navigate("file:///" + filepath.ToSlash(htmlPath))
	w.Run()
}
