// === INICIALIZAÇÃO FIREBASE (FIRESTORE) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCNHOPKa320_cY0KUY8vBVVYRmcYkmWo0Y",
    authDomain: "bd-saripan.firebaseapp.com",
    projectId: "bd-saripan",
    storageBucket: "bd-saripan.firebasestorage.app",
    messagingSenderId: "545578993360",
    appId: "1:545578993360:web:d410a5cbedd914ad3800d5"
};

const appFire = initializeApp(firebaseConfig);
const db = getFirestore(appFire);
const auth = getAuth(appFire);

// === VARIÁVEIS GLOBAIS DA APLICAÇÃO ===
window.modoAtual = ""; 
window.registros = [];
window.dadosCarregadosComSucesso = false; 
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// === ÍCONES DE PRIVACIDADE ===
const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

window.togglePrivacidade = () => {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

window.aplicarPrivacidadeSalva = () => {
    const isHidden = localStorage.getItem('saripan_privacidade') === 'true';
    if (isHidden) document.body.classList.add('modo-privacidade');
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

// === AUTENTICAÇÃO E NAVEGAÇÃO ===
window.entrarModo = (modo) => {
    window.modoAtual = modo;
    if (modo === 'admin') {
        auth.currentUser ? abrirAppAdmin() : document.getElementById('modal-login').classList.remove('hidden');
    } else {
        abrirAppView();
    }
};

window.fecharModalLogin = () => document.getElementById('modal-login').classList.add('hidden');

window.fazerLogin = async () => {
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    if (!email || !senha) return alert("Preencha e-mail e senha.");
    
    try {
        await signInWithEmailAndPassword(auth, email, senha);
        fecharModalLogin();
        document.getElementById('emailLogin').value = '';
        document.getElementById('senhaLogin').value = '';
        abrirAppAdmin();
    } catch (e) { 
        alert("Erro ao entrar: Verifique as credenciais."); 
    }
};

function gerirVisibilidadeBotoes(isAdmin) {
    document.getElementById('inicio').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('btn-tab-registrar').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('btn-tab-financeiro').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('btn-privacidade').style.display = isAdmin ? 'flex' : 'none';
}

function abrirAppAdmin() {
    gerirVisibilidadeBotoes(true);
    window.mudarAba('registrar');
    document.getElementById('dataServico').valueAsDate = new Date();
    window.atualizarPreview();
    carregarDadosFirestore();
}

function abrirAppView() {
    gerirVisibilidadeBotoes(false);
    window.mudarAba('historico');
    carregarDadosFirestore();
}

window.sairApp = async () => {
    if (window.modoAtual === 'view' || confirm("Sair do sistema?")) {
        if (window.modoAtual === 'admin') await signOut(auth);
        location.reload();
    }
};

window.mudarAba = (aba) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`btn-tab-${aba}`).classList.add('active');
    document.getElementById(`painel-${aba}`).classList.add('active');
    
    if (aba === 'registrar') window.atualizarRodapeDinamico();
    if (aba === 'historico') renderizarApontamentos();
    if (aba === 'financeiro') renderizarFinanceiro(); 
};

function mostrarToast() {
    const toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
}

// === CARREGAMENTO DO FIRESTORE ===
async function carregarDadosFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "apontamentos"));
        window.registros = querySnapshot.docs.map(doc => doc.data());
        window.dadosCarregadosComSucesso = true;
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico(); 
    } catch (e) { 
        console.error("Erro no Firestore:", e); 
        alert("Erro de conexão ao baixar o histórico.");
        window.dadosCarregadosComSucesso = false;
    }
}

// === CÁLCULOS E RODAPÉ ===
function obterPeriodo(dataStr) {
    const dateObj = new Date(dataStr);
    return {
        ano: dateObj.getUTCFullYear(),
        mes: dateObj.getUTCMonth(),
        dia: dateObj.getUTCDate(),
        quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2
    };
}

function calcularValor(base, carga, tipoDia) {
    const pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    const multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    return { multiplicador, total: base * multiplicador };
}

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const calc = calcularValor(base, carga, tipoDia);
    document.getElementById('previewValor').value = `R$ ${calc.total.toFixed(2)}`;
};

window.atualizarRodapeDinamico = () => {
    if (window.modoAtual !== 'admin') return;
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return;
    
    const p = obterPeriodo(dataInput);
    let qtdPeso = 0, totalValor = 0;
    
    window.registros.forEach(reg => {
        if (reg.ano === p.ano && reg.mes === p.mes && reg.quinzena === p.quinzena) { 
            qtdPeso += reg.multiplicador; 
            totalValor += reg.total; 
        }
    });
    
    document.getElementById('rodape-qtd').innerText = qtdPeso;
    document.getElementById('rodape-total').innerText = totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

// === CRUD NO FIRESTORE ===
window.adicionarRegistro = async () => {
    if (window.modoAtual !== 'admin') return;
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return alert("Data inválida!");
    
    const btnSalvar = document.getElementById('btn-salvar-registro');
    btnSalvar.innerText = "Salvando...";
    btnSalvar.disabled = true;

    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    
    const calc = calcularValor(base, carga, tipoDia);
    const p = obterPeriodo(dataInput);
    const idUnico = Date.now().toString(); 
    
    const novoReg = { 
        id: idUnico, data: dataInput, ano: p.ano, mes: p.mes, 
        quinzena: p.quinzena, carga, tipoDia, valorBase: base, 
        multiplicador: calc.multiplicador, total: calc.total 
    };
    
    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoReg);
        window.registros.push(novoReg);
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico(); 
        mostrarToast(); 
    } catch(e) {
        alert("Erro ao salvar no banco de dados.");
    } finally {
        btnSalvar.innerText = "✅ Confirmar Apontamento";
        btnSalvar.disabled = false;
    }
};

window.excluirRegistro = async (id) => {
    if (window.modoAtual !== 'admin' || !confirm("Excluir este registro permanentemente?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico();
    } catch(e) {
        alert("Erro ao apagar do banco de dados.");
    }
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (window.modoAtual !== 'admin' || !confirm("ATENÇÃO: Isso apagará TODOS os registros desta quinzena.\n\nTem certeza?")) return;
    
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itensParaExcluir = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q);
    
    try {
        for (const item of itensParaExcluir) {
            await deleteDoc(doc(db, "apontamentos", item.id.toString()));
        }
        window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === q));
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico();
    } catch(e) {
        alert("Erro ao excluir quinzena.");
    }
};

window.toggleAccordion = (header) => {
    header.classList.toggle('active');
    const content = header.nextElementSibling;
    content.classList.toggle('open');
    header.querySelector('span:last-child').innerText = content.classList.contains('open') ? '▼' : '▶';
};

// === RENDERIZAR LISTA NO HISTÓRICO ===
function renderizarApontamentos() {
    const container = document.getElementById('lista-quinzenas-container');
    container.innerHTML = "";
    
    if (window.registros.length === 0) { 
        document.getElementById('msg-sem-dados').style.display = 'block'; 
        return; 
    }
    document.getElementById('msg-sem-dados').style.display = 'none';

    const grupos = {};
    window.registros.forEach(reg => {
        const chave = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[chave]) grupos[chave] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 };
        grupos[chave].itens.push(reg); 
        grupos[chave].totalValor += reg.total;
    });

    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
        const [aA, aM, aQ] = a.split('-').map(Number); const [bA, bM, bQ] = b.split('-').map(Number);
        if (aA !== bA) return bA - aA; if (aM !== bM) return bM - aM; return bQ - aQ;
    });

    let chavesFinais = chavesOrdenadas;
    if (window.modoAtual === 'view') {
        const p = obterPeriodo(new Date().toISOString().split('T')[0]); // Formato YYYY-MM-DD
        const chaveVigente = `${p.ano}-${p.mes}-${p.quinzena}`;
        chavesFinais = chavesOrdenadas.filter(k => k === chaveVigente);
        if (chavesFinais.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:#666;"><h3>Nenhum registro para a quinzena vigente.</h3></div>`;
            return;
        }
    }

    chavesFinais.forEach((chave, index) => {
        const grupo = grupos[chave];
        grupo.itens.sort((a, b) => new Date(a.data) - new Date(b.data));
        const totalPeso = grupo.itens.reduce((acc, item) => acc + item.multiplicador, 0);
        const isFirst = index === 0; 
        const totalFormatado = grupo.totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        const div = document.createElement('div');
        div.className = 'accordion-group';
        
        let headerActions = '', tableHeaders = '', totalRow = '';

        if (window.modoAtual === 'admin') {
            headerActions = `
                <div class="accordion-actions">
                    <button class="btn-icon" style="color:#1976d2;" onclick="event.stopPropagation(); window.gerarPDF('${chave}')" title="Baixar PDF">📄</button>
                    <button class="btn-icon" style="color:#d32f2f;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')" title="Excluir Quinzena">🗑️</button>
                    <span style="margin-left:5px; font-size:12px;">${isFirst ? '▼' : '▶'}</span>
                </div>`;
            tableHeaders = '<th style="text-align:right">Valor</th><th class="td-acao"></th>';
            totalRow = `<tr class="total-row"><td colspan="3">Total do Período</td><td class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr>`;
        } else {
            headerActions = `<div class="accordion-actions"><span style="margin-left:5px; font-size:12px;">${isFirst ? '▼' : '▶'}</span></div>`;
            totalRow = `<tr class="total-row"><td colspan="3" style="text-align: left; padding: 12px;"><div style="margin-bottom:4px;">Dias Trabalhados: ${grupo.itens.length}</div><div style="color:#0d47a1; font-weight:bold;">Diárias a receber: ${totalPeso}</div></td></tr>`;
        }

        const metaInfo = window.modoAtual === 'admin' 
            ? `${grupo.itens.length} registros • Total: <span class="esconder-valor">${totalFormatado}</span>`
            : `${grupo.itens.length} registros trabalhados`;

        div.innerHTML = `
            <div class="accordion-header ${isFirst ? 'active' : ''}" onclick="window.toggleAccordion(this)">
                <div>
                    <div class="accordion-title">${grupo.quinzena}ª Quinzena de ${MESES[grupo.mes]} ${grupo.ano}</div>
                    <div class="accordion-meta">${metaInfo}</div>
                </div>
                ${headerActions}
            </div>
            <div class="accordion-content ${isFirst ? 'open' : ''}">
                <table>
                    <thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th>${tableHeaders}</tr></thead>
                    <tbody>
                        ${grupo.itens.map(item => {
                            const [ano, mes, dia] = item.data.split('-');
                            const tipo = item.carga === 1 ? 'Normal' : 'Dupla';
                            const detalhe = item.tipoDia === 1 ? 'Dia Útil' : item.tipoDia === 2 ? 'Domingo' : 'Feriado';
                            const extraCells = window.modoAtual === 'admin' 
                                ? `<td class="td-valor esconder-valor">R$ ${item.total.toFixed(2)}</td><td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${item.id}')">✖</span></td>` 
                                : '';
                            return `<tr><td>${dia}/${mes}</td><td>${tipo}</td><td>${detalhe}</td>${extraCells}</tr>`;
                        }).join('')}
                        ${totalRow}
                    </tbody>
                </table>
            </div>`;
        container.appendChild(div);
    });
}

// === RENDERIZAR GRÁFICOS E PAINEL FINANCEIRO ===
function renderizarFinanceiro() {
    if (window.modoAtual !== 'admin') return;
    const container = document.getElementById('financeiro-content');
    
    if (window.chartsAtivos) window.chartsAtivos.forEach(c => c.destroy());
    window.chartsAtivos = [];
    
    const dadosMes = {}, totaisAnuais = {};

    window.registros.forEach(reg => {
        const chaveMes = `${reg.ano}-${reg.mes}`;
        if (!dadosMes[chaveMes]) dadosMes[chaveMes] = { ano: reg.ano, mes: reg.mes, q1: 0, q2: 0 };
        reg.quinzena === 1 ? dadosMes[chaveMes].q1 += reg.total : dadosMes[chaveMes].q2 += reg.total;
        
        totaisAnuais[reg.ano] = (totaisAnuais[reg.ano] || 0) + reg.total;
    });

    const chavesMes = Object.keys(dadosMes).sort((a,b) => {
         const [aA, aM] = a.split('-').map(Number); const [bA, bM] = b.split('-').map(Number);
         if (aA !== bA) return bA - aA; return bM - aM;
    });
    const anosOrdenados = Object.keys(totaisAnuais).sort((a,b) => b-a); 

    if (chavesMes.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Sem dados financeiros.</p>";
        return;
    }

    let htmlFinal = '';
    const hoje = new Date();
    const anoAtual = hoje.getFullYear(), mesAtual = hoje.getMonth(), diaAtual = hoje.getDate(); 

    anosOrdenados.forEach(ano => {
        const mesesDesteAno = chavesMes.filter(k => k.startsWith(`${ano}-`));
        let totalAcumuladoAno = 0, totalFechadoAno = 0, qtdMesesFechados = 0;
        const labels = [], dadosQ1 = [], dadosQ2 = [];
        
        let htmlTabela = `<table class="fin-table" style="margin-bottom:30px;"><thead><tr><th>Mês</th><th style="text-align:right">1ª Q.</th><th style="text-align:right">2ª Q.</th><th style="text-align:right; background:#003c8f; color:white;">Total</th></tr></thead><tbody>`;

        mesesDesteAno.forEach(k => {
            const d = dadosMes[k]; 
            const totalDoMes = d.q1 + d.q2;
            totalAcumuladoAno += totalDoMes;
            
            if (d.ano < anoAtual || (d.ano === anoAtual && d.mes < mesAtual)) {
                totalFechadoAno += totalDoMes;
                qtdMesesFechados++;
            }

            labels.push(MESES[d.mes].substring(0, 3)); 
            dadosQ1.push(d.q1); dadosQ2.push(d.q2);

            htmlTabela += `<tr><td>${MESES[d.mes]}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q1.toFixed(2)}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q2.toFixed(2)}</td><td style="text-align:right" class="fin-row-total esconder-valor">R$ ${totalDoMes.toFixed(2)}</td></tr>`;
        });
        htmlTabela += `</tbody></table>`;

        // Lógica Proporcional Diária (A Melhoria)
        const mediaTotal = qtdMesesFechados > 0 ? (totalFechadoAno / qtdMesesFechados) : 0;
        let divisorProporcional = mesesDesteAno.length; 
        
        if (Number(ano) === anoAtual) {
            const diasNoMesAtual = new Date(anoAtual, mesAtual + 1, 0).getDate();
            const fracaoMes = diaAtual / diasNoMesAtual;
            divisorProporcional = mesAtual + fracaoMes; 
        }
        const mediaParcial = divisorProporcional > 0 ? (totalAcumuladoAno / divisorProporcional) : 0;

        const valTotalStr = totalAcumuladoAno.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const valMediaTotalStr = mediaTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const valMediaParcialStr = mediaParcial.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        htmlFinal += `
        <h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo de ${ano}</h4>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <div class="year-summary" style="flex: 1; padding: 10px;">
                <h4 style="font-size: 11px;">RENDIMENTO ANUAL</h4>
                <div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${valTotalStr}</div>
            </div>
            <div class="year-summary" style="flex: 1.8; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                <h4 style="color: #1565c0; font-size: 11px; margin-bottom: 10px;">Média Salarial</h4>
                <div style="display: flex; justify-content: space-around; font-size: 14px; color: #0d47a1;">
                    <div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">PARCIAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${valMediaParcialStr}</strong></div>
                    <div style="width: 1px; background: #bbdefb; margin: 0 5px;"></div>
                    <div style="text-align: center;"><span style="font-size: 10px; font-weight: bold;">TOTAL</span><br><strong class="esconder-valor" style="font-size: 15px;">${valMediaTotalStr}</strong></div>
                </div>
            </div>
        </div>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px;">
            <div style="position: relative; height: 220px; width: 100%;"><canvas id="grafico-${ano}" class="esconder-valor"></canvas></div>
        </div>
        ${htmlTabela}`;

        if (!window.dadosGraficosTemp) window.dadosGraficosTemp = [];
        window.dadosGraficosTemp.push({ ano, labels, dadosQ1, dadosQ2 });
    });

    container.innerHTML = htmlFinal;

    if (window.dadosGraficosTemp) {
        window.dadosGraficosTemp.forEach(g => {
            const ctx = document.getElementById(`grafico-${g.ano}`);
            if (ctx) {
                const myChart = new Chart(ctx, {
                    type: 'bar', 
                    data: {
                        labels: g.labels, 
                        datasets: [
                            { label: '1ª Quinzena', data: g.dadosQ1, backgroundColor: '#81c784', borderRadius: 4 },
                            { label: '2ª Quinzena', data: g.dadosQ2, backgroundColor: '#2e7d32', borderRadius: 4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } }
                });
                window.chartsAtivos.push(myChart); 
            }
        });
        window.dadosGraficosTemp = []; 
    }
}

// === GERADOR DE PDF ===
window.gerarPDF = (chaveGrupo) => {
    if (window.modoAtual !== 'admin') return;
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itens = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q).sort((a, b) => new Date(a.data) - new Date(b.data));
    
    if (itens.length === 0) return alert("Erro: Sem dados para PDF.");
    
    let cnt = { n: 0, d: 0, f: 0, dom: 0, fD: 0, domD: 0 };
    let totalMult = 0, totalDinheiro = 0;
    
    itens.forEach(i => {
        totalMult += i.multiplicador; totalDinheiro += i.total;
        if (i.carga === 1) {
            if (i.tipoDia === 1) cnt.n++; else if (i.tipoDia === 2) cnt.dom++; else if (i.tipoDia === 3) cnt.f++;
        } else { 
            if (i.tipoDia === 1) cnt.d++; else if (i.tipoDia === 2) cnt.domD++; else if (i.tipoDia === 3) cnt.fD++;
        }
    });
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text("SARIPAN - Relatório", 14, 20);
    doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text("Prestador: João Batista Rosa", 14, 28);
    doc.text(`Referência: ${q}ª Quinzena de ${MESES[mes]}`, 14, 34);
    doc.setFont(undefined, 'bold'); doc.text("Resumo do Período:", 14, 44); doc.setFont(undefined, 'normal');
    
    let y = 50;
    if (cnt.n > 0) { doc.text(`- ${cnt.n} diária(s) normal`, 14, y); y += 6; }
    if (cnt.d > 0) { doc.text(`- ${cnt.d} diária(s) dupla`, 14, y); y += 6; }
    if (cnt.f > 0) { doc.text(`- ${cnt.f} feriado(s) normal`, 14, y); y += 6; }
    if (cnt.dom > 0) { doc.text(`- ${cnt.dom} domingo(s)`, 14, y); y += 6; }
    if (cnt.fD > 0) { doc.text(`- ${cnt.fD} feriado(s) dupla`, 14, y); y += 6; }
    if (cnt.domD > 0) { doc.text(`- ${cnt.domD} domingo(s) dupla`, 14, y); y += 6; }
    
    doc.setFont(undefined, 'bold'); y += 2; doc.text(`Total: ${totalMult} diárias a receber`, 14, y);
    
    const bodyData = itens.map(i => [ 
        i.data.split('-').reverse().join('/'), 
        i.carga === 1 ? 'Normal' : 'Dupla', 
        i.tipoDia === 1 ? 'Dia Útil' : i.tipoDia === 2 ? 'Domingo' : 'Feriado', 
        `R$ ${i.total.toFixed(2)}` 
    ]);
    
    doc.autoTable({
        startY: y + 10, head: [['Data', 'Tipo', 'Detalhes', 'Valor']], body: bodyData, theme: 'grid', 
        headStyles: { fillColor: [0, 176, 240], textColor: [0, 0, 0] },
        foot: [['', '', 'Valor Total:', `R$ ${totalDinheiro.toFixed(2)}`]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }
    });
    
    doc.save(`Saripan_${MESES[mes]}_${ano}_Q${q}.pdf`);
};

// === INICIALIZAÇÃO DA PÁGINA ===
window.addEventListener('DOMContentLoaded', () => {
    window.aplicarPrivacidadeSalva();
    document.getElementById('dataServico').addEventListener('change', window.atualizarRodapeDinamico);
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => document.getElementById(id).addEventListener('input', window.atualizarPreview));
    
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});
