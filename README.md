# Dejapa Burguer

| Arquivo | O que é | Endereço |
|---|---|---|
| `index.html` | App de pedidos (cliente) | `/dejapaburger/` |
| `admin.html` | Painel de administração (PIN) | `/dejapaburger/admin.html` |
| `cardapio.html` | Cardápio para impressão | `/dejapaburger/cardapio.html` |
| `Codigo.gs` | Código da API no Google Apps Script | — |
| `cardapio_dejapa_burguer.pdf` / `.png` | Cardápio em PDF e imagem | — |

O app e o painel leem e escrevem numa planilha do Google Sheets através da API publicada no Apps Script.
A URL da API já está dentro do `index.html` e do `admin.html` (variável `API_URL`).

## Editar o cardápio

Pelo painel (`admin.html`, PIN na aba Config da planilha) ou direto nas abas da planilha:
Config, Horarios, Categorias, Opcoes, Produtos, Pagamentos, Bairros e Pedidos.

Ao alterar o `Codigo.gs`, publique **nova versão** em Implantar → Gerenciar implantações,
senão a URL continua rodando o código antigo.
