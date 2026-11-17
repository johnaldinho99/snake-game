# PLAN – Snake

## Mål
Ett modernt Snake-spel som körs lokalt i webbläsaren, med huvudmeny, poängsystem,
topplista och spöken som dyker upp och försvinner.

## Beslut
| Område | Val |
|---|---|
| Teknik | Ren HTML/CSS/JavaScript (ES-moduler), inga beroenden, inget byggsteg |
| Språk | UI på svenska, kod och kommentarer på engelska |
| Stil | Modern, mörk, rundade former, mjuk (interpolerad) rörelse |
| Väggar | Man dör av väggarna |
| Hinder | Spöken som poppar upp (varning → farliga → försvinner) |
| Lagring | Topplista och inställningar i `localStorage` |
| Tester | Spellogiken testas med Nodes inbyggda testrunner (`node --test`) |

## Funktioner
### Huvudmeny
- Starta spel
- Välj svårighetsgrad: Lätt / Medel / Svår
- Topplista (topp 10)
- Hur man spelar (kontroller och regler)
- Ljud av/på

### Spelregler och poäng
| Händelse | Poäng |
|---|---|
| Äta äpple | 10 × multiplikator |
| Äta bonusfrukt (syns i 6 s, 25 % chans efter ett äpple) | 50 × multiplikator |
| Överleva ett spöke (det försvinner medan du lever) | 5 × multiplikator |

- Multiplikator: Lätt ×1, Medel ×2, Svår ×3.
- Ormen blir snabbare för varje äpple (ned till ett tak per svårighetsgrad).
- Man dör av: vägg, sin egen kropp och aktiva spöken.

### Spöken
1. **Varning** (1,5 s): genomskinligt och blinkande – ofarligt.
2. **Aktivt** (3,5–6 s): solitt med glöd – dödligt.
3. **Försvinner** (0,5 s): bleknar bort – ofarligt, ger poäng.

Spöken dyker aldrig upp nära huvudet. Om ormen ligger på rutan när ett spöke
ska bli aktivt avbryts det (rättvist). Fler och tätare spöken på högre nivå.

### Övrigt
- Paus med `P`/`Esc`, styrning med piltangenter/WASD och swipe på mobil.
- Game over-skärm med namninmatning om poängen tar sig in på topplistan.

## Struktur
```
index.html          Skärmar (meny, spel, paus, game over, topplista, hjälp)
css/style.css       Stil
js/config.js        Konstanter: rutnät, svårighetsgrader, poäng, timers
js/game.js          Ren spellogik (ingen DOM) – testbar
js/renderer.js      Canvas-ritning
js/highscores.js    Topplista i localStorage
js/audio.js         Enkla ljudeffekter via WebAudio
js/main.js          Spelloop, input och skärmhantering
tests/game.test.js  Enhetstester för spellogiken
```

## Steg
1. PLAN.md, README, projektstruktur
2. Spellogik + tester
3. Rendering, meny, topplista, ljud
4. Manuell test i webbläsare, push till GitHub
