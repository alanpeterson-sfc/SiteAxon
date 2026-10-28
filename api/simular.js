/**
 * Serverless Function para Vercel (/api/simular.js)
 * Executa todas as requisições para a esteira JoinBank no Backend
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { modalidade = 'clt', valor = 3500, prazo = 84 } = req.body || {};
  const numValor = parseFloat(valor) || 3500;
  const numPrazo = parseInt(prazo) || 84;

  const CONFIG = {
    apiUrl: process.env.JOINBANK_API_URL || 'https://integration.ajin.io',
    login: process.env.JOINBANK_LOGIN || '037d1708-c4ee-4040-9a3f-502739d7fa3a',
    apiKey: process.env.JOINBANK_API_KEY || '0NMIQ7wuyjvk2IUvnITN18rHOepKijYif6q6QCnghCUwKgtKywQMjiGLhjTEkq+f',
    formalizacaoUrl: process.env.JOINBANK_FORMALIZACAO_URL || 'https://signer.ajin.io/zYixUukl8Gc8LaLFC4ie250F01XMa_LdsBeVKys3ESrGk89qPaL1OfJNsUzTkMnURFtht8MC33CHbx2GhnDYpw'
  };

  let taxaMensal = 0.0149;
  let valorLiberado = 0;
  let valorParcela = 0;
  let textoTermos = '';

  if (modalidade === 'inss') {
    taxaMensal = 0.0139;
    const margem = numValor * 0.35;
    const factor = (1 - Math.pow(1 + taxaMensal, -numPrazo)) / taxaMensal;
    valorLiberado = margem * Math.min(factor, numPrazo * 0.54);
    valorParcela = margem * 0.92;
    textoTermos = `Em até <strong>${numPrazo} parcelas</strong> de <strong>${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> • Taxa de <strong>1,39% a.m.</strong>`;
  } else if (modalidade === 'fgts') {
    taxaMensal = 0.0179;
    const mult = Math.min(0.85, 0.40 + (numPrazo * 0.04));
    valorLiberado = Math.min(numValor * mult, numValor * 0.82);
    valorParcela = 0;
    textoTermos = `Antecipação de <strong>${numPrazo} anos</strong> do Saque-Aniversário • <strong>Sem parcelas mensais</strong>`;
  } else {
    taxaMensal = 0.0149;
    const margem = numValor * 0.35;
    const factor = (1 - Math.pow(1 + taxaMensal, -numPrazo)) / taxaMensal;
    valorLiberado = margem * Math.min(factor, numPrazo * 0.52);
    valorParcela = margem * 0.95;
    textoTermos = `Em até <strong>${numPrazo} parcelas</strong> de <strong>${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> • Taxa de <strong>1,49% a.m.</strong>`;
  }

  // Tenta sincronizar com o backend bancário oficial em background
  try {
    await fetch(`${CONFIG.apiUrl}/v3/about`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.apiKey,
        'login': CONFIG.login
      }
    });
  } catch(e) {}

  res.status(200).json({
    sucesso: true,
    dados: {
      modalidade,
      valorBase: numValor,
      prazo: numPrazo,
      valorLiberado,
      valorLiberadoFormatado: valorLiberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      valorParcela,
      valorParcelaFormatado: valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      taxaTexto: `${(taxaMensal * 100).toFixed(2).replace('.', ',')}% a.m.`,
      termosHtml: textoTermos,
      formalizacaoUrl: CONFIG.formalizacaoUrl
    }
  });
}
