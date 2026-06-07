# SuriRedirect — CLAUDE.md

## Stack

- Vanilla JS ES6+, sem build step, sem npm
- Firebase 9.22.1 compat SDK (auth + Firestore) — `projectId: spaceshooter-80cfa`
- Single page: `index.html` + `styles.css` + `script.js`
- Inter font, Font Awesome 6 kit `bef417f226`
- Deploy: GitHub Pages — `https://srdarf.github.io/SuriRedirect/`

## Estrutura Firestore

`/users/{uid}`: `username`, `shareCode`, `shareUrl`, `photoUrl`, `bio`, `themeIndex`
`/links/{linkId}`: `title`, `url`, `descriptionUrl`, `imgUrl`, `userId`, `isPublic`, `order`, `clickCount`

## Regras de commit

- Mensagens **sempre em português**
- **Nunca** incluir coautoria (`Co-Authored-By`) nas mensagens
- Prefixos convencionais: `feat:`, `fix:`, `refactor:`, `chore:`, `security:`, `redesign:`

## Gotchas

- `generateShareCode` usa `.set({}, { merge: true })` — manter `merge: true` ou apaga o doc do usuário
- `isSafeUrl()` valida http/https antes de renderizar ou salvar qualquer URL
- `escHtml()` em todo conteúdo gerado pelo usuário inserido via `innerHTML`
- `data.descriptionUrl` é o campo de descrição do link (nome legado)
- `#themePicker` está no nível do `body` (não dentro da sidebar) para evitar clipping por `overflow: hidden`
- Índice composto necessário no Firestore: coleção `links`, campos `userId ASC` + `order ASC`
- Regra Firestore para contador de cliques (acesso não autenticado):
  ```js
  allow update: if resource.data.isPublic == true
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['clickCount'])
    && request.resource.data.clickCount == resource.data.clickCount + 1;
  ```

## Design

- Glassmorphism: painéis `rgba(255,255,255,0.06)`, `backdrop-filter: blur(28px) saturate(160%)`
- 20 gradientes curados em `themes[]` no `script.js`
- Tema persistido em `localStorage` (imediato) e em `themeIndex` no Firestore (por usuário)
- CSS custom properties `--auth-left-bg`, `--auth-orb1`, `--auth-orb2` para tema do card de login
