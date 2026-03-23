// === INICIALIZAÇÃO FIREBASE (FIRESTORE) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
    const estaOculto = document.body.classList.contains('modo-privacidade');
    const btn = document.getElementById('btn-privacidade');
    if (estaOculto) {
        document.body.classList.remove('modo-privacidade');
        localStorage.setItem('saripan_privacidade', 'false');
        btn.innerHTML = iconeOlhoAberto;
    } else {
        document.body.classList.add('modo-privacidade');
        localStorage.setItem('saripan_privacidade', 'true');
        btn.innerHTML = iconeOlhoFechado;
    }
};

window.aplicarPrivacidadeSalva = () => {
    const btn = document.getElementById('btn-privacidade');
    if (localStorage.getItem('saripan_privacidade') === 'true') {
        document.body.classList.add('modo-privacidade');
        btn.innerHTML = iconeOlhoFechado;
    } else {
        btn.innerHTML = iconeOlhoAberto;
    }
};

// === AUTENTICAÇÃO E NAVEGAÇÃO ===
window.entrarModo = (modo) => {
    window.modoAtual = modo;
    if (modo === 'admin') {
        if (auth.currentUser) abrirAppAdmin();
        else document.getElementById('modal-login').classList.remove('hidden');
    } else abrirAppView();
};

window.fecharModalLogin = () => { document.getElementById('modal-login').classList.add('hidden'); };

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
    } catch (e) { alert("Erro ao entrar: " + e.message); }
};

function abrirAppAdmin() {
    document.getElementById('inicio').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('btn-tab-registrar').style.display = 'block';
    document.getElementById('btn-tab-financeiro').style.display = 'block';
    document.getElementById('btn-privacidade').style.display = 'flex'; 
    window.mudarAba('registrar');
    document.getElementById('dataServico').valueAsDate = new Date();
    window.atualizarPreview();
    carregarDadosFirestore();
}

function abrirAppView() {
    document.getElementById('inicio').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('btn-tab-registrar').style.display = 'none';
    document.getElementById('btn-tab-financeiro').style.display = 'none';
    document.getElementById('btn-privacidade').style.display = 'none';
    window.mudarAba('historico');
    carregarDadosFirestore();
}

window.sairApp = async () => {
    if (window.modoAtual === 'view') { location.reload(); return; }
    if(confirm("Sair do sistema?")) {
        await signOut(auth);
        location.reload();
    }
};

window.mudarAba = (aba) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    if (aba === 'registrar') {
        document.getElementById('btn-tab-registrar').classList.add('active');
        document.getElementById('painel-registrar').classList.add('active');
        window.atualizarRodapeDinamico();
    } else if (aba === 'historico') {
        document.getElementById('btn-tab-historico').classList.add('active');
        document.getElementById('painel-historico').classList.add('active');
        renderizarApontamentos();
    } else if (aba === 'financeiro') {
        document.getElementById('btn-tab-financeiro').classList.add('active');
        document.getElementById('painel-financeiro').classList.add('active');
        renderizarFinanceiro(); 
    }
};

function mostrarToast() {
    const toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 2900);
}

// === CARREGAMENTO DO FIRESTORE (A NOVA ARQUITETURA BLINDADA) ===
async function carregarDadosFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "apontamentos"));
        window.registros = [];
        querySnapshot.forEach((doc) => {
            window.registros.push(doc.data());
        });
        window.dadosCarregadosComSucesso = true;
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico(); 
    } catch (e) { 
        console.error("Erro ao carregar do Firestore:", e); 
        alert("Erro de conexão ao baixar o histórico.");
        window.dadosCarregadosComSucesso = false;
    }
}

// === RODAPÉ E CÁLCULOS DO FORMULÁRIO ===
window.atualizarRodapeDinamico = () => {
    if (window.modoAtual !== 'admin') return;
    const dataInput = document.getElementById('dataServico').value;
    if (!dataInput) return;
    const dateObj = new Date(dataInput);
    const ano = dateObj.getUTCFullYear(); const mesIndex = dateObj.getUTCMonth(); const dia = dateObj.getUTCDate();
    const quinzena = dia <= 15 ? 1 : 2;
    let qtdPeso = 0; let totalValor = 0;
    window.registros.forEach(reg => {
        if (reg.ano === ano && reg.mes === mesIndex && reg.quinzena === quinzena) { qtdPeso += reg.multiplicador; totalValor += reg.total; }
    });
    document.getElementById('rodape-qtd').innerText = qtdPeso;
    document.getElementById('rodape-total').innerText = totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('rodape-ref').innerText = `Referência: ${quinzena}ª Quinz. de ${MESES[mesIndex]} ${ano}`;
};

function calcularValor(base, carga, tipoDia) {
    let pesoDia = (tipoDia === 3 || tipoDia === 2) ? 2 : 1;
    let multiplicador = (pesoDia === 2 && carga === 2) ? 4 : (carga * pesoDia);
    return { multiplicador: multiplicador, total: base * multiplicador };
}

window.atualizarPreview = () => {
    const base = parseFloat(document.getElementById('valorBase').value) || 0;
    const carga = parseInt(document.getElementById('tipoCarga').value);
    const tipoDia = parseInt(document.getElementById('tipoDia').value);
    const calc = calcularValor(base, carga, tipoDia);
    document.getElementById('previewValor').value = `R$ ${calc.total.toFixed(2)}`;
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
    
    const dateObj = new Date(dataInput);
    const ano = dateObj.getUTCFullYear(); const mesIndex = dateObj.getUTCMonth(); const dia = dateObj.getUTCDate();
    const quinzena = dia <= 15 ? 1 : 2;
    
    const idUnico = Date.now().toString(); 
    const novoReg = { id: idUnico, data: dataInput, ano: ano, mes: mesIndex, quinzena: quinzena, carga: carga, tipoDia: tipoDia, valorBase: base, multiplicador: calc.multiplicador, total: calc.total };
    
    try {
        await setDoc(doc(db, "apontamentos", idUnico), novoReg);
        window.registros.push(novoReg);
        renderizarApontamentos(); 
        window.atualizarRodapeDinamico(); 
        mostrarToast(); 
    } catch(e) {
        console.error(e);
        alert("Erro ao salvar no banco de dados.");
    } finally {
        btnSalvar.innerText = "✅ Confirmar Apontamento";
        btnSalvar.disabled = false;
    }
};

window.excluirRegistro = async (id) => {
    if (window.modoAtual !== 'admin') return;
    if(!confirm("Excluir este registro permanentemente?")) return;
    
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
    if (window.modoAtual !== 'admin') return;
    if (!confirm("ATENÇÃO: Isso apagará TODOS os registros desta quinzena.\n\nTem certeza?")) return;
    
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
    if (window.registros.length === 0) { document.getElementById('msg-sem-dados').style.display = 'block'; return; }
    document.getElementById('msg-sem-dados').style.display = 'none';

    const grupos = {};
    window.registros.forEach(reg => {
        const chave = `${reg.ano}-${reg.mes}-${reg.quinzena}`;
        if (!grupos[chave]) grupos[chave] = { ano: reg.ano, mes: reg.mes, quinzena: reg.quinzena, itens: [], totalValor: 0 };
        grupos[chave].itens.push(reg); grupos[chave].totalValor += reg.total;
    });

    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
        const [aA, aM, aQ] = a.split('-').map(Number); const [bA, bM, bQ] = b.split('-').map(Number);
        if (aA !== bA) return bA - aA; if (aM !== bM) return bM - aM; return bQ - aQ;
    });

    let chavesFinais = chavesOrdenadas;
    if (window.modoAtual === 'view') {
        const hoje = new Date();
        const anoH = hoje.getFullYear(); const mesH = hoje.getMonth(); const diaH = hoje.getDate();
        const quinzH = diaH <= 15 ? 1 : 2;
        const chaveVigente = `${anoH}-${mesH}-${quinzH}`;
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
        const titulo = `${grupo.quinzena}ª Quinzena de ${MESES[grupo.mes]} ${grupo.ano}`;
        const totalFormatado = grupo.totalValor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        const div = document.createElement('div');
        div.className = 'accordion-group';
        let btnPDF = '', btnDeleteHTML = '', metaTexto = '', thValor = '', thAcao = '', totalRowHTML = '';

        if (window.modoAtual === 'admin') {
            metaTexto = `${grupo.itens.length} registros • Total: <span class="esconder-valor">${totalFormatado}</span>`;
            btnPDF = `<button class="btn-icon" style="color:#1976d2;" onclick="event.stopPropagation(); window.gerarPDF('${chave}')" title="Baixar PDF">📄</button>`;
            btnDeleteHTML = `<button class="btn-icon" style="color:#d32f2f;" onclick="event.stopPropagation(); window.excluirQuinzena('${chave}')" title="Excluir Quinzena">🗑️</button>`;
            thValor = '<th style="text-align:right">Valor</th>'; thAcao = '<th class="td-acao"></th>';
            totalRowHTML = `<tr class="total-row"><td colspan="3">Total do Período</td><td class="td-valor esconder-valor">${totalFormatado}</td><td></td></tr>`;
        } else {
            metaTexto = `${grupo.itens.length} registros trabalhados`;
            totalRowHTML = `<tr class="total-row"><td colspan="3" style="text-align: left; padding: 12px;"><div style="margin-bottom:4px;">Total de Dias Trabalhados: ${grupo.itens.length}</div><div style="color:#0d47a1; font-weight:bold;">Total de Diárias a receber: ${totalPeso}</div></td></tr>`;
        }

        div.innerHTML = `
            <div class="accordion-header ${isFirst ? 'active' : ''}" onclick="window.toggleAccordion(this)">
                <div><div class="accordion-title">${titulo}</div><div class="accordion-meta">${metaTexto}</div></div>
                <div class="accordion-actions">${btnPDF}${btnDeleteHTML}<span style="margin-left:5px; font-size:12px;">${isFirst ? '▼' : '▶'}</span></div>
            </div>
            <div class="accordion-content ${isFirst ? 'open' : ''}">
                <table>
                    <thead><tr><th>Data</th><th>Tipo</th><th>Detalhes</th>${thValor}${thAcao}</tr></thead>
                    <tbody>
                        ${grupo.itens.map(item => {
                            const diaStr = item.data.split('-')[2];
                            const tipoStr = item.carga === 1 ? 'Normal' : 'Dupla';
                            const detalheStr = item.tipoDia === 1 ? 'Dia Útil' : item.tipoDia === 2 ? 'Domingo' : 'Feriado';
                            let tdValor = '', tdAcao = '';
                            if (window.modoAtual === 'admin') {
                                tdValor = `<td class="td-valor esconder-valor">R$ ${item.total.toFixed(2)}</td>`;
                                tdAcao = `<td class="td-acao"><span style="color:red; cursor:pointer;" onclick="window.excluirRegistro('${item.id}')">✖</span></td>`;
                            }
                            return `<tr><td>${diaStr}/${(item.mes+1).toString().padStart(2,'0')}</td><td>${tipoStr}</td><td>${detalheStr}</td>${tdValor}${tdAcao}</tr>`;
                        }).join('')}
                        ${totalRowHTML}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(div);
    });
}

// === RENDERIZAR GRÁFICOS E PAINEL FINANCEIRO ===
function renderizarFinanceiro() {
    if (window.modoAtual !== 'admin') return;
    const container = document.getElementById('financeiro-content');
    
    if (window.chartsAtivos) { window.chartsAtivos.forEach(c => c.destroy()); }
    window.chartsAtivos = [];
    container.innerHTML = "";

    const dadosMes = {}; const totaisAnuais = {};

    window.registros.forEach(reg => {
        const chaveMes = `${reg.ano}-${reg.mes}`;
        if (!dadosMes[chaveMes]) dadosMes[chaveMes] = { ano: reg.ano, mes: reg.mes, q1: 0, q2: 0 };
        if (reg.quinzena === 1) dadosMes[chaveMes].q1 += reg.total; else dadosMes[chaveMes].q2 += reg.total;

        if (!totaisAnuais[reg.ano]) totaisAnuais[reg.ano] = 0;
        totaisAnuais[reg.ano] += reg.total;
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
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); 

    anosOrdenados.forEach(ano => {
        const mesesDesteAno = chavesMes.filter(k => k.startsWith(`${ano}-`));
        
        let totalAcumuladoAno = 0;
        let totalFechadoAno = 0;
        let qtdMesesFechados = 0;
        
        const labelsDoGrafico = [];
        const dadosQ1Grafico = [];
        const dadosQ2Grafico = [];

        let htmlTabela = `<table class="fin-table" style="margin-bottom:30px;"><thead><tr><th>Mês</th><th style="text-align:right">1ª Q.</th><th style="text-align:right">2ª Q.</th><th style="text-align:right; background:#003c8f; color:white;">Total</th></tr></thead><tbody>`;

        mesesDesteAno.forEach(k => {
            const d = dadosMes[k]; 
            const totalDoMes = d.q1 + d.q2;
            totalAcumuladoAno += totalDoMes;
            
            const isFechado = (d.ano < anoAtual) || (d.ano === anoAtual && d.mes < mesAtual);
            if (isFechado) {
                totalFechadoAno += totalDoMes;
                qtdMesesFechados++;
            }

            labelsDoGrafico.push(MESES[d.mes].substring(0, 3)); 
            dadosQ1Grafico.push(d.q1);
            dadosQ2Grafico.push(d.q2);

            htmlTabela += `<tr><td>${MESES[d.mes]}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q1.toFixed(2)}</td><td style="text-align:right" class="esconder-valor">R$ ${d.q2.toFixed(2)}</td><td style="text-align:right" class="fin-row-total esconder-valor">R$ ${totalDoMes.toFixed(2)}</td></tr>`;
        });
        htmlTabela += `</tbody></table>`;

        const mediaTotal = mesesDesteAno.length > 0 ? (totalAcumuladoAno / mesesDesteAno.length) : 0;
        const mediaParcial = qtdMesesFechados > 0 ? (totalFechadoAno / qtdMesesFechados) : 0;
        
        const valorTotalStr = totalAcumuladoAno.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const valorMediaTotalStr = mediaTotal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
        const valorMediaParcialStr = mediaParcial.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

        htmlFinal += `<h4 style="margin-top: 10px; color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; text-transform: uppercase;">Resumo de ${ano}</h4>`;

        htmlFinal += `
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <div class="year-summary" style="flex: 1; margin-bottom: 0; padding: 10px;">
                <h4 style="font-size: 11px;">RENDIMENTO ANUAL</h4>
                <div class="year-total-value esconder-valor" style="font-size: 17px; margin-top: 10px;">${valorTotalStr}</div>
            </div>
            
            <div class="year-summary" style="flex: 1.8; margin-bottom: 0; padding: 10px; background: #e3f2fd; border-color: #90caf9;">
                <h4 style="color: #1565c0; font-size: 11px; margin-bottom: 10px;">Média Salarial</h4>
                <div style="display: flex; justify-content: space-around; font-size: 14px; color: #0d47a1;">
                    <div style="text-align: center;">
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: bold;">PARCIAL</span><br>
                        <strong class="esconder-valor" style="font-size: 15px;">${valorMediaParcialStr}</strong>
                    </div>
                    <div style="width: 1px; background: #bbdefb; margin: 0 5px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: bold;">TOTAL</span><br>
                        <strong class="esconder-valor" style="font-size: 15px;">${valorMediaTotalStr}</strong>
                    </div>
                </div>
            </div>
        </div>`;

        htmlFinal += `
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="position: relative; height: 220px; width: 100%;">
                <canvas id="grafico-${ano}" class="esconder-valor"></canvas>
            </div>
        </div>`;

        htmlFinal += htmlTabela;

        if (!window.dadosGraficosTemp) window.dadosGraficosTemp = [];
        window.dadosGraficosTemp.push({ ano: ano, labels: labelsDoGrafico, dadosQ1: dadosQ1Grafico, dadosQ2: dadosQ2Grafico });
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
                    options: { 
                        responsive: true, maintainAspectRatio: false, 
                        plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, 
                        scales: { y: { beginAtZero: true } } 
                    }
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
    const itens = window.registros.filter(r => r.ano === ano && r.mes === mes && r.quinzena === q);
    itens.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    if (itens.length === 0) return alert("Erro: Sem dados.");
    
    let contagem = { normal: 0, dupla: 0, feriado: 0, domingo: 0, feriadoDupla: 0, domingoDupla: 0 };
    let totalMultiplicador = 0; let totalDinheiro = 0;
    
    itens.forEach(i => {
        totalMultiplicador += i.multiplicador; totalDinheiro += i.total;
        if (i.carga === 1) {
            if (i.tipoDia === 1) contagem.normal++; else if (i.tipoDia === 2) contagem.domingo++; else if (i.tipoDia === 3) contagem.feriado++;
        } else { 
            if (i.tipoDia === 1) contagem.dupla++; else if (i.tipoDia === 2) contagem.domingoDupla++; else if (i.tipoDia === 3) contagem.feriadoDupla++;
        }
    });
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text("SARIPAN - Relatório", 14, 20);
    doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text("Prestador: João Batista Rosa", 14, 28);
    const nomeMes = MESES[mes]; doc.text(`Referência: ${q}ª Quinzena de ${nomeMes}`, 14, 34);
    doc.setFont(undefined, 'bold'); doc.text("Resumo do Período:", 14, 44); doc.setFont(undefined, 'normal');
    
    let y = 50;
    if (contagem.normal > 0) { doc.text(`- ${contagem.normal} diária(s) normal`, 14, y); y += 6; }
    if (contagem.dupla > 0) { doc.text(`- ${contagem.dupla} diária(s) dupla`, 14, y); y += 6; }
    if (contagem.feriado > 0) { doc.text(`- ${contagem.feriado} feriado(s) normal`, 14, y); y += 6; }
    if (contagem.domingo > 0) { doc.text(`- ${contagem.domingo} domingo(s)`, 14, y); y += 6; }
    if (contagem.feriadoDupla > 0) { doc.text(`- ${contagem.feriadoDupla} feriado(s) dupla`, 14, y); y += 6; }
    if (contagem.domingoDupla > 0) { doc.text(`- ${contagem.domingoDupla} domingo(s) dupla`, 14, y); y += 6; }
    
    doc.setFont(undefined, 'bold'); y += 2; doc.text(`Total: ${totalMultiplicador} diárias a receber`, 14, y);
    
    const bodyData = itens.map(i => {
        const tipoStr = i.carga === 1 ? 'Normal' : 'Dupla';
        const detalheStr = i.tipoDia === 1 ? 'Dia Útil' : i.tipoDia === 2 ? 'Domingo' : 'Feriado';
        return [ i.data.split('-').reverse().join('/'), tipoStr, detalheStr, `R$ ${i.total.toFixed(2)}` ];
    });
    
    doc.autoTable({
        startY: y + 10, head: [['Data', 'Tipo', 'Detalhes', 'Valor']], body: bodyData, theme: 'grid', 
        headStyles: { fillColor: [0, 176, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
        bodyStyles: { textColor: [0, 0, 0], halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
        foot: [['', '', 'Valor Total:', `R$ ${totalDinheiro.toFixed(2)}`]],
        footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 }
    });
    
    doc.save(`Saripan_${nomeMes}_${ano}_Q${q}.pdf`);
};

// === INICIALIZAÇÃO DA PÁGINA ===
window.addEventListener('DOMContentLoaded', () => {
    window.aplicarPrivacidadeSalva();
    document.getElementById('dataServico').addEventListener('change', window.atualizarRodapeDinamico);
    ['valorBase', 'tipoCarga', 'tipoDia'].forEach(id => document.getElementById(id).addEventListener('input', window.atualizarPreview));
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
});
