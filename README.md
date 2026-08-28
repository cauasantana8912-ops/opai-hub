# Opai Hub

Site estático responsivo para GitHub Pages, com layout próprio para PC e mobile.

## Incluído
- Hero, cards, Em Alta, Novos episódios, Séries e Top Airing.
- Busca de animes via AniList GraphQL e séries via TVmaze.
- Detalhes e área de reprodução para trailers oficiais do YouTube quando fornecidos pela fonte.
- Minha lista com localStorage.
- PWA + service worker para cache do app shell.
- Área visual de administração.

## Importante sobre administração
GitHub Pages é estático. Uma área de administração realmente privada **não pode ser protegida apenas com JavaScript**. Para isso, use um backend com autenticação e permissões.

## Publicar no GitHub Pages
Envie `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest` e a pasta `assets` para a raiz da branch publicada pelo GitHub Pages.
