# CLAUDE.md

Instruktioner för Claude Code i det här repot.

- Ren HTML/CSS/JS med ES-moduler. Inga beroenden eller byggsteg – lägg inte till några utan att fråga.
- UI-texter på svenska, kod och kommentarer på engelska.
- `js/game.js` ska förbli fri från DOM/canvas så att den går att testa i Node.
- Spelbalans hör hemma i `js/config.js`, inte hårdkodad i logiken.
- Kör `npm test` efter ändringar i spellogiken; lägg till tester för nya regler.
- Kör lokalt med `python -m http.server 8000`.
