# Dejapa Burguer · Cardápio e pedidos online

Web app mobile-first do **Dejapa Burguer**: cardápio com carrinho, checkout (entrega ou retirada, Pix, cartão, vale e dinheiro) e envio do pedido direto para o WhatsApp da loja.

- **App de pedidos:** `index.html` (arquivo único, sem dependências externas)
- **Cardápio para impressão:** `cardapio/` (PDF A4, PNG em alta e versão HTML)

## Publicar no GitHub Pages

1. Suba este repositório no GitHub.
2. Vá em **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main` e pasta `/ (root)`. Salve.
4. Em 1 ou 2 minutos o site fica disponível em `https://SEU-USUARIO.github.io/dejapa-burguer/`.
   - Cardápio impresso: `https://SEU-USUARIO.github.io/dejapa-burguer/cardapio/`

## Configuração antes de divulgar

Abra o `index.html`, procure o bloco `CONFIG` no início do script e ajuste:

| Campo | O que é |
|---|---|
| `whatsapp` | Número que recebe os pedidos (DDI + DDD + número, só dígitos). Atual: `5511988320261` |
| `pix.chave` | **Obrigatório.** Chave Pix real da loja. Vazio = QR Code em modo simulação |
| `pix.recebedor` / `pix.cidade` | Nome e cidade do recebedor (sem acento; até 25 e 15 caracteres) |
| `taxaEntrega` | `null` mostra "a confirmar"; um número (ex.: `5`) soma ao total |
| `linkPagamentoCartao` | Opcional: link de pagamento (Mercado Pago, InfinitePay etc.) para crédito online |
| `precoBurguerExtra` | Preço do "+1 burguer" nos artesanais (atual: 9,90) |

Os produtos ficam no array `CATEGORIES`, logo abaixo do `CONFIG`.

## Observações

- O crédito online **não coleta dados de cartão** no site. O cliente recebe um link de pagamento seguro pelo WhatsApp.
- O Pix segue o padrão BR Code do Banco Central (EMV com CRC16), com o valor exato do pedido.
- O carrinho e os dados do cliente ficam salvos só no navegador de quem está pedindo.
