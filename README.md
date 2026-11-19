# ✈️ Airplane Merge do Alex

Jogo de juntar aviões: compre aviões, faça-os voar para ganhar moedas e junte dois iguais para criar um avião melhor. São 100 aviões para descobrir, em 20 famílias.

**Jogar:** <https://alex624-624.github.io/airplane-merge-do-alex/>

Funciona no navegador do computador e do celular, com conta (usuário e senha).

## Como jogar

- **Comprar**: o botão verde compra o avião com melhor custo-benefício (ou escolha na Loja).
- **Decolar**: toque num avião, ou arraste-o até o céu. Cada volta completa rende moedas.
- **Juntar**: arraste um avião sobre outro igual.
- **Pousar**: toque num avião que está "em voo".
- **Vender**: arraste o avião até o botão de baixo.
- **Presentes**: caem no hangar de tempos em tempos; toque para abrir.
- **Turbo**: moedas em dobro por 1 minuto.
- No computador, a barra de espaço (ou a tecla B) também compra.

## Contas

O site é feito só de arquivos estáticos, publicado de graça no GitHub Pages. Não há servidor: **as contas e o progresso ficam guardados no próprio aparelho**, dentro do navegador.

Na prática:

- Cada aparelho (e cada navegador) tem as suas contas. Uma conta criada no computador não existe no celular.
- Várias pessoas podem ter contas no mesmo aparelho. O Ranking mostra as contas daquele aparelho.
- Para continuar o jogo em outro aparelho, use o **código de transferência**: no menu da conta, "Levar para outro aparelho" gera um código; no outro aparelho, crie uma conta e use "Trazer de outro aparelho" para colar o código.
- O código também serve como **cópia de segurança**. Vale guardar um de vez em quando: se os dados do navegador forem apagados, as contas daquele aparelho somem. Isso acontece ao limpar o histórico, ao usar o modo anônimo, e o iPhone pode apagar sozinho os dados de sites que ficam um tempo sem ser abertos.
- Não existe "esqueci minha senha".

A senha não é guardada, só um embaralhado dela. Ela impede que outra pessoa entre na sua conta pelo jogo, mas não é um cofre: quem souber usar as ferramentas do navegador consegue ver ou apagar os dados guardados no aparelho.

## Ranking de todos os jogadores (opcional)

Sem configuração, o Ranking mostra só as contas do aparelho. Para mostrar os jogadores de todos os aparelhos, o jogo usa um projeto gratuito do Firebase que guarda **apenas uma linha por conta**: nome, melhor avião e total ganho. Senhas e progresso continuam no aparelho.

O projeto precisa ser criado por um adulto, com a própria conta Google:

1. Em <https://console.firebase.google.com>, crie um projeto (o Google Analytics pode ficar desligado).
2. **Authentication → Método de login**: ative **Anônimo**.
3. **Firestore Database → Criar banco de dados**: região `southamerica-east1` (São Paulo), modo de produção.
4. **Firestore Database → Regras**: troque o texto pelo conteúdo de [`firestore.rules`](firestore.rules) e publique.
5. **Configurações do projeto → Seus apps → Web (`</>`)**: registre um app e copie `apiKey` e `projectId` para [`docs/js/firebase-config.js`](docs/js/firebase-config.js).

Esses dois valores não são segredos. Depois de publicado, cada aparelho envia as suas contas na próxima vez que o jogo for aberto nele. Sem internet, o Ranking volta a mostrar só as contas do aparelho.

## Publicar

O GitHub Pages publica a pasta `docs/` do ramo `main`. Para atualizar o site, basta enviar as mudanças:

```bash
git add -A && git commit -m "Atualiza o jogo" && git push
```

O site atualiza sozinho em um ou dois minutos.

### Atualizar sem atrapalhar quem está jogando

O jogo guarda no aparelho uma versão inteira de si mesmo (arquivo `docs/sw.js`). Por isso:

- Quem está com o jogo aberto **continua na versão em que entrou**; nada muda no meio da partida.
- A versão nova entra **quando a pessoa recarrega a página** (ou abre o jogo de novo). As contas e o progresso continuam lá.
- O aparelho só troca de versão depois de baixar e conferir **todos** os arquivos. Se a publicação ainda estiver pela metade, ele fica na versão antiga e tenta de novo no próximo carregamento.
- Depois da primeira visita, o jogo abre até sem internet.

O menu da conta mostra o código da versão em uso.

Para isso funcionar, `docs/sw.js` precisa listar a "impressão digital" de cada arquivo. Um gancho do git faz isso sozinho a cada commit. Ele já está ligado neste computador; numa cópia nova do repositório, ligue uma vez com:

```bash
git config core.hooksPath .githooks
```

Para atualizar a lista à mão: `npm run versao`.

## Rodar no computador (opcional)

Existe também um servidor próprio, que guarda as contas num banco de dados em vez de no navegador. Com ele, a mesma conta vale em todos os aparelhos ligados ao mesmo Wi-Fi. Precisa só do [Node.js](https://nodejs.org) 22.13 ou mais novo; não há nada para instalar.

```bash
npm start
```

Depois abra `http://localhost:3000`. No celular, conecte-se ao mesmo Wi-Fi e abra o endereço "No celular" que aparece no terminal.

As contas do servidor ficam em `data/jogo.db` (SQLite, senhas guardadas só como hash) e são separadas das contas do site publicado.

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `PORT` | `3000` | Porta do site |
| `HOST` | `0.0.0.0` | Use `127.0.0.1` para aceitar só este computador |
| `DATA_DIR` | `./data` | Pasta do banco de dados |
| `TRUST_PROXY` | — | `1` se o servidor estiver atrás de um proxy com HTTPS |
| `CLIENT_IP_HEADER` | — | Cabeçalho em que o proxy informa o IP do visitante |

## Arquivos

- `docs/` — o site publicado
  - `js/config.js` — aviões, preços e regras
  - `js/planes.js` — desenho dos aviões
  - `js/sky.js` — o céu e a rota de voo
  - `js/game.js` — o jogo (hangar, loja, janelas)
  - `js/backend-local.js` — contas guardadas no aparelho
  - `js/transfer.js` — código de transferência
  - `js/ranking-online.js` e `js/firebase-config.js` — ranking de todos os jogadores (Firebase)
  - `sw.js` e `js/atualiza.js` — versão guardada no aparelho e troca de versão no carregamento
  - `js/backend-server.js` e `js/modo.js` — contas no servidor local, quando ele é usado
- `tools/versao.js` e `.githooks/` — atualizam a lista de arquivos em `docs/sw.js` a cada commit
- `firestore.rules` — regras de segurança do ranking online
- `server.js` — servidor local (opcional)
