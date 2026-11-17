# 🐍 Snake

Ett modernt Snake-spel som körs lokalt i webbläsaren – med huvudmeny,
svårighetsgrader, poäng, topplista, bonusstjärnor och spöken som dyker upp
och försvinner.

Ingen installation, inga beroenden: ren HTML, CSS och JavaScript.

## Starta

ES-moduler kräver att sidan serveras över http (inte `file://`). Kör i
projektmappen:

```powershell
python -m http.server 8000
```

Öppna sedan <http://localhost:8000>.

> Har du Node istället: `npx serve` fungerar också.

## Så spelar du

| Händelse | Poäng |
|---|---|
| 🍎 Äpple | 10 × nivå |
| ⭐ Bonusstjärna (syns i 6 s) | 50 × nivå |
| 👻 Överlevt spöke | 5 × nivå |

Nivå-multiplikator: **Lätt ×1, Medel ×2, Svår ×3**. Ormen blir snabbare för
varje äpple.

**Spöken** blinkar först svagt (ofarliga), blir sedan aktiva och lysande
(dödliga) och bleknar till sist bort. Du dör av väggarna, din egen kropp
och aktiva spöken.

| Tangent | Funktion |
|---|---|
| Piltangenter / WASD | Styr |
| P / Esc | Paus |
| Enter | Starta / fortsätt |
| Swipe | Styr på mobil |

Topplistan (topp 10) sparas i webbläsarens `localStorage`.

## Tester

Spellogiken (`js/game.js`) är skild från ritningen och testas med Nodes
inbyggda testrunner:

```powershell
npm test
```

## Struktur

```
index.html          Skärmar: meny, spel, paus, game over, topplista, hjälp
css/style.css       Stil
js/config.js        Balans: svårighetsgrader, poäng, timers
js/game.js          Ren spellogik (ingen DOM)
js/renderer.js      Canvas-ritning och effekter
js/highscores.js    Topplista i localStorage
js/audio.js         Syntetiserade ljudeffekter (WebAudio)
js/main.js          Spelloop, input, skärmhantering
tests/              Enhetstester
```

Vill du justera balansen (hastighet, poäng, hur ofta spöken kommer) – ändra i
`js/config.js`.

## Hur det byggdes

Byggt med Claude Code i VS Code som ett första test av verktyget (17 nov 2026).

| | |
|---|---|
| Tid | Cirka 25–30 minuter från svar på kontrollfrågorna till pushad kod (uppskattat från filstämplar och commit-tider) |
| Tokens / kostnad | Ej uppmätt – Claude Pro visar ingen token- eller kostnadsrapport |
| Quota (Claude Pro) | Båda projekten (Snake + SCB-dashboard) tillsammans med planeringen: ca **22 %** av 5-timmarsgränsen och ca **3 %** av veckogränsen |

Quota-siffrorna är kontots totala förbrukning vid avläsningen (`/usage`, ungefärlig och
gäller sessioner på den här datorn), så de är en övre gräns för vad bygget kostade.
