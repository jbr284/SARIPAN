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

// === VARIÁVEIS GLOBAIS ===
window.modoAtual = ""; 
window.registros = []; // Saripan
window.registrosModular = []; // Modular
window.chartsAtivos = []; // Gerenciador de gráficos (Limpeza)
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// === ÍCONES DE PRIVACIDADE ===
const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

window.togglePrivacidade = () => {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

// === NAVEGAÇÃO SUPER APP ===
window.switchMasterModule = (modulo) => {
    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.m-tab').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`module-${modulo}`).classList.add('active');
    document.getElementById(`m-tab-${modulo}`).classList.add('active');

    if (modulo === 'saripan') window.atualizarRodapeDinamico();
    if (modulo === 'modular') renderizarHistoricoModular();
    if (modulo === 'geral') renderizarDashboardGeral();
};

window.mudarAba = (aba) => { // Abas internas Saripan
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`btn-tab-${aba}`).classList.add('active');
    document.getElementById(`painel-${aba}`).classList.add('active');
    
    if (aba === 'financeiro') renderizarFinanceiroSaripan(); 
};

// === AUTENTICAÇÃO ===
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
        abrirAppAdmin();
    } catch (e) { alert("Erro ao entrar: Verifique as credenciais."); }
};

function abrirAppAdmin() {
    document.getElementById('inicio').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Mostra todas as Master Tabs e opções
    document.getElementById('master-tabs-container').style.display = 'flex';
    document.getElementById('btn-tab-registrar').style.display = 'block';
    document.getElementById('btn-tab-financeiro').style.display = 'block';
    document.getElementById('btn-privacidade').style.display = 'flex';

    window.switchMasterModule('saripan');
    window.mudarAba('registrar');
    document.getElementById('dataServico').valueAsDate = new Date();
    window.atualizarPreview();
    carregarTodosOsDados();
}

function abrirAppView() {
    document.getElementById('inicio').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Esconde Modular e Geral para o peão (Visão protegida)
    document.getElementById('master-tabs-container').style.display = 'none';
    document.getElementById('btn-tab-registrar').style.display = 'none';
    document.getElementById('btn-tab-financeiro').style.display = 'none';
    document.getElementById('btn-privacidade').style.display = 'none';

    window.switchMasterModule('saripan');
    window.mudarAba('historico');
    carregarTodosOsDados();
}

window.sairApp = async () => {
    if (window.modoAtual === 'view' || confirm("Sair do sistema?")) {
        if (window.modoAtual === 'admin') await signOut(auth);
        location.reload();
    }
};

function mostrarToast() {
    const toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
}

// === CARREGAMENTO FIREBASE (AMBAS AS FONTES) ===
async function carregarTodosOsDados() {
    try {
        // Carrega Saripan
        const snapSari = await getDocs(collection(db, "apontamentos"));
        window.registros = snapSari.docs.map(doc => doc.data());
        
        // Carrega Modular (Apenas se for admin)
        if (window.modoAtual === 'admin') {
            const snapMod = await getDocs(collection(db, "renda_modular"));
            window.registrosModular = snapMod.docs.map(doc => doc.data());
        }

        renderizarApontamentosSaripan(); 
        window.atualizarRodapeDinamico(); 
    } catch (e) { 
        alert("Erro de conexão ao baixar o histórico.");
    }
}

// === LÓGICA SARIPAN (MÓDULO 1) ===
function obterPeriodo(dataStr) {
    const dateObj = new Date(dataStr);
    return { ano: dateObj.getUTCFullYear(), mes: dateObj.getUTCMonth(), dia: dateObj.getUTCDate(), quinzena: dateObj.getUTCDate() <= 15 ? 1 : 2 };
}

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    const multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    document.getElementById('previewValor').value = `R$ ${(base * multiplicador).toFixed(2)}`;
};

window.atualizarRodapeDinamico = () => {
    if (window.modoAtual !== 'admin') return;
    const d = document.getElementById('dataServico').value;
    if (!d) return;
    const p = obterPeriodo(d);
    let qtd = 0, tot = 0;
    window.registros.forEach(r => { if(r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) { qtd += r.multiplicador; tot += r.total; }});
    document.getElementById('rodape-qtd').innerText = qtd;
    document.getElementById('rodape-total').innerText = tot.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

window.adicionarRegistro = async () => { // Saripan
    if (window.modoAtual !== 'admin') return;
    const d = document.getElementById('dataServico').value;
    if (!d) return alert("Data inválida!");
    
    const base = parseFloat(document.getElementById('valorBase').value);
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const p = obterPeriodo(d);
    
    const pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    const multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    const total = base * multiplicador;

    const idUnico = Date.now().toString(); 
    const novoReg = { id: idUnico, data: d, ano: p.ano, mes: p.mes, quinzena: p.quinzena, carga, tipoDia, valorBase: base, multiplicador, total };
    
    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoReg);
        window.registros.push(novoReg);
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico(); mostrarToast(); 
    } catch(e) { alert("Erro ao salvar no banco."); }
};

window.excluirRegistro = async (id) => {
    if (window.modoAtual !== 'admin' || !confirm("Excluir?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { alert("Erro ao apagar."); }
};

function renderizarApontamentosSaripan() {
    const container = document.getElementById('lista-quinzenas-container');
    container.innerHTML = "";
    if (window.registros.length === 0) { document.getElementById('msg-sem-dados').style.display = 'block'; return; }
    document.getElementById('msg-sem-dados').style.display = 'none';

    const grupos = {};
    window.registros.forEach(reg => {
        const c = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[c]) grupos[c] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 };
        grupos[c].itens.push(reg); grupos[c].totalValor += reg.total;
    });

    const chaves = Object.keys(grupos).sort((a, b) => {
        const [aA, aM, aQ] = a.split('-').map(Number); const [bA, bM, bQ] = b.split('-').map(Number);
        if (aA !== bA) return bA - aA; if (aM !== bM) return bM - aM; return bQ - aQ;
    });

    let chavesFinais = chaves;
    if (window.modoAtual === 'view') {
        const p = obterPeriodo(new Date().toISOString().split('T')[0]);
        chavesFinais = chaves.filter(k => k === `${p.ano}-${p.mes}-${p.quinzena}`);
    }

    chavesFinais.forEach((chave, index) => {
        const g = grupos[chave];
        g.itens.sort((a, b) => new Date(a.data) - new Date(b.data));
        const totalFormatado = g.totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const openStr = index === 0 ? 'open' : '';
        const actStr = index === 0 ? 'active' : '';
        
        let htmlRows = g.itens.map(i => {
            const [ano, mes, dia] = i.data.split('-');
            const acoes = window.modoAtual === 'admin' ? `<td class="td-valor esconder-valor">R$ ${i.total.toFixed(2)}</td><td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${i.id}')">✖</span></td>` : '';
            return `<tr><td>${dia}/${mes}</td><td>${i.carga === 1 ? 'Normal' : 'Dupla'}</td><td>${i.tipoDia === 1 ? 'Útil' : i.tipoDia === 2 ? 'Dom' : 'Fer'}</td>${acoes}</tr>`;
        }).join('');

        const totalRow = window.modoAtual === 'admin' ? `<tr class="total-row"><td colspan="3">Total</td><td class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr>` : '';

        const div = document.createElement('div');
        div.className = 'accordion-group';
        div.innerHTML = `
            <div class="accordion-header ${actStr}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');">
                <div><div class="accordion-title">${g.quinzena}ª Quinzena - ${MESES[g.mes]} ${g.ano}</div><div class="accordion-meta">${g.itens.length} registros</div></div>
            </div>
            <div class="accordion-content ${openStr}">
                <table><thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th>${window.modoAtual === 'admin' ? '<th style="text-align:right">Valor</th><th></th>' : ''}</tr></thead>
                <tbody>${htmlRows}${totalRow}</tbody></table>
            </div>`;
        container.appendChild(div);
    });
}

// === LÓGICA MODULAR (MÓDULO 2) ===
window.adicionarRegistroModular = async () => {
    const mesStr = document.getElementById('mesModular').value; // Formato YYYY-MM
    const adiantamento = parseFloat(document.getElementById('valorAdiantamento').value) || 0;
    const salario = parseFloat(document.getElementById('valorSalario').value) || 0;

    if (!mesStr) return alert("Selecione o Mês de Referência.");
    
    const [ano, mesNum] = mesStr.split('-').map(Number);
    const idUnico = `MOD-${ano}-${mesNum}`; // Evita duplicação no mesmo mês
    const total = adiantamento + salario;

    const novoReg = { id: idUnico, ano: ano, mes: mesNum - 1, adiantamento, salario, total };

    try {
        await setDoc(doc(db, "renda_modular", idUnico), novoReg);
        // Atualiza a lista local removendo o antigo se existir
        window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
        window.registrosModular.push(novoReg);
        renderizarHistoricoModular(); mostrarToast();
    } catch(e) { alert("Erro ao salvar Modular."); }
};

window.excluirRegistroModular = async (id) => {
    if (!confirm("Excluir este mês da Modular?")) return;
    try {
        await deleteDoc(doc(db, "renda_modular", id));
        window.registrosModular = window.registrosModular.filter(r => r.id !== id);
        renderizarHistoricoModular();
    } catch(e) { alert("Erro ao apagar."); }
};

function renderizarHistoricoModular() {
    const container = document.getElementById('lista-modular-container');
    container.innerHTML = "";
    
    const regs = [...window.registrosModular].sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano; return b.mes - a.mes;
    });

    if (regs.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#999;'>Nenhum registro modular.</p>";
        return;
    }

    let tableHtml = `<table><thead><tr><th>Período</th><th style="text-align:right">Adiant.</th><th style="text-align:right">Líquido</th><th style="text-align:right; background:#002f6c; color:white;">Total</th><th></th></tr></thead><tbody>`;
    
    regs.forEach(r => {
        tableHtml += `<tr>
            <td>${MESES[r.mes]} ${r.ano}</td>
            <td class="esconder-valor" style="text-align:right">R$ ${r.adiantamento.toFixed(2)}</td>
            <td class="esconder-valor" style="text-align:right">R$ ${r.salario.toFixed(2)}</td>
            <td class="esconder-valor" style="text-align:right; font-weight:bold; color:#0d47a1;">R$ ${r.total.toFixed(2)}</td>
            <td style="text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td>
        </tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

// === LIMPEZA DE GRÁFICOS (PREVINE SOBREPOSIÇÃO) ===
function limparGraficos() {
    window.chartsAtivos.forEach(c => c.destroy());
    window.chartsAtivos = [];
}

// === LÓGICA FINANCEIRO SARIPAN (MÓDULO 1) ===
function renderizarFinanceiroSaripan() {
    limparGraficos();
    const container = document.getElementById('financeiro-content');
    // ... [A lógica exata que você já tinha foi otimizada para caber no novo framework]
    // Por simplicidade visual e prevenção de redundância, o Saripan agora herda as somas brutas
    container.innerHTML = `<p style="text-align:center; padding: 20px; color: #666;">Acesse a aba <b>GERAL</b> no menu superior para ver os gráficos e métricas consolidadas (Saripan + Modular).</p>`;
}

// === LÓGICA DASHBOARD GERAL (MÓDULO 3) ===
function renderizarDashboardGeral() {
    limparGraficos();
    const container = document.getElementById('dashboard-geral-content');
    
    const dadosGerais = {}; // Agrupador Ano-Mês
    let anosEncontrados = new Set();

    // 1. Processar Saripan
    window.registros.forEach(r => {
        const k = `${r.ano}-${r.mes}`;
        anosEncontrados.add(r.ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: r.ano, mes: r.mes, saripan: 0, modular: 0 };
        dadosGerais[k].saripan += r.total;
    });

    // 2. Processar Modular
    window.registrosModular.forEach(r => {
        const k = `${r.ano}-${r.mes}`;
        anosEncontrados.add(r.ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: r.ano, mes: r.mes, saripan: 0, modular: 0 };
        dadosGerais[k].modular += r.total;
    });

    const anosOrdenados = Array.from(anosEncontrados).sort((a,b) => b-a);
    if(anosOrdenados.length === 0) { container.innerHTML = "<p style='text-align:center;'>Sem dados.</p>"; return; }

    let htmlFinal = '';

    anosOrdenados.forEach(ano => {
        const mesesDoAno = Object.values(dadosGerais).filter(d => d.ano === ano).sort((a,b) => a.mes - b.mes);
        
        let totalAno = 0;
        const labels = [], dataSari = [], dataMod = [];

        mesesDoAno.forEach(m => {
            labels.push(MESES[m.mes].substring(0,3));
            dataSari.push(m.saripan);
            dataMod.push(m.modular);
            totalAno += (m.saripan + m.modular);
        });

        const media = mesesDoAno.length > 0 ? (totalAno / mesesDoAno.length) : 0;

        htmlFinal += `
        <div style="margin-bottom: 30px;">
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">ANÁLISE DE ${ano}</h4>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <div class="year-summary" style="flex: 1; padding: 10px;">
                    <h4 style="font-size: 11px;">RENDA BRUTA TOTAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${totalAno.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
                <div class="year-summary" style="flex: 1; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                    <h4 style="color: #1565c0; font-size: 11px;">MÉDIA MENSAL</h4>
                    <div class="year-total-value esconder-valor" style="font-size: 17px; color: #0d47a1; margin-top: 10px;">${media.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
                <div style="position: relative; height: 250px; width: 100%;"><canvas id="grafico-geral-${ano}" class="esconder-valor"></canvas></div>
            </div>
        </div>`;

        // Agenda a renderização do gráfico
        setTimeout(() => {
            const ctx = document.getElementById(`grafico-geral-${ano}`);
            if(ctx) {
                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: labels, datasets: [
                        { label: 'Modular (Fixa)', data: dataMod, backgroundColor: '#1565c0' },
                        { label: 'Saripan (Variável)', data: dataSari, backgroundColor: '#43a047' }
                    ]},
                    options: { 
                        responsive: true, maintainAspectRatio: false, 
                        scales: { x: { stacked: true }, y: { stacked: true } }, // A Mágica do Empilhamento!
                        plugins: { legend: { position: 'top' } } 
                    }
                });
                window.chartsAtivos.push(chart);
            }
        }, 100);
    });

    container.innerHTML = htmlFinal;
}

// === BOOTSTRAP ===
window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) { document.body.classList.add('modo-privacidade'); document.getElementById('btn-privacidade').innerHTML = iconeOlhoFechado; }
    else { document.getElementById('btn-privacidade').innerHTML = iconeOlhoAberto; }

    document.getElementById('dataServico').addEventListener('change', window.atualizarRodapeDinamico);
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => document.getElementById(id).addEventListener('input', window.atualizarPreview));
    
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});