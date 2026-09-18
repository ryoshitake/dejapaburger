# Dejapa Burguer · cardápio, painel e banco de dados

Três ambientes conectados:

```
  ADMIN (admin.html)  ──escreve──►  GOOGLE SHEETS  ◄──lê──  APP DO CLIENTE (index.html)
        PIN                         (Apps Script API)              pedido ──► WhatsApp
                                          ▲                                └─► aba Pedidos
```

| Arquivo | O que é | Quem usa |
|---|---|---|
| `index.html` | App de pedidos | Cliente |
| `admin.html` | Painel com PIN | Você |
| `apps-script/Codigo.gs` | API que conversa com a planilha | — |
| `cardapio/` | Cardápio impresso (PDF, PNG, HTML) | Impressão |

## Passo a passo (uma vez)

**1. Planilha**
Crie uma planilha no Google Sheets · **Extensões → Apps Script** · apague o conteúdo e cole o `Codigo.gs` · salve.

**2. Criar as abas**
No Apps Script, selecione a função `instalar` e clique em **Executar**. Autorize quando pedir. Isso cria as abas Config, Horarios, Categorias, Opcoes, Produtos, Pagamentos, Bairros e Pedidos, já preenchidas com o cardápio atual.

**3. Publicar a API**
**Implantar → Nova implantação → App da Web**
- Executar como: **Eu**
- Quem pode acessar: **Qualquer pessoa**

Copie a URL que termina em `/exec`.

**4. Ligar os dois sites à planilha**
Abra `index.html` e `admin.html` e cole a URL na linha:

```js
var API_URL = '';   // ex.: 'https://script.google.com/macros/s/AKfy.../exec'
```

**5. Definir o PIN e a chave Pix**
Na aba **Config** da planilha: `adminPin` (troque o 1234) e `pixChave` (chave real da loja).

**6. Publicar no GitHub**
Suba os arquivos no repositório e ative o Pages (Settings → Pages → branch `main`, pasta `/root`).

- Cliente: `https://SEU-USUARIO.github.io/REPO/`
- Painel: `https://SEU-USUARIO.github.io/REPO/admin.html`
- Cardápio impresso: `https://SEU-USUARIO.github.io/REPO/cardapio/`

> Sempre que publicar uma nova versão do `Codigo.gs`, use **Implantar → Gerenciar implantações → editar → Nova versão**, senão a URL continua rodando o código antigo.

## Dia a dia

No painel (`admin.html`), cada aba salva direto na planilha:

- **Produtos** — nome, descrição, preço, foto (link), opções, `disponivel` (SIM/NÃO liga e desliga o item no app)
- **Categorias** — seções do cardápio e o aviso que aparece no topo delas
- **Opções e adicionais** — `check` é adicional pago (ex.: +1 burguer); `radio` é escolha obrigatória (ex.: sabor do refrigerante). Em Produtos, a coluna `opcoes` recebe os ids separados por vírgula
- **Pagamentos** — liga/desliga Pix, crédito, débito, vale e dinheiro
- **Bairros e taxas** — o cliente escolhe o bairro e a taxa entra no total
- **Horários** — o app mostra aberto/fechado e bloqueia o pedido fora do horário
- **Configurações** — WhatsApp, chave Pix, taxa padrão, pedido mínimo, PIN
- **Pedidos** — histórico do que foi enviado

O app do cliente recarrega o cardápio a cada 5 minutos e guarda uma cópia local, então continua funcionando se a planilha estiver fora do ar.

## Observações

- O `index.html` só usa a planilha quando `API_URL` está preenchido. Vazio, ele funciona com o cardápio embutido.
- O PIN protege o painel contra curiosos, mas não é login de banco. Não divulgue o endereço do `admin.html`.
- Pagamento no crédito online não coleta cartão no site: o cliente recebe um link seguro pelo WhatsApp (`linkPagamentoCartao` na aba Config).
