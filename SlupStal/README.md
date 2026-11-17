# SłupStal – projektowanie słupów stalowych według Eurokodów

Program w tym samym stylu i architekturze co BelkaStal / SłupŻB / BelkaŻB: jeden plik
`SlupStal.exe` (Windows, Microsoft Edge WebView2) lub `dist/SlupStal.html` (dowolna
przeglądarka), obliczenia od danych do raportu w pełni automatycznie, z możliwością
sprawdzenia każdego kroku (okno „jak obliczono” przy każdym warunku) i ręcznej zmiany
każdego parametru.

## Zakres obliczeń

| Obszar | Zakres | Norma |
|---|---|---|
| Przekroje | IPE, HEA, HEB, HEM; dwuteowniki spawane (także monosymetryczne); rury SHS/RHS gorąco wykończone i zimnogięte, także wymiary dowolne; rury okrągłe CHS; **słupy z dwóch ceowników** UPN/UPE: plecami z przekładkami lub rozstawione z przewiązkami (półki na zewnątrz / do wewnątrz) | PN-EN 10365, 10210, 10219 |
| Pręty złożone | oś materiałowa – jak pręt jednolity; oś niematerialna – I<sub>eff</sub> (6.74, tabl. 6.8), S<sub>v</sub> (6.73), N<sub>cr</sub>, e<sub>0</sub> = L/500, M<sub>Ed</sub> i N<sub>ch,Ed</sub> (6.69), V<sub>Ed</sub> (6.70); gałąź między przewiązkami z momentem V<sub>Ed</sub>·a/4, gałąź względem osi materiałowej, przewiązki (σ, τ), spoiny przewiązek; przekładki ≤ 15·i<sub>min</sub> – pręt jednolity (tabl. 6.9); ≥ 3 przedziały | PN-EN 1993-1-1, 6.4; PN-EN 1993-1-8, 4.5 |
| Kombinacje | 6.10 lub 6.10a/6.10b, γ<sub>G,sup</sub>/γ<sub>G,inf</sub>, wszystkie podzbiory zmiennych, grupy wykluczające się (np. kierunki wiatru), wyjątkowa, pożarowa, SGU (char./częsta/quasi-stała) | PN-EN 1990 + ZK |
| Analiza globalna | I rząd; II rząd z imperfekcją przechyłową φ; II rząd z φ i łukowymi e₀ (MES, P-δ i P-Δ, imperfekcje jako geometria początkowa); α<sub>cr</sub>; pominięcie φ przy H<sub>Ed</sub> ≥ 0,15 V<sub>Ed</sub> | 5.2, 5.3 |
| Obciążenia krytyczne | MES dla rzeczywistego rozkładu N(x): giętne w obu płaszczyznach (przechyłowe / nieprzechyłowe), skrętne, giętno-skrętne (także względem osi wymuszonej przy stężeniu pasa); L<sub>cr</sub> = π√(EI/N<sub>cr</sub>) | 6.3.1 |
| Zwichrzenie | M<sub>cr</sub> z MES (teoria Własowa) dla rozkładu M<sub>y</sub>(x), z wysokością przyłożenia obciążeń, monosymetrią, stężeniami; χ<sub>LT</sub> wg 6.3.2.2 lub 6.3.2.3 z f i k<sub>c</sub> (tabl. 6.6 lub 1/√C₁ z MES) | 6.3.2 |
| Nośność przekroju | klasyfikacja przy N + M<sub>y</sub> + M<sub>z</sub>, klasa 4 (A<sub>eff</sub>, W<sub>eff</sub>, e<sub>N</sub>), M<sub>N,Rd</sub>, zginanie dwukierunkowe (6.41), naprężenia (6.42/6.44), ścinanie z redukcją, wyboczenie środnika przy ścinaniu – na całej wysokości słupa | 5.5, 6.2; PN-EN 1993-1-5 |
| Interakcja | 6.61/6.62 z k<sub>ij</sub> wg zał. A lub B, C<sub>m</sub> wg tabl. B.3 / A.2 (postać przechyłowa: 0,9); metoda ogólna 6.3.4 (opcja) | 6.3.3, 6.3.4 |
| SGU | przemieszczenia poziome w obu kierunkach (H/150, H/300, H/500, własne) | PN-EN 1990 A1.4; 7.2 |
| Podstawa słupa | metoda składnikowa: f<sub>jd</sub>, c, króćce teowe, blacha zginana i kotwy (L<sub>b</sub>, L<sub>b</sub>*, postacie 1–3), M<sub>j,Rd</sub> wg tabl. 6.7, ścinanie (tarcie + kotwy), kotwa: rozciąganie + ścinanie, spoiny, S<sub>j,ini</sub> i klasyfikacja; opcjonalnie podatność podstawy w modelu | PN-EN 1993-1-8 |
| Pożar | temperatura stali (bez ochrony / z ochroną), ISO 834; elementy ściskane i ściskane ze zginaniem (4.2.3.2, 4.2.3.5); θ<sub>cr</sub>, czas | PN-EN 1993-1-2 |
| Kruche pękanie, wykonanie | t<sub>max</sub> wg tabl. 2.1; klasa EXC i wymagania | PN-EN 1993-1-10; PN-EN 1090-2 |
| Dobór | najlżejszy kształtownik serii; podstawa (wymiary, grubość, kotwy, spoiny); „dobierz wszystko” z iteracją przy podstawie podatnej | – |

Ręczne nadpisania: L<sub>cr,y</sub>, L<sub>cr,z</sub>, μ, L<sub>cr,T</sub>, krzywe wyboczenia i zwichrzenia, M<sub>cr</sub>,
k<sub>c</sub>, C<sub>my</sub>, C<sub>mz</sub>, C<sub>mLT</sub>, φ, e₀, f<sub>y</sub>, k<sub>j</sub>, wszystkie NDP (γ<sub>M</sub>, γ<sub>G</sub>, ψ, λ̄<sub>LT,0</sub>, β, …).

## Obsługa (jak w BelkaStal / SłupŻB)

* **Schemat statyczny (zakładka Dane)** – jak w BelkaŻB: **lewy przycisk zaznacza** element (słup, obciążenie,
  podporę – każdą osobno: podstawa / wierzchołek w każdej płaszczyźnie, stężenie), **prawy przycisk – menu**
  zaznaczonego elementu (zmień, duplikuj, wyłącz/włącz, usuń, obciążenie lub stężenie na tej wysokości, schematy
  typowe przy podporze), **dwuklik – okno zmiany**; Esc – odznacz. Klik na wykresie – znacznik wartości na danej
  wysokości (obie płaszczyzny), dwuklik – siły i sprawdzenia w tym miejscu. Nad schematem: Obciążenia (jedyne
  miejsce zadawania obciążeń – lista, dodawanie, zmiana), Przekrój, Stężenia, Wymiary. Pod schematem: wykres
  M / V / N / przemieszczenia / postać wyboczenia, wybór kombinacji, „Zestawienie obciążeń”, „Kombinacje
  decydujące”, siły na fundament.
* **Podstawa** – rysunek podstawy jest klikalny: element (blacha, kotwy, spoiny, podlewka, fundament) – jego
  parametry w projektancie podstawy; wymiar (b<sub>p</sub>, l<sub>p</sub>, t<sub>p</sub>, rozstaw kotew, podlewka) – zmiana wartości wprost na rysunku.
* **Słup i podstawa** – widok 2D (rzut z podstawą, fundamentem, stężeniami) przełączany na **widok 3D**
  (obrót, przesuw, powiększenie, widoki standardowe; obciążenia, fundament, postacie wyboczenia: giętne y/z,
  skrętne/giętno-skrętne, zwichrzenie, ugięcia SGU); przekrój pod kursorem, zestawienie materiałów, DXF.
* **Przekrój i nośność** – klik na pasie / środniku otwiera okno przekroju z podświetlonymi wymiarami tej
  części; przekrój z naprężeniami na dowolnej wysokości x (pole lub klik na wykresie η(x)).
* **Wykresy** – kursor pokazuje wartości na wszystkich wykresach; klik – znacznik (ponownie – usuń, prawy
  przycisk – usuń wszystkie), klik etykiety znacznika – siły i sprawdzenia w tym miejscu.
* **Podsumowanie** – „pokaż →” przy każdym warunku przenosi do miejsca (pola danych, zakładki, wiersza),
  od którego warunek zależy; okno „Jak obliczono” – warunek, wytężenie, wzory i podstawienia, punkt normy.
* **Raport** – pełny, statyka lub **raport własny** (edytor: pisanie, usuwanie fragmentów, nagłówki,
  listy, wstawianie raportu / statyki / zestawienia wyników; zapisywany w pliku projektu); druk i PDF
  bezpośrednio z okna programu, zapis HTML (z danymi do ponownego otwarcia) i .odt.
* **Nowy projekt** – przykład słupa hali, przykład słupa przegubowego lub projekt pusty.

## Uruchomienie

* **Windows**: `SlupStal.exe` (w katalogu głównym repozytorium). Wymaga Microsoft Edge
  WebView2 Runtime (wbudowany w Windows 10/11). Autozapis i pliki pomocnicze:
  `%LOCALAPPDATA%\SlupStal`. Plik `*.slupstal` podany jako argument (dwuklik) – otwierany przy starcie.
* **Przeglądarka**: `SlupStal/dist/SlupStal.html` – pełna funkcjonalność (zapis plików jako pobieranie).

## Budowanie

```bash
cd SlupStal
node build.js                # dist/SlupStal.html (+ kopia host/SlupStal.html do osadzenia w .exe)
cd host && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -H windowsgui" -o ../../SlupStal.exe .
```

Ikona: `node host/make-icon.js` i `rsrc -ico host/slupstal.ico -arch amd64 -o host/rsrc_windows_amd64.syso`.

## Weryfikacja

```bash
node test/fe.test.js         # MES wobec rozwiązań zamkniętych (N_cr, II rząd, imperfekcje, N_cr,T, M_cr, N_cr,TF)
node test/engine.test.js     # przykłady liczone ręcznie + przegląd 28 konfiguracji + dobór
node test/ui.test.js         # test funkcjonalny interfejsu (Playwright/Chromium): 51 scenariuszy
```

## Struktura

* `src/engine/` – silnik (rdzeń, normy i NDP, materiały, przekroje, nośność, MES, model,
  kombinacje, stateczność, podstawa, pożar/kruche pękanie/EXC, projekt i dobór),
* `src/ui/` – interfejs (style i narzędzia wspólne z BelkaStal, rysunki, raport z tokiem
  obliczeń, eksport .odt, formularze, okna, widoki),
* `host/` – program Windows (Go + WebView2).

## Założenia i ograniczenia (opisane także w raporcie)

* Słupy pryzmatyczne (stały przekrój na wysokości), siła podłużna przekazywana na podstawę.
* Słupy z dwóch ceowników z przewiązkami: zwichrzenie i wyboczenie skrętne pominięte (przekrój dwugałęziowy usztywniony przewiązkami); klasa 4 gałęzi – poza zakresem; podstawa – wspólna blacha pod obiema gałęziami.
* Podstawa utwierdzona – model dla M<sub>y</sub> wg tabl. 6.7; dla M<sub>z</sub> model uproszczony z liniową
  interakcją M<sub>y</sub>/M<sub>j,y,Rd</sub> + M<sub>z</sub>/M<sub>j,z,Rd</sub>; zakotwienie kotew w betonie (PN-EN 1992-4) – poza zakresem.
* Rura okrągła klasy 4 (PN-EN 1993-1-6) i podstawa utwierdzona rury okrągłej – poza zakresem.
* Program wspomaga projektanta; odpowiedzialność za przyjęte założenia i wyniki ponosi projektant.
