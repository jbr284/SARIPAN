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
window.registros = []; 
window.registrosModular = []; 
window.chartsAtivos = []; 
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// === ÍCONES DE PRIVACIDADE ===
const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

window.togglePrivacidade = () => {
    const isHidden = document.body.classList.toggle('modo-privacidade');
    localStorage.setItem('saripan_privacidade', isHidden);
    document.getElementById('btn-privacidade').innerHTML = isHidden ? iconeOlhoFechado : iconeOlhoAberto;
};

// === AUTENTICAÇÃO E ROTEAMENTO ===
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-hub').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
        carregarTodosOsDados();
    } else {
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-hub').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

window.fazerLogin = async () => {
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    if (!email || !senha) return alert("Preencha e-mail e senha.");
    const btn = document.querySelector('#tela-login .btn-action');
    btn.innerText = "Entrando...";
    try { await signInWithEmailAndPassword(auth, email, senha); } 
    catch (e) { alert("Erro ao entrar: Verifique as credenciais."); } 
    finally { btn.innerText = "Entrar"; }
};

window.sairApp = async () => { if (confirm("Deseja realmente sair da sua conta?")) await signOut(auth); };

// === NAVEGAÇÃO DE MÓDULOS INDIVIDUAIS ===
window.abrirModulo = (modulo) => {
    document.getElementById('tela-hub').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    const titulos = { 'saripan': 'MÓDULO SARIPAN', 'modular': 'MÓDULO MODULAR', 'geral': 'VISÃO GERAL' };
    document.getElementById('app-title').innerText = titulos[modulo];

    document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
    document.getElementById(`module-${modulo}`).classList.add('active');

    if (modulo === 'saripan') {
        window.mudarAba('registrar');
        window.atualizarRodapeDinamico();
    }
    if (modulo === 'modular') {
        renderizarHistoricoModular();
        // Limpa campos extras ao abrir
        document.getElementById('valorOutras').value = "";
    }
    if (modulo === 'geral') renderizarDashboardGeral();
};

window.voltarAoHub = () => {
    document.getElementById('app').classList.add('hidden');
    document.getElementById('tela-hub').classList.remove('hidden');
};

window.mudarAba = (aba) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`btn-tab-${aba}`).classList.add('active');
    document.getElementById(`painel-${aba}`).classList.add('active');
    if (aba === 'financeiro') renderizarFinanceiroSaripan(); 
};

function mostrarToast() {
    const toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(() => toast.className = toast.className.replace("show", ""), 2900);
}

// === CARREGAMENTO FIREBASE ===
async function carregarTodosOsDados() {
    try {
        const snapSari = await getDocs(collection(db, "apontamentos"));
        window.registros = snapSari.docs.map(doc => doc.data());
        
        const snapMod = await getDocs(collection(db, "renda_modular"));
        window.registrosModular = snapMod.docs.map(doc => doc.data());

        renderizarApontamentosSaripan(); 
        window.atualizarRodapeDinamico(); 
    } catch (e) { 
        console.error("Erro fatal do Firebase:", e);
        alert("Erro de conexão ao baixar os dados do Firebase. Verifique suas regras de segurança ou conexão.");
    }
}

// === LÓGICA SARIPAN ===
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
    const d = document.getElementById('dataServico').value;
    if (!d) return;
    const p = obterPeriodo(d);
    let qtd = 0, tot = 0;
    window.registros.forEach(r => { if(r.ano === p.ano && r.mes === p.mes && r.quinzena === p.quinzena) { qtd += r.multiplicador; tot += r.total; }});
    document.getElementById('rodape-qtd').innerText = qtd;
    document.getElementById('rodape-total').innerText = tot.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${p.quinzena}ª Quinz. de ${MESES[p.mes]} ${p.ano}`;
};

window.adicionarRegistro = async () => {
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
    if (!confirm("Excluir?")) return;
    try {
        await deleteDoc(doc(db, "apontamentos", id.toString()));
        window.registros = window.registros.filter(r => r.id.toString() !== id.toString());
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { alert("Erro ao apagar."); }
};

window.excluirQuinzena = async (chaveGrupo) => {
    if (!confirm("ATENÇÃO: Isso apagará TODOS os registros desta quinzena.\n\nTem certeza?")) return;
    const [ano, mes, q] = chaveGrupo.split('-').map(Number);
    const itens = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q);
    try {
        for (const item of itens) { await deleteDoc(doc(db, "apontamentos", item.id.toString())); }
        window.registros = window.registros.filter(r => !(r.ano === ano && r.mes === mes && r.quinzena === q));
        renderizarApontamentosSaripan(); window.atualizarRodapeDinamico();
    } catch(e) { alert("Erro ao excluir quinzena."); }
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

    chaves.forEach((chave, index) => {
        const g = grupos[chave];
        g.itens.sort((a, b) => new Date(a.data) - new Date(b.data));
        const totalFormatado = g.totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const openStr = index === 0 ? 'open' : '';
        const actStr = index === 0 ? 'active' : '';
        
        let htmlRows = g.itens.map(i => {
            const [ano, mes, dia] = i.data.split('-');
            const acoes = `<td class="td-valor esconder-valor">R$ ${i.total.toFixed(2)}</td><td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${i.id}')">✖</span></td>`;
            return `<tr><td>${dia}/${mes}</td><td>${i.carga === 1 ? 'Normal' : 'Dupla'}</td><td>${i.tipoDia === 1 ? 'Útil' : i.tipoDia === 2 ? 'Dom' : 'Fer'}</td>${acoes}</tr>`;
        }).join('');

        const totalRow = `<tr class="total-row"><td colspan="3">Total</td><td class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr>`;

        const headerActions = `
        <div class="accordion-actions">
            <button class="btn-icon" style="color:#1976d2;" onclick="event.stopPropagation(); window.gerarPDF('${chave}')" title="Baixar PDF">📄</button>
            <button class="btn-icon" style="color:#d32f2f;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')" title="Excluir Quinzena">🗑️</button>
            <span style="margin-left:5px; font-size:12px;">${index === 0 ? '▼' : '▶'}</span>
        </div>`;

        const div = document.createElement('div');
        div.className = 'accordion-group';
        div.innerHTML = `
            <div class="accordion-header ${actStr}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('open');">
                <div><div class="accordion-title">${g.quinzena}ª Quinzena - ${MESES[g.mes]} ${g.ano}</div><div class="accordion-meta">${g.itens.length} registros</div></div>
                ${headerActions}
            </div>
            <div class="accordion-content ${openStr}">
                <table><thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th><th style="text-align:right">Valor</th><th></th></tr></thead>
                <tbody>${htmlRows}${totalRow}</tbody></table>
            </div>`;
        container.appendChild(div);
    });
}

// === LÓGICA FINANCEIRO SARIPAN ===
function limparGraficos() {
    window.chartsAtivos.forEach(c => c.destroy());
    window.chartsAtivos = [];
}

function renderizarFinanceiroSaripan() {
    limparGraficos();
    const container = document.getElementById('financeiro-content');
    
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
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Sem dados financeiros no Saripan.</p>";
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
        <h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo de ${ano} (Saripan)</h4>
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
            <div style="position: relative; height: 220px; width: 100%;"><canvas id="grafico-sari-${ano}" class="esconder-valor"></canvas></div>
        </div>
        ${htmlTabela}`;

        setTimeout(() => {
            const ctx = document.getElementById(`grafico-sari-${ano}`);
            if (ctx) {
                const myChart = new Chart(ctx, {
                    type: 'bar', 
                    data: {
                        labels: labels, 
                        datasets: [
                            { label: '1ª Quinzena', data: dadosQ1, backgroundColor: '#81c784', borderRadius: 4 },
                            { label: '2ª Quinzena', data: dadosQ2, backgroundColor: '#2e7d32', borderRadius: 4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } }
                });
                window.chartsAtivos.push(myChart); 
            }
        }, 100);
    });

    container.innerHTML = htmlFinal;
}

// === LÓGICA MODULAR ===
window.adicionarRegistroModular = async () => {
    const mesStr = document.getElementById('mesModular').value; 
    const adiantamento = parseFloat(document.getElementById('valorAdiantamento').value) || 0;
    const salario = parseFloat(document.getElementById('valorSalario').value) || 0;
    const outras = parseFloat(document.getElementById('valorOutras').value) || 0;

    if (!mesStr) return alert("Selecione o Mês de Referência.");
    
    const [ano, mesNum] = mesStr.split('-').map(Number);
    const idUnico = `MOD-${ano}-${mesNum}`; 
    const total = adiantamento + salario + outras; // Soma tudo agora

    const novoReg = { id: idUnico, ano: ano, mes: mesNum - 1, adiantamento, salario, outras, total };

    try {
        await setDoc(doc(db, "renda_modular", idUnico), novoReg);
        window.registrosModular = window.registrosModular.filter(r => r.id !== idUnico);
        window.registrosModular.push(novoReg);
        renderizarHistoricoModular(); mostrarToast();
        document.getElementById('valorOutras').value = ""; // Limpa após salvar
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

    let tableHtml = `<table><thead><tr><th>Período</th><th style="text-align:right">Adiant/Liq</th><th style="text-align:right">Extras</th><th style="text-align:right; background:#002f6c; color:white;">Total</th><th></th></tr></thead><tbody>`;
    
    regs.forEach(r => {
        const extrasStr = (r.outras && r.outras > 0) ? `R$ ${r.outras.toFixed(2)}` : "-";
        tableHtml += `<tr>
            <td>${MESES[r.mes]} ${r.ano}</td>
            <td class="esconder-valor" style="text-align:right; font-size:11px;">R$ ${(r.adiantamento + r.salario).toFixed(2)}</td>
            <td class="esconder-valor" style="text-align:right; color:#1565c0;">${extrasStr}</td>
            <td class="esconder-valor" style="text-align:right; font-weight:bold; color:#0d47a1;">R$ ${r.total.toFixed(2)}</td>
            <td style="text-align:center;"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistroModular('${r.id}')">✖</span></td>
        </tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

// === LÓGICA DASHBOARD GERAL ===
function renderizarDashboardGeral() {
    limparGraficos();
    const container = document.getElementById('dashboard-geral-content');
    const dadosGerais = {}; 
    let anosEncontrados = new Set();

    window.registros.forEach(r => {
        const k = `${r.ano}-${r.mes}`;
        anosEncontrados.add(r.ano);
        if(!dadosGerais[k]) dadosGerais[k] = { ano: r.ano, mes: r.mes, saripan: 0, modular: 0 };
        dadosGerais[k].saripan += r.total;
    });

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
            <h4 style="color: #f57c00; border-bottom: 2px solid #ffe0b2; padding-bottom: 5px;">ANÁLISE DE ${ano} (SOMA GLOBAL)</h4>
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
                        scales: { x: { stacked: true }, y: { stacked: true } },
                        plugins: { legend: { position: 'top' } } 
                    }
                });
                window.chartsAtivos.push(chart);
            }
        }, 100);
    });

    container.innerHTML = htmlFinal;
}

// === GERADOR DE PDF ===
window.gerarPDF = (chaveGrupo) => {
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

// === PREENCHIMENTO AUTOMÁTICO DE DATAS ===
function definirDatasAtuais() {
    const localDate = new Date();
    const ano = localDate.getFullYear();
    const mes = String(localDate.getMonth() + 1).padStart(2, '0');
    const dia = String(localDate.getDate()).padStart(2, '0');
    
    // Campo do Saripan (YYYY-MM-DD)
    if(document.getElementById('dataServico')) document.getElementById('dataServico').value = `${ano}-${mes}-${dia}`;
    
    // Campo da Modular (YYYY-MM)
    if(document.getElementById('mesModular')) document.getElementById('mesModular').value = `${ano}-${mes}`;
}

// === BOOTSTRAP INICIAL ===
window.addEventListener('DOMContentLoaded', () => {
    const privSalva = localStorage.getItem('saripan_privacidade') === 'true';
    if(privSalva) { document.body.classList.add('modo-privacidade'); document.getElementById('btn-privacidade').innerHTML = iconeOlhoFechado; }
    else { document.getElementById('btn-privacidade').innerHTML = iconeOlhoAberto; }

    definirDatasAtuais();

    document.getElementById('dataServico').addEventListener('change', window.atualizarRodapeDinamico);
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => document.getElementById(id).addEventListener('input', window.atualizarPreview));
    
    window.atualizarPreview();

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});
