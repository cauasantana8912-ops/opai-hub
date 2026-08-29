# OPAI HUB — versão final

Inclui:
- Login local com perfil administrador de demonstração.
- Página inicial com **Continuar assistindo**.
- Página de detalhes com **Assistir**.
- Temporadas e episódios.
- Progresso salvo no navegador.
- Marcação de episódios concluídos.
- Layout responsivo para celular.
- Administração visível apenas para administrador.
- Sem área/botão "Seja VIP".
- Player incorporado apenas quando existir um `embedUrl` em domínio explicitamente autorizado.
- Caso não exista embed autorizado, o botão abre a fonte oficial detectada.

## Player / embeds

O código não injeta players de terceiros arbitrários. Para um título ter iframe incorporado, o catálogo precisa fornecer `embedUrl` e o domínio precisa estar na lista `AUTHORIZED_EMBED_HOSTS` em `app.js`.

Para fontes oficiais que não permitem iframe, o sistema mantém o player visual e abre a página oficial em nova aba.

## Segurança

O login mostrado é uma autenticação de demonstração no navegador. Para produção, credenciais, sessões e permissões administrativas devem ser validadas em backend seguro.
