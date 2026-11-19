# ✈️ Airplane Merge do Alex

Jogo de juntar aviões: compre aviões, faça-os voar para ganhar moedas e junte dois iguais para criar um avião melhor. São 40 aviões para descobrir.

**Jogar:** <https://alex624-624.github.io/airplane-merge-do-alex/>

Funciona no navegador do computador e do celular, com conta (usuário e senha) e progresso salvo na nuvem.

## Como jogar

- **Comprar**: o botão verde compra o avião com melhor custo-benefício (ou escolha na Loja).
- **Decolar**: toque num avião, ou arraste-o até o céu. Cada volta completa rende moedas.
- **Juntar**: arraste um avião sobre outro igual.
- **Pousar**: toque num avião que está "em voo".
- **Vender**: arraste o avião até o botão de baixo.
- **Presentes**: caem no hangar de tempos em tempos; toque para abrir.
- **Turbo**: moedas em dobro por 1 minuto.
- No computador, a barra de espaço (ou a tecla B) também compra.

## Como o site funciona

| Parte | Onde fica | Custo |
| --- | --- | --- |
| O site (pasta `docs/`) | GitHub Pages | grátis |
| Contas (usuário e senha) | Firebase Authentication | grátis |
| Progresso e ranking | Firebase Firestore | grátis (plano Spark) |

O site é feito só de arquivos estáticos e fala direto com o Firebase. Não há servidor para manter.

## Configurar o Firebase (uma vez)

1. Em <https://console.firebase.google.com>, crie um projeto (o Google Analytics pode ficar desligado).
2. **Authentication → Método de login**: ative **E-mail/senha**.
3. **Firestore Database → Criar banco de dados**: escolha a região (por exemplo `southamerica-east1`, São Paulo) e o modo de produção.
4. **Firestore Database → Regras**: cole o conteúdo de [`firestore.rules`](firestore.rules) e publique.
5. **Configurações do projeto → Seus apps → Web (`</>`)**: registre um app e copie `apiKey` e `projectId` para [`docs/js/firebase-config.js`](docs/js/firebase-config.js).

Esses dois valores não são segredos — todo site que usa o Firebase os mostra. Quem protege os dados são as regras do passo 4: cada jogador só lê e grava o próprio progresso, e o ranking só aceita a linha do próprio jogador, com o nome da própria conta.

O jogo pede um nome de usuário, não um e-mail. Por dentro, o nome vira um endereço interno (`nome@pilotos.example.com`) só para o Firebase aceitar o login; nenhum e-mail é enviado. Por isso **não existe "esqueci minha senha"**: quem perder a senha precisa criar outra conta.

## Publicar no GitHub Pages

O GitHub Pages publica a pasta `docs/` do ramo `main`. Depois de configurado (Settings → Pages → *Deploy from a branch* → `main` / `docs`), basta enviar as mudanças:

```bash
git add -A && git commit -m "Atualiza o jogo" && git push
```

O site atualiza sozinho em um ou dois minutos.

## Limites do plano gratuito

O plano Spark do Firebase permite, por dia, cerca de 20 mil gravações e 50 mil leituras no Firestore. O jogo salva a cada 30 segundos enquanto está aberto (e ao fechar a aba), o que dá por volta de 150 horas de jogo somadas por dia entre todos os jogadores. Se o limite acabar, o jogo avisa e volta a salvar no dia seguinte; nada é cobrado.

## Rodar no computador

Precisa só do [Node.js](https://nodejs.org) 22.13 ou mais novo. Não há nada para instalar.

```bash
npm start
```

Depois abra `http://localhost:3000`. Para testar no celular, conecte-o ao mesmo Wi-Fi e abra o endereço "No celular" que aparece no terminal.

- Com o Firebase configurado, o jogo local usa as mesmas contas do site publicado.
- Com `FIREBASE = null` em `docs/js/firebase-config.js`, o jogo usa o servidor local: as contas ficam em `data/jogo.db` (SQLite, senhas guardadas só como hash) e valem apenas neste computador.

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `PORT` | `3000` | Porta do site |
| `HOST` | `0.0.0.0` | Use `127.0.0.1` para aceitar só este computador |
| `DATA_DIR` | `./data` | Pasta do banco de dados local |
| `TRUST_PROXY` | — | `1` se o servidor estiver atrás de um proxy com HTTPS |
| `CLIENT_IP_HEADER` | — | Cabeçalho em que o proxy informa o IP do visitante |

## Arquivos

- `docs/` — o site publicado
  - `js/config.js` — aviões, preços e regras
  - `js/planes.js` — desenho dos aviões
  - `js/sky.js` — o céu e a rota de voo
  - `js/game.js` — o jogo (hangar, loja, janelas)
  - `js/firebase-config.js` — dados do projeto Firebase
  - `js/backend-firebase.js` — contas, progresso e ranking no Firebase
  - `js/backend-server.js` — o mesmo, usando o servidor local
- `firestore.rules` — regras de segurança do banco
- `server.js` — servidor local (opcional)
