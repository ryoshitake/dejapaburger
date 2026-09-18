/**
 * DEJAPA BURGUER — API (Google Apps Script + Google Sheets)
 * ---------------------------------------------------------
 * 1. Crie uma planilha no Google Sheets.
 * 2. Extensões > Apps Script, cole este arquivo e salve.
 * 3. Rode a função  instalar()  uma vez (autorize quando pedir).
 * 4. Implantar > Nova implantação > Tipo: App da Web
 *      Executar como: Eu
 *      Quem pode acessar: Qualquer pessoa
 *    Copie a URL /exec e cole no index.html e no admin.html (API_URL).
 */

var TZ = 'America/Sao_Paulo';
var PIN_PADRAO = '1234';

/* ===================== INSTALAÇÃO ===================== */

function instalar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  criarAba(ss, 'Config', ['chave', 'valor'], CONFIG_PADRAO());
  criarAba(ss, 'Horarios', ['dia', 'aberto', 'abre', 'fecha'], HORARIOS_PADRAO());
  criarAba(ss, 'Categorias', ['id', 'nome', 'icone', 'aviso', 'ordem', 'ativo'], CATEGORIAS_PADRAO());
  criarAba(ss, 'Opcoes', ['id', 'tipo', 'titulo', 'detalhe', 'preco', 'obrigatorio', 'escolhas', 'resumo'], OPCOES_PADRAO());
  criarAba(ss, 'Produtos', ['id', 'categoria', 'nome', 'descricao', 'preco', 'imagem', 'opcoes', 'observacao', 'disponivel', 'ordem'], PRODUTOS_PADRAO());
  criarAba(ss, 'Pagamentos', ['id', 'nome', 'descricao', 'ativo'], PAGAMENTOS_PADRAO());
  criarAba(ss, 'Bairros', ['bairro', 'taxa', 'ativo'], BAIRROS_PADRAO());
  criarAba(ss, 'Pedidos', ['data', 'codigo', 'cliente', 'telefone', 'tipo', 'endereco', 'bairro', 'taxa', 'itens', 'subtotal', 'total', 'pagamento', 'detalhe', 'observacoes', 'status'], []);
  SpreadsheetApp.getUi().alert('Pronto! Abas criadas. Agora publique como App da Web (Implantar > Nova implantação).');
}

function criarAba(ss, nome, cabecalho, linhas) {
  var sh = ss.getSheetByName(nome);
  if (sh) return sh;                                  // já existe: não sobrescreve
  sh = ss.insertSheet(nome);
  sh.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold').setBackground('#0b0b0b').setFontColor('#F2C230');
  if (linhas.length) sh.getRange(2, 1, linhas.length, cabecalho.length).setValues(linhas);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, cabecalho.length);
  return sh;
}

/* ===================== API ===================== */

function doGet(e) {
  var acao = (e && e.parameter && e.parameter.action) || 'menu';
  if (acao === 'pedidos') return json(listarPedidos(e.parameter.token, e.parameter.limite));
  if (acao === 'raw') return json(lerTudo(e.parameter.token));
  return json(montarMenu());
}

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, erro: 'JSON inválido' }); }
  switch (d.action) {
    case 'login':   return json(login(d.pin));
    case 'pedido':  return json(salvarPedido(d.pedido));
    case 'salvar':  return json(salvarAba(d.token, d.aba, d.linhas));
    case 'status':  return json(mudarStatus(d.token, d.codigo, d.status));
    default:        return json({ ok: false, erro: 'Ação desconhecida' });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== LEITURA ===================== */

function aba(nome) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  var cab = v[0].map(function (c) { return String(c).trim(); });
  return v.slice(1).filter(function (l) { return String(l[0]).trim() !== ''; }).map(function (l) {
    var o = {}; cab.forEach(function (c, i) { o[c] = l[i]; }); return o;
  });
}

function sim(v) { var s = String(v).trim().toUpperCase(); return s === 'SIM' || s === 'TRUE' || s === 'X' || s === '1' || s === 'VERDADEIRO'; }
function num(v) { if (typeof v === 'number') return v; var s = String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? 0 : n; }

function montarMenu() {
  var cfg = {};
  aba('Config').forEach(function (l) { cfg[String(l.chave).trim()] = l.valor; });

  var opcoes = {};
  aba('Opcoes').forEach(function (o) {
    opcoes[String(o.id).trim()] = {
      id: String(o.id).trim(),
      type: String(o.tipo).trim().toLowerCase() === 'check' ? 'check' : 'radio',
      label: String(o.titulo || ''),
      title: String(o.titulo || ''),
      hint: String(o.detalhe || ''),
      price: num(o.preco),
      required: sim(o.obrigatorio),
      choices: String(o.escolhas || '').split(';').map(function (s) { return s.trim(); }).filter(String),
      short: String(o.resumo || o.titulo || '')
    };
  });

  var cats = aba('Categorias').filter(function (c) { return sim(c.ativo); })
    .sort(function (a, b) { return num(a.ordem) - num(b.ordem); })
    .map(function (c) { return { id: String(c.id).trim(), nome: String(c.nome), icone: String(c.icone || 'i-burger'), aviso: String(c.aviso || '') }; });

  var prods = aba('Produtos').sort(function (a, b) { return num(a.ordem) - num(b.ordem); }).map(function (p) {
    return {
      id: String(p.id).trim(),
      cat: String(p.categoria).trim(),
      nome: String(p.nome),
      desc: String(p.descricao || ''),
      preco: num(p.preco),
      img: String(p.imagem || ''),
      opcoes: String(p.opcoes || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s && opcoes[s]; }),
      obs: sim(p.observacao),
      disponivel: sim(p.disponivel)
    };
  });

  var pags = aba('Pagamentos').filter(function (p) { return sim(p.ativo); })
    .map(function (p) { return { id: String(p.id).trim(), nome: String(p.nome), desc: String(p.descricao || '') }; });

  var bairros = aba('Bairros').filter(function (b) { return sim(b.ativo); })
    .map(function (b) { return { nome: String(b.bairro).trim(), taxa: num(b.taxa) }; });

  return {
    ok: true,
    atualizado: new Date().toISOString(),
    config: {
      nome: String(cfg.nome || 'Dejapa Burguer'),
      whatsapp: String(cfg.whatsapp || '').replace(/\D/g, ''),
      whatsappExibicao: String(cfg.whatsappExibicao || ''),
      pix: { chave: String(cfg.pixChave || ''), recebedor: String(cfg.pixRecebedor || ''), cidade: String(cfg.pixCidade || '') },
      linkPagamentoCartao: String(cfg.linkPagamentoCartao || ''),
      precoBurguerExtra: num(cfg.precoBurguerExtra),
      taxaPadrao: String(cfg.taxaPadrao) === '' ? null : num(cfg.taxaPadrao),
      pedidoMinimo: num(cfg.pedidoMinimo),
      avisoClassicos: String(cfg.avisoClassicos || ''),
      bloquearFechado: sim(cfg.bloquearFechado)
    },
    horario: statusHorario(),
    categorias: cats,
    produtos: prods,
    opcoes: opcoes,
    pagamentos: pags,
    bairros: bairros
  };
}

function statusHorario() {
  var dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  var rotulos = { domingo: 'dom', segunda: 'seg', terca: 'ter', quarta: 'qua', quinta: 'qui', sexta: 'sex', sabado: 'sáb' };
  var linhas = {};
  aba('Horarios').forEach(function (h) { linhas[String(h.dia).trim().toLowerCase()] = h; });

  var agora = new Date();
  var minutosAgora = Number(Utilities.formatDate(agora, TZ, 'H')) * 60 + Number(Utilities.formatDate(agora, TZ, 'm'));
  var hoje = Number(Utilities.formatDate(agora, TZ, 'u')) % 7;   // 1=seg … 7=dom -> 0=dom

  function minutos(v) {
    if (v instanceof Date) return v.getHours() * 60 + v.getMinutes();
    var m = String(v).match(/(\d{1,2})[:h](\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function fmt(v) { var m = minutos(v); return m == null ? '' : ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }

  var h = linhas[dias[hoje]];
  if (h && sim(h.aberto)) {
    var a = minutos(h.abre), f = minutos(h.fecha);
    if (a != null && f != null) {
      var fimReal = f <= a ? f + 1440 : f;                       // fecha depois da meia-noite
      if (minutosAgora >= a && minutosAgora < fimReal) return { aberto: true, texto: 'Aberto até ' + fmt(h.fecha) };
      if (minutosAgora < a) return { aberto: false, texto: 'Fechado · abre hoje às ' + fmt(h.abre) };
    }
  }
  for (var i = 1; i <= 7; i++) {
    var d = dias[(hoje + i) % 7], p = linhas[d];
    if (p && sim(p.aberto)) return { aberto: false, texto: 'Fechado · abre ' + rotulos[d] + ' às ' + fmt(p.abre) };
  }
  return { aberto: false, texto: 'Fechado no momento' };
}

/* ===================== PEDIDOS ===================== */

function salvarPedido(p) {
  if (!p) return { ok: false, erro: 'Pedido vazio' };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pedidos');
  if (!sh) return { ok: false, erro: 'Aba Pedidos não existe' };
  var trava = LockService.getScriptLock();
  try { trava.waitLock(8000); } catch (e) { return { ok: false, erro: 'ocupado' }; }
  try {
    sh.appendRow([
      Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'),
      String(p.codigo || ''), String(p.cliente || ''), String(p.telefone || ''), String(p.tipo || ''),
      String(p.endereco || ''), String(p.bairro || ''), num(p.taxa),
      String(p.itens || ''), num(p.subtotal), num(p.total),
      String(p.pagamento || ''), String(p.detalhe || ''), String(p.observacoes || ''), 'Novo'
    ]);
    return { ok: true };
  } finally { trava.releaseLock(); }
}

function listarPedidos(token, limite) {
  if (!validar(token)) return { ok: false, erro: 'Sem permissão' };
  var linhas = aba('Pedidos');
  var n = Math.min(Number(limite || 50), 300);
  return { ok: true, pedidos: linhas.slice(-n).reverse() };
}

function mudarStatus(token, codigo, status) {
  if (!validar(token)) return { ok: false, erro: 'Sem permissão' };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pedidos');
  var v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i > 0; i--) {
    if (String(v[i][1]) === String(codigo)) { sh.getRange(i + 1, 15).setValue(status); return { ok: true }; }
  }
  return { ok: false, erro: 'Pedido não encontrado' };
}

/* ===================== ADMIN ===================== */

function pin() {
  var cfg = {}; aba('Config').forEach(function (l) { cfg[String(l.chave).trim()] = l.valor; });
  return String(cfg.adminPin || PIN_PADRAO).trim();
}

function login(p) {
  if (String(p || '').trim() !== pin()) return { ok: false, erro: 'PIN incorreto' };
  return { ok: true, token: gerarToken() };
}

function gerarToken() {
  var dia = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd');
  var b = Utilities.computeHmacSha256Signature(dia + '|' + pin(), ScriptApp.getScriptId());
  return dia + '.' + Utilities.base64EncodeWebSafe(b).substring(0, 24);
}

function validar(token) { return String(token || '') === gerarToken(); }

/** Devolve as abas cruas para o painel de administração. */
function lerTudo(token) {
  if (!validar(token)) return { ok: false, erro: 'Sem permissão' };
  var abas = ['Config', 'Horarios', 'Categorias', 'Opcoes', 'Produtos', 'Pagamentos', 'Bairros'], out = {};
  abas.forEach(function (n) { out[n] = aba(n); });
  return { ok: true, abas: out };
}

/** Regrava uma aba inteira (cabeçalho preservado). linhas = array de objetos. */
function salvarAba(token, nome, linhas) {
  if (!validar(token)) return { ok: false, erro: 'Sem permissão' };
  var permitidas = ['Config', 'Horarios', 'Categorias', 'Opcoes', 'Produtos', 'Pagamentos', 'Bairros'];
  if (permitidas.indexOf(nome) < 0) return { ok: false, erro: 'Aba não permitida' };
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!sh) return { ok: false, erro: 'Aba não encontrada' };
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (c) { return String(c).trim(); });
  var dados = (linhas || []).map(function (o) { return cab.map(function (c) { return o[c] === undefined || o[c] === null ? '' : o[c]; }); });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, cab.length).clearContent();
  if (dados.length) sh.getRange(2, 1, dados.length, cab.length).setValues(dados);
  return { ok: true, linhas: dados.length };
}

/* ===================== DADOS INICIAIS ===================== */

function CONFIG_PADRAO() {
  return [
    ['nome', 'Dejapa Burguer'],
    ['whatsapp', '5511988320261'],
    ['whatsappExibicao', '(11) 98832-0261'],
    ['pixChave', ''],
    ['pixRecebedor', 'DEJAPA BURGUER'],
    ['pixCidade', 'SAO PAULO'],
    ['linkPagamentoCartao', ''],
    ['precoBurguerExtra', 9.9],
    ['taxaPadrao', ''],
    ['pedidoMinimo', 0],
    ['avisoClassicos', 'Todos os hambúrgueres clássicos acompanham batata frita e mini refrigerante'],
    ['bloquearFechado', 'SIM'],
    ['adminPin', PIN_PADRAO]
  ];
}

function HORARIOS_PADRAO() {
  return [
    ['segunda', 'NAO', '18:00', '23:30'],
    ['terca', 'SIM', '18:00', '23:30'],
    ['quarta', 'SIM', '18:00', '23:30'],
    ['quinta', 'SIM', '18:00', '23:30'],
    ['sexta', 'SIM', '18:00', '00:30'],
    ['sabado', 'SIM', '18:00', '00:30'],
    ['domingo', 'SIM', '18:00', '23:00']
  ];
}

function CATEGORIAS_PADRAO() {
  return [
    ['artesanais', 'Artesanais', 'i-burger', '', 1, 'SIM'],
    ['classicos', 'Clássicos', 'i-burger', 'Todos os hambúrgueres clássicos acompanham batata frita e mini refrigerante', 2, 'SIM'],
    ['porcoes', 'Porções', 'i-fries', '', 3, 'SIM'],
    ['bebidas', 'Bebidas', 'i-drink', '', 4, 'SIM']
  ];
}

function OPCOES_PADRAO() {
  return [
    ['extra', 'check', 'Adicionar +1 burguer', 'Burguer extra de 140g', 9.9, 'NAO', '', '+1 burguer extra'],
    ['refri', 'radio', 'Mini refrigerante do combo', '', '', 'SIM', 'Guaraná;Coca-Cola;Fanta Uva', 'Refri'],
    ['maionese', 'radio', 'Escolha a maionese', '', '', 'SIM', 'Verde artesanal;De alho assado', 'Maionese'],
    ['sabor', 'radio', 'Escolha o sabor', '', '', 'SIM', 'Guaraná;Coca-Cola;Fanta Uva', 'Sabor']
  ];
}

function PRODUTOS_PADRAO() {
  return [
    ['nippon', 'artesanais', 'Nippon Burguer', 'Burguer de 140g, coberto com Catupiry original, queijo prato, queijo coalho gratinado com mel, bacon crocante, cebola e maionese verde artesanal, no pão de brioche.', 30, '', 'extra', 'SIM', 'SIM', 1],
    ['samurai-gold', 'artesanais', 'Samurai Gold Burguer', 'Burguer de 140g, coberto com queijo prato e 110g de Catupiry original empanado com bacon, finalizado com parmesão ralado, no pão de brioche.', 30, '', 'extra', 'SIM', 'SIM', 2],
    ['tokio-bacon-monster', 'artesanais', 'Tokio Bacon Monster', '2 burguers de 140g cada, cobertos com queijo cheddar derretido, bacon crocante, molho cheddar artesanal e maionese artesanal de alho assado, no pão de brioche com farofa de bacon. O verdadeiro matador de fome.', 35, '', 'extra', 'SIM', 'SIM', 3],
    ['osaka-caramel', 'artesanais', 'Osaka Caramel', 'Burguer de 140g, coberto com queijo cheddar, cebola caramelizada e bacon crocante, finalizado com nossa maionese artesanal de alho assado, no pão de brioche.', 30, '', 'extra', 'SIM', 'SIM', 4],
    ['yokohama', 'artesanais', 'Yokohama Burguer', 'Burguer de 140g, coberto com queijo prato, finalizado com maionese de alho assado, no pão de brioche.', 25, '', 'extra', 'SIM', 'SIM', 5],
    ['ninja', 'artesanais', 'Ninja Burguer', 'Burguer de 140g, coberto com queijo cheddar, bacon crocante e ovo, finalizado com nossa maionese verde artesanal, no pão de brioche.', 28, '', 'extra', 'SIM', 'SIM', 6],
    ['kyoto-cream', 'artesanais', 'Kyoto Cream', 'Burguer de 140g, coberto com Catupiry gratinado, picles artesanais e maionese de alho assado, finalizado com cebolinha, no pão de brioche.', 30, '', 'extra', 'SIM', 'SIM', 7],
    ['x-burguer', 'classicos', 'X-Burguer', 'Pão de brioche, burguer de 110g, coberto com queijo cheddar.', 20, '', 'refri', 'SIM', 'SIM', 8],
    ['x-bacon', 'classicos', 'X-Bacon', 'Pão de brioche, burguer de 110g, coberto com queijo cheddar e bacon crocante, finalizado com maionese artesanal de alho assado.', 25, '', 'refri', 'SIM', 'SIM', 9],
    ['x-salada', 'classicos', 'X-Salada', 'Pão de brioche, burguer de 110g, coberto com queijo cheddar, alface americana, tomate e cebola roxa, finalizado com maionese verde artesanal.', 20, '', 'refri', 'SIM', 'SIM', 10],
    ['quarteirao', 'classicos', 'Quarteirão do Dejapa', 'Pão de brioche, burguer de 110g, coberto com queijo prato, picles artesanais, ketchup e mostarda, finalizado com maionese verde artesanal.', 29.9, '', 'refri', 'SIM', 'SIM', 11],
    ['fritas-dejapa', 'porcoes', 'Fritas Dejapa', 'Fritas clássicas. Acompanha maionese verde artesanal ou maionese de alho assado.', 17.9, '', 'maionese', 'SIM', 'SIM', 12],
    ['fritas-cheddar-bacon', 'porcoes', 'Fritas Cheddar & Bacon', 'Nossa maravilhosa batata frita bem crocante, coberta com nosso molho cheddar artesanal e finalizada com farofa de bacon.', 23.9, '', '', 'SIM', 'SIM', 13],
    ['agua-gas', 'bebidas', 'Água com gás', '', 3, '', '', 'NAO', 'SIM', 14],
    ['suco-limonada', 'bebidas', 'Suco Del Valle Limonada (lata)', '', 6, '', '', 'NAO', 'SIM', 15],
    ['refri-mini', 'bebidas', 'Refrigerante mini', 'Guaraná, Coca-Cola ou Fanta Uva.', 4.5, '', 'sabor', 'NAO', 'SIM', 16]
  ];
}

function PAGAMENTOS_PADRAO() {
  return [
    ['pix', 'Pix', 'QR Code ou Copia e Cola com o valor exato', 'SIM'],
    ['credito', 'Cartão de crédito', 'Online ou na maquininha', 'SIM'],
    ['debito', 'Cartão de débito', 'Maquininha na entrega', 'SIM'],
    ['vale', 'Vale-refeição / alimentação', 'VR, Alelo, Pluxee (Sodexo), Ticket, Ben', 'SIM'],
    ['dinheiro', 'Dinheiro', 'Informe se precisa de troco', 'SIM']
  ];
}

function BAIRROS_PADRAO() {
  return [
    ['Centro', 5, 'SIM'],
    ['Jardim Japão', 7, 'SIM'],
    ['Vila Nova', 8, 'SIM'],
    ['Outro bairro', 0, 'SIM']
  ];
}
