# OPAI HUB — ZERO V2

Protótipo frontend criado do zero com base na referência visual enviada.

## Funcionalidades
- Login demo: `admin / cauhub123`
- Cadastro de contas locais em modo demo
- Home com Hero, Continuar assistindo, Em Alta, Novos episódios, Séries e Top Airing no PC
- Página de detalhes, temporadas e episódios
- Progresso persistido no localStorage
- Marcação automática como assistido
- Área de reprodução/player demo
- Busca funcionando
- Catálogo de METADADOS públicos via Jikan quando disponível, com fallback offline
- PC e mobile com interfaces responsivas distintas
- Administração só aparece para `role=admin`
- Configurações de qualidade, autoplay e desempenho
- Sem “Seja VIP”
- Player pensado para embeds HTTPS previamente autorizados

## Executar
Abra `index.html` ou use `python -m http.server 8080` na pasta.

## Produção
O login demo não é seguro para produção. Em produção, mover autenticação para backend, armazenar senhas com hash, validar embeds no servidor e manter allowlist de domínios autorizados. As APIs públicas são usadas somente para informações/metadados; o protótipo não hospeda mídia.
