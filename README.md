# Opai Hub

Tela inicial atualizada seguindo a identidade visual do Opai Hub: preto, roxo, magenta, navegação, hero, busca, categorias e cards de destaque.

## Recursos
- Login obrigatório e cadastro local
- Sessão persistente via localStorage
- Logout
- Painel Admin
- Conta demo: `admin / cauhub123`
- Busca e filtros por categoria
- Favoritos visuais nos cards
- Tema claro/escuro
- Personalização preparada via localStorage
- Layout responsivo

## Executar
Abra `index.html` no navegador. Não é necessário servidor para a demo.

> Aviso: esta versão usa autenticação apenas no navegador. Para produção, senhas e permissões devem ser tratadas em um backend seguro.


## Domínio
O pacote está preparado para o domínio personalizado **https://opaihub.com/** e inclui um arquivo `CNAME` com esse domínio.

### Publicar
O ZIP é um site estático. Para colocar o endereço online, publique a pasta `opai-hub` em um serviço de hospedagem (por exemplo, GitHub Pages, Netlify ou Vercel) e configure o domínio `opaihub.com` no painel desse serviço. O arquivo `CNAME` já está pronto para hospedagens que usam CNAME.

> Importante: este pacote não registra o domínio nem altera DNS automaticamente; isso precisa ser feito na conta do registrador/hospedagem do domínio.
