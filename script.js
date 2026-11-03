// Função para converter Emojis Unicode em Entidades HTML
function convertEmojisToHtmlEntities(text) {
  let count = 0;
  const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

  const convertedText = text.replace(emojiRegex, (match) => {
    count++;
    let entity = '';
    for (let i = 0; i < match.length; i++) {
      const codePoint = match.codePointAt(i);
      if (codePoint > 127) {
        entity += '&#x' + codePoint.toString(16).toUpperCase() + ';';
        if (codePoint > 0xFFFF) i++;
      } else {
        entity += match[i];
      }
    }
    return entity;
  });

  return { convertedText, count };
}

// Converte o Markdown digitado em HTML estilizado para e-mail corporativo
function markdownToEmailHtml(mdText, logoUrl) {
  // Configura a biblioteca marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  let rawHtml = marked.parse(mdText);

  // Template HTML wrapper para e-mails corporativos
  return `<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px 0; background-color: #ffffff; color: #202020; }
      .conteiner { max-width: 800px; margin: 0 auto; padding: 0 16px; }
      .cabecalho { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .logo { background: url(${logoUrl}) no-repeat 0px -3967px; width: 87px; height: 29px; margin: auto; }
      .cartao { background-color: #fff; border-radius: 6px; padding: 22px; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06); }
      p { margin: 0 0 16px 0; line-height: 1.5; font-size: 14px; }
      blockquote { display: block; background: #f8f9fa; border-left: 4px solid #2d5a5a; padding: 14px; border-radius: 4px; margin: 18px 0; color: #333; font-size: 14px; line-height: 1.5; }
      blockquote p { margin: 0; }
      hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
      a { color: #2d5a5a; word-break: break-all; }
      @media (max-width: 480px) { .conteiner { padding: 0 12px; } .cartao { padding: 16px; } }
    </style>
  </head>
  <body>
    <div class="conteiner">
      <header class="cabecalho">
        <div class="logo"></div>
      </header>
      <main class="cartao">
${rawHtml}
      </main>
    </div>
  </body>
</html>`;
}

// DOM Elements
const vasstInput = document.getElementById('vasst');
const vurlLogoInput = document.getElementById('vurl_logo');
const pfromInput = document.getElementById('pfrom');
const pbccInput = document.getElementById('pbcc');
const errorEmailInput = document.getElementById('error_email');
const sqlCursorInput = document.getElementById('sql_cursor');
const vmesgMdInput = document.getElementById('vmesg_md');
const plsqlOutputCode = document.getElementById('plsql-output-code');
const emojiCounter = document.getElementById('emoji-counter');
const iframePreview = document.getElementById('iframe-preview');

// Tabs
const tabBtnEmail = document.getElementById('tab-btn-email');
const tabBtnPlsql = document.getElementById('tab-btn-plsql');
const tabContentEmail = document.getElementById('tab-content-email');
const tabContentPlsql = document.getElementById('tab-content-plsql');

const viewTabPlsql = document.getElementById('view-tab-plsql');
const viewTabPreview = document.getElementById('view-tab-preview');
const containerPlsql = document.getElementById('container-plsql');
const containerPreview = document.getElementById('container-preview');

// Carrega os valores padrão do defaults.js
function loadDefaults() {
  if (typeof DEFAULT_CONFIG !== 'undefined') {
    vasstInput.value = DEFAULT_CONFIG.vasst || '';
    vurlLogoInput.value = DEFAULT_CONFIG.vurl_logo || '';
    pfromInput.value = DEFAULT_CONFIG.pfrom || '';
    pbccInput.value = DEFAULT_CONFIG.pbcc || '';
    errorEmailInput.value = DEFAULT_CONFIG.error_email || '';
    sqlCursorInput.value = DEFAULT_CONFIG.sql_cursor || '';
    vmesgMdInput.value = DEFAULT_CONFIG.vmesg_markdown || '';
  }
  generatePLSQL();
}

// Função Principal de Geração do Código PL/SQL
function generatePLSQL() {
  const vasst = vasstInput.value.trim() || 'Sem Assunto';
  const vurl_logo = vurlLogoInput.value.trim();
  const pfrom = pfromInput.value.trim();
  const pbcc = pbccInput.value.trim();
  const errorEmail = errorEmailInput.value.trim();

  // Recebe o SQL do cursor inteiro digitado pelo usuário e adiciona recuo de 4 espaços
  const rawSqlCursor = sqlCursorInput.value.trim();
  const indentedSqlCursor = rawSqlCursor
    ? rawSqlCursor.split('\n').map(line => '    ' + line).join('\n')
    : '    select 1 from dual';

  // Converte Markdown para HTML base
  const rawMarkdown = vmesgMdInput.value;
  const generatedHtml = markdownToEmailHtml(rawMarkdown, vurl_logo);

  // Converte emojis para HTML entities
  const { convertedText: htmlWithEntities, count: emojiCount } = convertEmojisToHtmlEntities(generatedHtml);
  emojiCounter.querySelector('span').innerText = `${emojiCount} emoji(s) convertido(s)`;

  // Escapa aspas simples para o PL/SQL (' -> '')
  let escapedHtml = htmlWithEntities.replace(/'/g, "''");

  const plsqlScript = `declare
  cursor c1 is
${indentedSqlCursor};

  vasst     varchar2(1000) := '${vasst.replace(/'/g, "''")}';
  vmesg     varchar2(32000);

begin

  vmesg := '${escapedHtml}';

  vmesg := pp_editor_texto.acentua_html(vmesg);

  for r1 in c1 loop
    begin

      pw_gtj_util.send_mail (
        pto          => r1.fuemail,
        pbcc         => '${pbcc.replace(/'/g, "''")}',
        pfrom        => '${pfrom.replace(/'/g, "''")}',
        psubject     => vasst,
        phtml_msg    => vmesg,
        psmtp_host   => f_ip_mail_externo,
        psmtp_port   => 25
      );

    exception
      when others then
        pp_oramail.sendmail(
          '${errorEmail}',
          vasst,
          'ERRO ENVIO DE E-MAIL ' || vasst || ': '
          || chr(10) || chr(10)
          || 'Nome: ' || r1.funomfunc
          || chr(10) || chr(10)
          || 'E-mail: ' || r1.fuemail
          || chr(10) || chr(10)
          || sqlerrm
        );
    end;
  end loop;
end;
/`;

  plsqlOutputCode.textContent = plsqlScript;

  // Atualiza a visualização do e-mail
  updateIframePreview(rawMarkdown, vurl_logo);
}

function updateIframePreview(mdContent, logoUrl) {
  const fullHtml = markdownToEmailHtml(mdContent, logoUrl);
  const doc = iframePreview.contentDocument || iframePreview.contentWindow.document;
  doc.open();
  doc.write(fullHtml);
  doc.close();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').innerText = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2500);
}

// Event Listeners
[vasstInput, vurlLogoInput, pfromInput, pbccInput, errorEmailInput, sqlCursorInput, vmesgMdInput].forEach(input => {
  input.addEventListener('input', generatePLSQL);
});

tabBtnEmail.addEventListener('click', () => {
  tabContentEmail.classList.remove('hidden');
  tabContentPlsql.classList.add('hidden');
  tabBtnEmail.classList.add('text-red-500', 'border-b-2', 'border-red-500');
  tabBtnEmail.classList.remove('text-slate-400');
  tabBtnPlsql.classList.remove('text-red-500', 'border-b-2', 'border-red-500');
  tabBtnPlsql.classList.add('text-slate-400');
});

tabBtnPlsql.addEventListener('click', () => {
  tabContentPlsql.classList.remove('hidden');
  tabContentEmail.classList.add('hidden');
  tabBtnPlsql.classList.add('text-red-500', 'border-b-2', 'border-red-500');
  tabBtnPlsql.classList.remove('text-slate-400');
  tabBtnEmail.classList.remove('text-red-500', 'border-b-2', 'border-red-500');
  tabBtnEmail.classList.add('text-slate-400');
});

viewTabPlsql.addEventListener('click', () => {
  containerPlsql.classList.remove('hidden');
  containerPreview.classList.add('hidden');
  viewTabPlsql.classList.add('bg-slate-800', 'text-white');
  viewTabPlsql.classList.remove('text-slate-400');
  viewTabPreview.classList.remove('bg-slate-800', 'text-white');
  viewTabPreview.classList.add('text-slate-400');
});

viewTabPreview.addEventListener('click', () => {
  containerPreview.classList.remove('hidden');
  containerPlsql.classList.add('hidden');
  viewTabPreview.classList.add('bg-slate-800', 'text-white');
  viewTabPreview.classList.remove('text-slate-400');
  viewTabPlsql.classList.remove('bg-slate-800', 'text-white');
  viewTabPlsql.classList.add('text-slate-400');
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  const code = plsqlOutputCode.textContent;
  const textArea = document.createElement('textarea');
  textArea.value = code;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Script PL/SQL copiado com sucesso!');
  } catch (err) {
    showToast('Erro ao copiar código.');
  }
  document.body.removeChild(textArea);
});

document.getElementById('btn-download-sql').addEventListener('click', () => {
  const code = plsqlOutputCode.textContent;
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'envio_email_lote.sql';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Download do arquivo .SQL iniciado!');
});

document.getElementById('btn-load-template').addEventListener('click', () => {
  loadDefaults();
  showToast('Valores padrão carregados!');
});

window.onload = function() {
  loadDefaults();
};