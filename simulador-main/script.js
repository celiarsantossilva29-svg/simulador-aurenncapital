// ========================================
// SIMULADOR DE CONSÓRCIO - AURENN CAPITAL
// ========================================

let currentMode = 'integral'; // 'integral' | 'reduzida'
let modoLancePagar = 'pct'; // 'pct' | 'valor'

// ========================================
// ADMIN DATA & LOGOS
// ========================================

const adminData = {
    porto_seguro: { name: 'Porto Seguro', color: '#003399', logo: 'logo-porto.png', logoH: 70 },
    embracon: { name: 'Embracon', color: '#E30613', logo: 'logo-embracon.png', logoH: 32 },
    rodobens: { name: 'Rodobens', color: '#1B4D3E', logo: 'logo-rodobens.png', logoH: 50 },
    canopus: { name: 'Canopus', color: '#1B3A6B', logo: 'logo-canopus.png', logoH: 70 },
    magalu: { name: 'Magalu Consórcio', color: '#0086FF', logo: '', logoH: 50 }
};

// STATE PERSISTENCE
let currentAdmin = 'porto_seguro'; // Initial default
const savedRates = {
    porto_seguro: { taxa: '15', fundo: '2', seguro: '0.04' },
    embracon: { taxa: '24.8', fundo: '2', seguro: '0' },
    rodobens: { taxa: '15', fundo: '2', seguro: '0' },
    canopus: { taxa: '18', fundo: '2', seguro: '0' },
    magalu: { taxa: '16', fundo: '2', seguro: '0' }
};

function trocarAdministradora() {
    // 1. Save current state
    const taxaInput = document.getElementById('taxaAdm');
    const fundoInput = document.getElementById('fundoReserva');
    const seguroInput = document.getElementById('seguroPrestamista');

    if (currentAdmin) {
        if (!savedRates[currentAdmin]) savedRates[currentAdmin] = {};
        savedRates[currentAdmin] = {
            taxa: taxaInput.value,
            fundo: fundoInput.value,
            seguro: seguroInput.value
        };
    }

    const sel = document.getElementById('administradora');
    const key = sel.value;

    // 2. Load new state (if exists, else defaults or keep input?)
    // Using defined defaults ensures clean switching.
    if (savedRates[key]) {
        taxaInput.value = savedRates[key].taxa;
        fundoInput.value = savedRates[key].fundo;
        seguroInput.value = savedRates[key].seguro;
    }

    currentAdmin = key;

    // 3. Update Logo
    const d = adminData[key];
    const container = document.getElementById('adminLogoContainer');
    if (d && d.logo) {
        container.innerHTML = `<img src="${d.logo}" alt="${d.name}" class="admin-logo-img" style="height:${d.logoH}px">`;
    } else if (d) {
        const initials = d.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        container.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" style="vertical-align:middle">
            <rect width="28" height="28" rx="4" fill="${d.color}"/>
            <text x="14" y="15" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="10" font-weight="700" font-family="Inter,sans-serif">${initials}</text>
        </svg> <span class="admin-name" style="color:${d.color}">${d.name}</span>`;
    } else {
        container.innerHTML = '';
    }
    atualizarSeletorReducao();
    calcular();
}

let taxasVisible = false;

function toggleTaxas() {
    taxasVisible = !taxasVisible;
    const row = document.getElementById('taxasRow');
    row.style.display = taxasVisible ? 'flex' : 'none';
}

// ========================================
// MODE SWITCHING
// ========================================

function setMode(mode) {
    currentMode = mode;
    const btnI = document.getElementById('btnIntegral');
    const btnR = document.getElementById('btnReduzida');
    const antGroup = document.getElementById('antecipada-group');
    const antLabel = document.getElementById('antecipada-label');

    if (mode === 'integral') {
        btnI.classList.add('active');
        btnR.classList.remove('active');
        antGroup.style.display = '';
        antLabel.style.display = 'none';
    } else {
        btnI.classList.remove('active');
        btnR.classList.add('active');
        antGroup.style.display = '';
        antLabel.style.display = 'none';
    }
    atualizarSeletorReducao();
    calcular();
}

function atualizarSeletorReducao() {
    const container = document.getElementById('pctReducaoContainer');
    if (currentMode === 'reduzida') {
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

// ========================================
// RICH TEXT EDITOR
// ========================================

function formatText(command, value) {
    if (command === 'hilite') {
        document.execCommand('hiliteColor', false, '#FFD54F');
    } else {
        document.execCommand(command, false, value || null);
    }
    // Keep focus on editor
    document.getElementById('observacoes').focus();
}

// ========================================
// STATE PERSISTENCE (localStorage)
// ========================================

function salvarEstado() {
    const estado = {
        mode: currentMode,
        admin: document.getElementById('administradora').value,
        tipoBem: document.getElementById('tipoBem').value,
        taxaAdm: document.getElementById('taxaAdm').value,
        fundoReserva: document.getElementById('fundoReserva').value,
        seguro: document.getElementById('seguroPrestamista').value,
        credito: document.getElementById('valorCredito').value,
        prazo: document.getElementById('prazoGrupo').value,
        reducao: document.querySelector('input[name="reducao"]:checked').value,
        lanceEmbutido: document.getElementById('lanceEmbutido').value,
        lancePagar: document.getElementById('lancePagar').value,
        primeirasN: document.getElementById('primeirasN').value,
        antecipada: document.getElementById('antecipada').value,
        pctReducao: document.getElementById('pctReducao').value,
        modoLance: modoLancePagar,
        observacoes: document.getElementById('observacoes').innerHTML
    };
    localStorage.setItem('cr_simulacao', JSON.stringify(estado));
}

function restaurarEstado() {
    const raw = localStorage.getItem('cr_simulacao');
    if (!raw) return;
    try {
        const s = JSON.parse(raw);

        // Apenas restaura Modo, Administradora, Tipo Bem, e as Taxas.
        // Valores como crédito e observações agora vêm em branco.

        // Mode
        if (s.mode) {
            currentMode = s.mode;
            setMode(s.mode);
        }

        // Selects
        if (s.admin) document.getElementById('administradora').value = s.admin;
        if (s.tipoBem) document.getElementById('tipoBem').value = s.tipoBem;
        if (s.primeirasN) document.getElementById('primeirasN').value = s.primeirasN;

        // Numeric inputs (Taxas e Valores persistentes)
        if (s.taxaAdm) document.getElementById('taxaAdm').value = s.taxaAdm;
        if (s.fundoReserva) document.getElementById('fundoReserva').value = s.fundoReserva;
        if (s.seguro) document.getElementById('seguroPrestamista').value = s.seguro;
        if (s.credito) document.getElementById('valorCredito').value = s.credito;
        if (s.prazo) document.getElementById('prazoGrupo').value = s.prazo;

        if (s.modoLance) {
            modoLancePagar = s.modoLance;
            atualizarVisualModoLance();
        }

        // Radio
        if (s.reducao) {
            const radio = document.querySelector(`input[name="reducao"][value="${s.reducao}"]`);
            if (radio) radio.checked = true;
        }

    } catch (e) {
        console.warn('Erro ao restaurar estado:', e);
    }
}

// ========================================
// FORMATTING UTILITIES
// ========================================

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatCurrencyInput(input) {
    let raw = input.value.replace(/[^\d]/g, '');
    if (raw.length === 0) { input.value = ''; return; }
    let num = parseInt(raw) / 100;
    input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// ========================================
// UI TOGGLES & REVERSE CALCULATION (TOGGLE & LOGIC)
// ========================================

function toggleTaxas() {
    const row = document.getElementById('taxasRow');
    const btn = document.getElementById('btnToggleTaxas');
    if (row.style.display === 'none') {
        row.style.display = 'flex';
        btn.classList.add('active');
    } else {
        row.style.display = 'none';
        btn.classList.remove('active');
    }
}

function toggleFluxoLance() {
    modoLancePagar = modoLancePagar === 'pct' ? 'valor' : 'pct';
    atualizarVisualModoLance();
    calcular();
}

function atualizarVisualModoLance() {
    const inputPct = document.getElementById('lancePagar');
    const inputVal = document.getElementById('valorPagar');
    const boxPct = document.getElementById('boxLancePagarPct');
    const boxVal = document.getElementById('boxLancePagarVal');

    if (modoLancePagar === 'pct') {
        // Porcentagem ativa
        inputPct.readOnly = false;
        inputVal.readOnly = true;

        // Estilos visuais
        if (boxPct) {
            boxPct.querySelector('.field-input').classList.remove('readonly');
        }
        if (boxVal) {
            boxVal.querySelector('.field-input').classList.add('readonly');
        }
    } else {
        // Valor ativo
        inputPct.readOnly = true;
        inputVal.readOnly = false;

        // Estilos
        if (boxVal) {
            boxVal.querySelector('.field-input').classList.remove('readonly');
        }
        if (boxPct) {
            boxPct.querySelector('.field-input').classList.add('readonly');
        }
    }
}

// ========================================
// MAIN CALCULATION
// ========================================

function calcular() {
    // Read inputs
    const taxaAdm = parseFloat(document.getElementById('taxaAdm').value) / 100 || 0;
    const fundoReserva = parseFloat(document.getElementById('fundoReserva').value) / 100 || 0;
    const seguro = parseFloat(document.getElementById('seguroPrestamista').value) || 0;
    const credito = parseCurrency(document.getElementById('valorCredito').value);
    const prazo = parseInt(document.getElementById('prazoGrupo').value) || 1;
    const reducao = document.querySelector('input[name="reducao"]:checked').value;
    const lanceEmbutidoPct = parseFloat(document.getElementById('lanceEmbutido').value) / 100 || 0;
    const lancePagarPct = parseFloat(document.getElementById('lancePagar').value) / 100 || 0;
    const lanceTotalPct = lanceEmbutidoPct + lancePagarPct;
    const primeirasN = parseInt(document.getElementById('primeirasN').value) || 1;
    const antecipadaPct = (parseFloat(document.getElementById('antecipada').value) || 0) / 100;

    const adminKey = document.getElementById('administradora').value;
    const isEmbracon = adminKey === 'embracon';

    // ========================================
    // PARCELA MENSAL (INTEGRAL)
    // ========================================
    const totalTaxas = taxaAdm + fundoReserva + seguro;
    const fatorTotal = 1 + totalTaxas;
    const parcelaMensal = (credito * fatorTotal) / prazo;

    // ========================================
    // PARCELA BASE (depends on mode)
    // ========================================
    let parcelaBase;
    if (currentMode === 'integral') {
        parcelaBase = parcelaMensal;
    } else {
        // Read reduction from input (e.g. 25 -> 0.25)
        const valRed = parseFloat(document.getElementById('pctReducao').value);
        const pctReducao = (isNaN(valRed) ? 25 : valRed) / 100;
        const fatorReducao = 1 - pctReducao;

        if (isEmbracon) {
            // Embracon: Crédito REDUZIDO, Fundo Reserva REDUZIDO, Taxa Adm INTEGRAL, Seguro INTEGRAL
            const partCredito = (credito * fatorReducao) / prazo;
            const partAdm = (credito * taxaAdm) / prazo;
            const partFundo = (credito * fundoReserva * fatorReducao) / prazo;
            const partSeguro = (credito * seguro) / prazo;

            parcelaBase = partCredito + partAdm + partFundo + partSeguro;
        } else {
            // Outros: Redução sobre a parcela cheia
            parcelaBase = parcelaMensal * fatorReducao;
        }
    }

    // ========================================
    // ANTECIPADA
    // ========================================
    const antecipadaTotal = credito * antecipadaPct;
    const antecipadaMensal = antecipadaTotal / primeirasN;

    // ========================================
    // PRIMEIRAS N PARCELAS
    // ========================================
    const primeiras = parcelaBase + antecipadaMensal;

    // ========================================
    // LANCE
    // ========================================
    let valorTotalLance, valorEmbutido;
    let baseCalculo;

    if (isEmbracon) {
        // Embracon: lance calculado sobre o crédito puro (sem taxas)
        baseCalculo = credito;
    } else {
        // Outros: lance total sobre plano total (varia com taxas)
        const planoTotal = (parcelaMensal * prazo) + antecipadaTotal;
        baseCalculo = planoTotal;
    }

    let valorAPagar = 0;

    if (modoLancePagar === 'pct') {
        // Modo Padrão: Usuário digitou %
        if (lanceTotalPct === 0) {
            valorTotalLance = 0;
            valorEmbutido = 0;
            valorAPagar = 0;
        } else {
            if (adminKey === 'porto_seguro') {
                const limiteEmbutido = 0.30 * credito;
                const embutidoDesejado = lanceEmbutidoPct * baseCalculo;
                
                // Embutido cobra até o limite de 30% do Crédito.
                valorEmbutido = Math.min(embutidoDesejado, limiteEmbutido);
                
                // O excesso do que a pessoa tentou embutir além dos 30% vira pagar do bolso
                const overflowEmbutido = Math.max(0, embutidoDesejado - limiteEmbutido);
                
                // O Lance a Pagar soma esse excesso + o percentual explícito que ela digitou a pagar
                valorAPagar = (lancePagarPct * baseCalculo) + overflowEmbutido;
                valorTotalLance = valorEmbutido + valorAPagar;
            } else {
                valorTotalLance = lanceTotalPct * baseCalculo;
                valorEmbutido = lanceEmbutidoPct * credito;
                valorAPagar = valorTotalLance - valorEmbutido;
            }
        }
    } else {
        // Modo Reverso: Usuário digitou $ no campo a Pagar
        const valorPagarDigitado = parseCurrency(document.getElementById('valorPagar').value);
        valorAPagar = valorPagarDigitado;

        if (adminKey === 'porto_seguro') {
            // Embutido base: usa estritamente o percentual digitado limitando a 30% do crédito
            const limiteEmbutido = 0.30 * credito;
            const valorEmbutidoDesejado = lanceEmbutidoPct * credito;
            valorEmbutido = Math.min(valorEmbutidoDesejado, limiteEmbutido);
        } else {
            // Embutido base: usa estritamente o percentual digitado sobre o crédito
            valorEmbutido = lanceEmbutidoPct * credito;
        }

        valorTotalLance = valorAPagar + valorEmbutido;

        // Atualiza campos inativos (%)
        let pctCalculada = valorTotalLance / baseCalculo;
        if (pctCalculada < 0) pctCalculada = 0;

        let pagarPctCalc = pctCalculada - (valorEmbutido / credito);
        if (pagarPctCalc < 0) pagarPctCalc = 0;
        document.getElementById('lancePagar').value = (pagarPctCalc * 100).toFixed(2);
        
        // Also update embutido % for reverse cases
        document.getElementById('lanceEmbutido').value = ((valorEmbutido / credito) * 100).toFixed(2);
    }

    // ========================================
    // CRÉDITO LÍQUIDO
    // ========================================
    // O Crédito Líquido deve descontar EXCLUSIVAMENTE o "Valor Embutido" e ignorar
    // o "Lance a Pagar" (dinheiro do próprio bolso do cliente), conforme instrução.
    let descontoCreditoLiquido = valorEmbutido;
    const creditoLiquido = credito - descontoCreditoLiquido;

    // ========================================
    // PÓS-CONTEMPLAÇÃO (modelo padrão para todas as admins)
    // ========================================
    // Para pós-contemplação, usar fórmula padrão (mesmo modelo Porto Seguro)
    const parcelaBasePos = currentMode === 'integral' ? parcelaMensal : parcelaMensal * 0.75;
    let prazoRestante, parcelaPosContemp;

    if (reducao === 'parcela') {
        // Mantém prazo, reduz parcela
        prazoRestante = prazo - 1;
        const totalPlanoRegular = parcelaMensal * prazo;

        let custoRestante;
        if (currentMode === 'integral') {
            custoRestante = totalPlanoRegular - valorTotalLance - primeiras;
        } else {
            custoRestante = totalPlanoRegular - valorTotalLance - parcelaBasePos - antecipadaTotal;
        }
        parcelaPosContemp = custoRestante / prazoRestante;
    } else {
        // Mantém parcela, reduz prazo
        const totalPlano = parcelaMensal * prazo;
        let custoRestantePrazo;
        if (currentMode === 'integral') {
            custoRestantePrazo = totalPlano - valorTotalLance - primeiras;
        } else {
            custoRestantePrazo = totalPlano - valorTotalLance - parcelaBasePos - antecipadaTotal;
        }
        prazoRestante = Math.round(custoRestantePrazo / parcelaBasePos);
        parcelaPosContemp = parcelaBasePos;
    }

    // ========================================
    // UPDATE DISPLAY: Lance section
    // ========================================
    // Atualizar as % na interface para refletir a matemática real aplicada
    const efetivoEmbutidoPct = valorEmbutido / credito;
    let efetivoPagarPct = 0;
    if (baseCalculo > 0) {
        efetivoPagarPct = valorAPagar / baseCalculo;
    }

    // Atualizamos os campos de input, mas só se eles precisarem ser sobreescritos pela trava
    // Na verdade, para não "apagar" o que o usuário digita no modo % enquanto ele digita, 
    // atualizamos apenas o display readonly 'lanceTotal' e os 'valores em R$' 
    // O usuário entende que o Embutido dele foi convertido em Valor na caixa abaixo.

    // We compute the effective total percentage (as the embutido could be capped)
    let efetivoTotalPct = baseCalculo > 0 ? (valorTotalLance / baseCalculo) : 0;
    document.getElementById('lanceTotal').value = (efetivoTotalPct * 100).toFixed(2).replace('.', ',');
    document.getElementById('valorEmbutido').value = formatCurrency(valorEmbutido);
    document.getElementById('valorPagar').value = formatCurrency(valorAPagar);
    document.getElementById('valorTotal').value = formatCurrency(valorTotalLance);

    // ========================================
    // UPDATE DISPLAY: Results (now using .value since they are input fields)
    // ========================================
    document.getElementById('resultPrimeiras').value = formatCurrency(primeiras);
    document.getElementById('resultDemais').value = formatCurrency(parcelaBase);
    document.getElementById('resultCredLiquido').value = formatCurrency(creditoLiquido);
    document.getElementById('resultPosContemp').value = formatCurrency(parcelaPosContemp);
    document.getElementById('resultPrazoRestante').value = prazoRestante;

    // Save state to localStorage
    salvarEstado();

    // Atualiza Comparativo silenciosamente para manter os dados sincronizados
    if (typeof calcComparativo === 'function') {
        calcComparativo();
    }
}

// ========================================
// PDF GENERATION
// ========================================

function gerarPDFSimuladorFrontend() {
    if (typeof html2pdf === 'undefined') {
        alert('Carregando biblioteca PDF... Aguarde um instante e tente novamente.');
        // Retry logic could go here, but alert is enough for now.
        return;
    }
    try {
        const admin = document.getElementById('administradora');
        const adminKey = admin.value;
        const adminName = admin.options[admin.selectedIndex].text;
        const obsEl = document.getElementById('observacoes');
        const observacoes = obsEl ? obsEl.innerHTML.trim() : '';
        const hasObs = observacoes && observacoes !== '<br>' && observacoes !== '<br/>';
        const d = adminData[adminKey];
        // Use Base64 logos if available to avoid Tainted Canvas
        const adminLogoSrc = (d && d.logo && logoBase64[d.logo]) ? logoBase64[d.logo] : (d ? d.logo : '');
        const headerLogoSrc = logoBase64['logo-nova-transparent.png'] || 'logo-nova-transparent.png';

        const adminColor = d ? d.color : '#333';

        const tipo = document.getElementById('tipoBem');
        const tipoText = tipo.options[tipo.selectedIndex].text;

        let modeLabel = currentMode === 'integral' ? 'Parcela Integral' : 'Parcela Reduzida';
        let isReduzida = (currentMode === 'reduzida');
        let valRed = 25;
        if (isReduzida) {
            valRed = parseFloat(document.getElementById('pctReducao').value) || 25;
            modeLabel += ` (${valRed}% até Contemplação)`;
        }
        const primeirasN = document.getElementById('primeirasN').value;
        const primeirasLabel = primeirasN === '1' ? 'À Vista' : primeirasN;
        const primeirasTituloPdf = parseInt(primeirasN) > 1 ? `PRIMEIRAS<br>${primeirasN} PARCELAS` : `1ª<br>PARCELA`;

        const taxaAdm = document.getElementById('taxaAdm').value;
        const fundoReserva = document.getElementById('fundoReserva').value;
        const seguro = document.getElementById('seguroPrestamista');
        const seguroVal = parseFloat(seguro.value) || 0;
        const seguroText = seguroVal === 0 ? 'Sem Seguro' : seguroVal + '%';
        const credito = document.getElementById('valorCredito').value;
        const prazo = document.getElementById('prazoGrupo').value;

        const lanceEmb = document.getElementById('lanceEmbutido').value;
        const valorEmb = document.getElementById('valorEmbutido').value;
        const lancePag = document.getElementById('lancePagar').value;
        const valorPag = document.getElementById('valorPagar').value;
        const lanceTotal = document.getElementById('lanceTotal').value;
        const valorTotal = document.getElementById('valorTotal').value;

        // Calcule as porcentagens efetivas para o PDF baseadas no baseCalculo real
        const adminKeyForPdf = document.getElementById('administradora').value;
        const isEmbraconPdf = adminKeyForPdf === 'embracon';
        const creditoFloat = parseCurrency(credito);
        const baseCalcPdf = isEmbraconPdf ? creditoFloat : (creditoFloat * (1 + (parseFloat(taxaAdm) || 0)/100 + (parseFloat(fundoReserva) || 0)/100 + (parseFloat(seguroVal) || 0)/100));
        
        const valEmbNum = parseCurrency(valorEmb);
        const valPagNum = parseCurrency(valorPag);
        
        const efetivoEmbPctStr = baseCalcPdf > 0 ? (valEmbNum / baseCalcPdf * 100).toFixed(2).replace('.', ',') : "0,00";
        const efetivoPagPctStr = baseCalcPdf > 0 ? (valPagNum / baseCalcPdf * 100).toFixed(2).replace('.', ',') : "0,00";

        const resultPrim = document.getElementById('resultPrimeiras').value;
        const resultDemais = document.getElementById('resultDemais').value;
        const resultCL = document.getElementById('resultCredLiquido').value;
        const resultPos = document.getElementById('resultPosContemp').value;
        const resultPrazo = document.getElementById('resultPrazoRestante').value;

        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const formatterBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        const planoText = formatterBRL.format(baseCalcPdf);

        const showTaxas = document.getElementById('taxasRow').style.display !== 'none';
        let taxasHtml = '';
        if (showTaxas) {
            taxasHtml = `
            <div class="pdf-rates-banner">
                <div class="pdf-rate-item">
                    <span class="pdf-rate-lbl">TAXA ADM.</span>
                    <span class="pdf-rate-val">${taxaAdm}%</span>
                </div>
                <div class="pdf-rate-item">
                    <span class="pdf-rate-lbl">FUNDO RESERVA</span>
                    <span class="pdf-rate-val">${fundoReserva}%</span>
                </div>
                <div class="pdf-rate-item">
                    <span class="pdf-rate-lbl">SEGURO (PF)</span>
                    <span class="pdf-rate-val">${seguroText}</span>
                </div>
            </div>
            `;
        }

        // Build the content for PDF
        const element = document.createElement('div');
        element.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
            #pdf-content{width:210mm;height:295mm;padding:12mm 18mm;background:#fff;position:relative}
            
            /* Header */
            .pdf-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;background:#fff!important}
            .pdf-header-left{display:flex;align-items:center;}
            .pdf-header-left img{height:105px;object-fit:contain;background:#fff!important}
            .pdf-header-center{text-align:left;border-left:1px solid #d4af37;padding-left:20px;flex:1;margin-left:25px;display:flex;flex-direction:column;justify-content:center;}
            .pdf-header-center h2{font-size:14px;font-weight:400;letter-spacing:6px;color:#333;margin-bottom:3px}
            .pdf-header-center h1{font-size:28px;font-weight:800;color:#111;line-height:1.1;letter-spacing:1px;margin-bottom:2px;}
            .pdf-header-center .pdf-sub{font-size:11px;color:#999;letter-spacing:4px;text-transform:uppercase;margin-top:2px;display:inline-block;border-bottom:1px solid #d4af37;padding-bottom:3px;width:85%}
            .pdf-header-right{text-align:right;background:#fff!important;display:flex;flex-direction:column;align-items:flex-end;}
            .pdf-header-right span{font-size:7px;color:#999;text-transform:uppercase;margin-bottom:6px;letter-spacing:1px;display:block}
            .pdf-header-right img{height:45px;max-width:140px;object-fit:contain;background:#fff!important}
 
            /* Top Banner */
            .pdf-top-banner{display:flex;height:95px;margin-bottom:15px;background:linear-gradient(105deg, #d4af37 46%, #f8f8f8 46.2%);}
            .pdf-top-left{width:45%;padding:20px 25px;display:flex;flex-direction:column;justify-content:center}
            .pdf-top-left .pdf-lbl{font-size:10px;font-weight:700;color:#222;text-transform:uppercase;line-height:1.2;margin-bottom:4px}
            .pdf-top-left .pdf-val-wrap{display:flex;align-items:baseline;gap:5px;}
            .pdf-top-left .pdf-val-curr{font-size:16px;font-weight:800;color:#222;}
            .pdf-top-left .pdf-val-num{font-size:26px;font-weight:800;color:#222;letter-spacing:-0.5px;}
            .pdf-top-right{width:55%;display:flex;align-items:center;justify-content:space-around;padding:0 10px 0 25px}
            .pdf-tr-item{text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px; width:33%;}
            .pdf-tr-item svg{width:22px; height:22px; color:#d4af37;stroke-width:1.2;stroke:#d4af37;}
            .pdf-tr-item .pdf-lbl{font-size:7.5px;color:#999;text-transform:uppercase;font-weight:600;letter-spacing:1px;}
            .pdf-tr-item .pdf-val{font-size:11px;font-weight:800;color:#222}
            .pdf-tr-item-divider { width: 1px; height: 40px; background-color: #ddd; }
 
            /* Columns */
            .pdf-cols{display:flex;justify-content:space-between;margin-bottom:12px}
            .pdf-col{width:48%;background:#f8f8f8;padding:15px;min-height:220px}
            .pdf-col-title{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:800;color:#222;text-transform:uppercase;margin-bottom:15px}
            .pdf-col-title svg{width:18px;height:18px; color:#d4af37}
 
            .pdf-stat-box{background:#fff;padding:10px 15px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;box-shadow: 0 2px 5px rgba(0,0,0,0.02); height: 68px;}
            .pdf-sb-left{display:flex;align-items:center;gap:10px;width:60%;}
            .pdf-sb-icon{width:38px;height:38px;border-radius:50%;border:1px solid #eee;display:flex;align-items:center;justify-content:center;background:#fff;flex-shrink:0;}
            .pdf-sb-icon svg{width:20px;height:20px; color:#d4af37!important;stroke:#d4af37!important;stroke-width:1.2px!important;fill:none!important}
            .pdf-sb-info{display:flex;flex-direction:column;flex:1;}
            .pdf-sb-lbl{font-size:7px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:2px;letter-spacing:0.5px;line-height:1.2;}
            .pdf-sb-sub{font-size:5.5px;color:#aaa;text-transform:uppercase}
            
            .pdf-sb-val-wrap{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:1px;width:40%;flex-shrink:0;}
            .pdf-sb-curr{font-size:10.5px;font-weight:800;color:#111;}
            .pdf-sb-val{font-size:15px;font-weight:800;color:#111;text-align:right;letter-spacing:-0.5px;}
 
            .pdf-total-box{margin-top:12px;background:linear-gradient(108deg, #1f1f23 55%, #d4af37 55.1%);display:flex;align-items:center;justify-content:flex-start;padding:0;height:75px;}
            .pdf-total-lbl{color:#d4af37;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;width:55%;display:flex;align-items:center;padding-left:25px;}
            .pdf-total-val{color:#fff;font-size:18px;font-weight:800;width:45%;display:flex;justify-content:center;align-items:center;}
 
            /* Rec Banner & Obs */
            .pdf-rec-banner{background:#fdfcf8;border-top:1px solid #eee;border-bottom:1px solid #eee;border-right:1px solid #eee;border-left:14px solid #d4af37;display:flex;align-items:center;padding:12px 20px 12px 8px;}
            .pdf-rec-icon{margin-left:15px;margin-right:20px}
            .pdf-rec-icon svg{stroke:#d4af37;stroke-width:1.2;width:26px;height:26px;}
            .pdf-rec-content h3{font-size:10px;font-weight:800;color:#111;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;}
            .pdf-rec-content p{font-size:11px;color:#555;line-height:1.3;font-weight:500;}
            
            .pdf-obs-banner{background:#f8f8f8;border-top:1px solid #eee;border-bottom:1px solid #eee;border-right:1px solid #eee;border-left:14px solid #1f1f23;display:flex;flex-direction:column;justify-content:center;padding:12px 20px;margin-top:10px;}
            .pdf-obs-content{width:100%;}
            .pdf-obs-content h3{font-size:9px;font-weight:800;color:#111;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;}
            .pdf-obs-content div{font-size:9.5px;color:#555;line-height:1.3;font-weight:500;word-wrap:break-word;word-break:break-all;white-space:pre-wrap;line-break:anywhere;max-width:100%;}
 
            /* Rates Banner */
            .pdf-rates-banner{display:flex;justify-content:space-around;background:#fdfcf8;border:1px solid #eee;padding:10px;margin-bottom:10px;border-radius:4px}
            .pdf-rate-item{text-align:center;display:flex;flex-direction:column;gap:3px}
            .pdf-rate-lbl{font-size:7.5px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
            .pdf-rate-val{font-size:11px;font-weight:800;color:#222}

            /* Footer */
            .pdf-footer{position:absolute;bottom:15mm;left:20mm;right:20mm;padding-top:15px;border-top:1px solid #d4af37;font-size:8px;color:#999;display:flex;justify-content:space-between;text-transform:uppercase;letter-spacing:1px}
            
            /* SVGs Fixes */
            svg { display: block; }

            /* Value layout specific formatting */
            .pdf-flux-val{display:flex; align-items:baseline; gap:6px;}
            .pdf-flux-currency{font-size:14px;font-weight:800;color:#222;}
            .pdf-flux-number{font-size:16px;font-weight:800;color:#222;}
        </style>

        <div id="pdf-content">
            <div class="pdf-header">
                <div class="pdf-header-left">
                    <div style="display:flex; flex-direction:column; align-items:center; line-height:1; gap:3px;">
                        <span style="font-family:'Cormorant Garamond',serif; font-size:32px; font-weight:700; letter-spacing:8px; color:#111; text-transform:uppercase;">AURENN</span>
                        <span style="font-family:'Inter',sans-serif; font-size:9px; font-weight:500; letter-spacing:4px; color:#c9a84c; text-transform:uppercase;">CAPITAL</span>
                    </div>
                </div>
                <div class="pdf-header-center">
                    <h2>SIMULAÇÃO</h2>
                    <h1>ESTRATÉGICA</h1>
                    <span class="pdf-sub">DE CONSÓRCIO</span>
                </div>
                <div class="pdf-header-right">
                    <span>ADMINISTRADORA</span>
                    ${adminLogoSrc ? `<img src="${adminLogoSrc}">` : `<span style="font-weight:800;color:#111;font-size:16px">${adminName}</span>`}
                </div>
            </div>

            <div class="pdf-top-banner">
                <div class="pdf-top-left">
                    <span class="pdf-lbl">CRÉDITO DISPONÍVEL<br>PARA AQUISIÇÃO</span>
                    <div class="pdf-val-wrap">
                        <span class="pdf-val-curr">R$</span>
                        <span class="pdf-val-num">${resultCL}</span>
                    </div>
                </div>
                <div class="pdf-top-right">
                    <div class="pdf-tr-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line><line x1="9" y1="9" x2="11" y2="9"></line></svg>
                        <span class="pdf-lbl">PLANO</span>
                        <span class="pdf-val" style="font-size:12px;">R$ ${credito}</span>
                    </div>
                    <div class="pdf-tr-item-divider"></div>
                    <div class="pdf-tr-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><rect x="10" y="14" width="4" height="4"></rect></svg>
                        <span class="pdf-lbl">PRAZO</span>
                        <span class="pdf-val" style="font-size:17px;line-height:1">${prazo}<br><span style="font-size:8px;font-weight:500;color:#999;letter-spacing:1px;position:relative;top:-3px">MESES</span></span>
                    </div>
                    <div class="pdf-tr-item-divider"></div>
                    <div class="pdf-tr-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><line x1="17.65" y1="6.35" x2="22" y2="2"></line><polyline points="17 2 22 2 22 7"></polyline></svg>
                        <span class="pdf-lbl">ESTRATÉGIA</span>
                        <span class="pdf-val" style="font-size:15px;line-height:1">${lanceTotal}%<br><span style="font-size:8px;font-weight:500;color:#999;letter-spacing:1px;position:relative;top:-3px">DE LANCE</span></span>
                    </div>
                </div>
            </div>

            ${isReduzida ? `
            <div style="border:1.5px solid #d4af37; border-radius:4px; margin-top:14px; padding:10px; display:flex; justify-content:center; align-items:center; gap:10px;">
                <span style="color:#d4af37; font-weight:600; font-size:22px; line-height:1; font-family:Courier, monospace;">%</span>
                <span style="font-size:12px; font-weight:800; color:#333; letter-spacing:0.8px;">PLANO COM <span style="color:#c53030;">PARCELA REDUZIDA EM ${valRed}% ATÉ A CONTEMPLAÇÃO</span></span>
            </div>
            ` : ''}

            <div class="pdf-cols" style="margin-top: ${isReduzida ? '14px' : '16px'};">
                <!-- ESTRATÉGIA DE LANCE -->
                <div class="pdf-col">
                    <div class="pdf-col-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><circle cx="10" cy="13" r="3"></circle><polyline points="14 2 14 8 20 8"></polyline><path d="M13 13h3"></path></svg>
                        ESTRATÉGIA DE LANCE
                    </div>

                    <div class="pdf-stat-box">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl">LANCE<br>EMBUTIDO</span>
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-curr">R$</span>
                            <span class="pdf-sb-val">${valorEmb}</span>
                        </div>
                    </div>

                    <div class="pdf-stat-box">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl">RECURSO<br>PRÓPRIO</span>
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-curr">R$</span>
                            <span class="pdf-sb-val">${valorPag}</span>
                        </div>
                    </div>

                    <div class="pdf-total-box">
                        <span class="pdf-total-lbl">LANCE TOTAL</span>
                        <span class="pdf-total-val">${lanceTotal}%</span>
                    </div>
                </div>

                <!-- FLUXO FINANCEIRO -->
                <div class="pdf-col">
                    <div class="pdf-col-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line><polyline points="2 18 6 14 12 20 22 6"></polyline></svg>
                        FLUXO FINANCEIRO
                    </div>
                    
                    <div class="pdf-stat-box">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline><line x1="12" y1="5" x2="12" y2="11"></line><polyline points="10 7 12 5 14 7"></polyline></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl" style="margin-bottom:0">${primeirasTituloPdf}</span>
                                <span class="pdf-sb-sub">(ENTRADA)</span>
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-curr">R$</span>
                            <span class="pdf-sb-val" style="font-size:14.5px;">${resultPrim}</span>
                        </div>
                    </div>

                    <div class="pdf-stat-box">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><line x1="4" y1="12" x2="14" y2="12"></line></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl">PARCELAS<br>ANTES DA<br>CONTEMPLAÇÃO</span>
                                ${isReduzida ? `<span class="pdf-sb-sub" style="color:#e53e3e; font-weight:bold; font-size:6px;">(-${valRed}%)</span>` : ''}
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-curr">R$</span>
                            <span class="pdf-sb-val" style="font-size:14.5px;">${resultDemais}</span>
                        </div>
                    </div>

                    <div class="pdf-stat-box">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl">PARCELAS<br>APÓS<br>CONTEMPLAÇÃO</span>
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-curr">R$</span>
                            <span class="pdf-sb-val" style="font-size:14.5px;">${resultPos}</span>
                        </div>
                    </div>

                    <div class="pdf-stat-box" style="margin-bottom:0">
                        <div class="pdf-sb-left">
                            <div class="pdf-sb-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </div>
                            <div class="pdf-sb-info">
                                <span class="pdf-sb-lbl" style="margin-bottom:0">PRAZO<br>RESTANTE</span>
                            </div>
                        </div>
                        <div class="pdf-sb-val-wrap">
                            <span class="pdf-sb-val" style="font-size:18.5px;">${resultPrazo}</span>
                            <span class="pdf-sb-curr" style="font-size:10px">MESES</span>
                        </div>
                    </div>
                </div>
            </div>

            ${taxasHtml}

            <div class="pdf-rec-banner">
                <div class="pdf-rec-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                </div>
                <div class="pdf-rec-content">
                    <h3>ESTRATÉGIA RECOMENDADA PELA AURENN CAPITAL</h3>
                    <p>Com esta estrutura de lance, você acessa um crédito líquido de R$ ${resultCL} mantendo parcelas estruturadas antes e após a contemplação, sem juros bancários.</p>
                </div>
            </div>
            
            ${hasObs ? `
            <div class="pdf-obs-banner">
                <div class="pdf-obs-content">
                    <h3>OBSERVAÇÕES ADICIONAIS</h3>
                    <div>${observacoes}</div>
                </div>
            </div>
            ` : ''}

            <div class="pdf-footer">
                <span>Data da simulação: ${dateStr.split(' ')[0]}</span>
                <span>SEGURANÇA . PLANEJAMENTO . INTELIGÊNCIA . PATRIMONIAL</span>
                <span>AURENN CAPITAL CONSULTORIA</span>
            </div>
        </div>
    `;


        // Configuration for html2pdf
        const opt = {
            margin: 0,
            filename: 'Simulacao-CR-Invest.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Use html2pdf
        if (typeof html2pdf !== 'undefined') {
            html2pdf().set(opt).from(element).save()
                .then(() => {
                    console.log('PDF gerado com sucesso!');
                })
                .catch(err => {
                    console.error('Erro na geração do PDF (Promise):', err);
                    alert('Erro ao gerar PDF: ' + (err.message || err));
                });
        } else {
            alert('Erro: Biblioteca de PDF não carregada. Tente novamente em alguns segundos.');
        }
    } catch (e) {
        console.error('Erro ao gerar PDF (Sync):', e);
        alert('Erro ao gerar PDF (Sync): ' + e.message);
    }
}

// ========================================
// INIT
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    restaurarEstado();
    atualizarVisualModoLance();
    trocarAdministradora();
    calcular(); // Já engatilha o calcComparativo interno
});

// ========================================
// TABS & COMPARATIVO
// ========================================
function syncInputs(sourceId, targetId) {
    const sourceVal = document.getElementById(sourceId).value;
    document.getElementById(targetId).value = sourceVal;

    if (targetId === 'administradora') {
        trocarAdministradora();
    }
    calcular(); // Roda a simulação principal e invoca calcComparativo no final
}

function syncRadios(sourceName, targetName) {
    const selected = document.querySelector(`input[name="${sourceName}"]:checked`);
    if (selected) {
        const targetRadio = document.querySelector(`input[name="${targetName}"][value="${selected.value}"]`);
        if (targetRadio) targetRadio.checked = true;
    }
    calcular();
}

// ========================================
// NAVIGATION (HOME → TOOL)
// ========================================

function navigateTo(tabId) {
    // Hide home screen
    document.getElementById('homeScreen').style.display = 'none';
    // Show back button in header
    document.getElementById('btnVoltarHome').style.display = '';
    // Activate the correct tab
    switchTabDirect(tabId);
}

function voltarHome() {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    // Hide back button
    document.getElementById('btnVoltarHome').style.display = 'none';
    // Hide toolbar
    const toolBar = document.getElementById('toolbarSecundaria');
    if (toolBar) toolBar.style.display = 'none';
    // Show home
    document.getElementById('homeScreen').style.display = '';
}

function switchTabDirect(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tabId === 'simulador') {
        document.getElementById('tabSimulador').classList.add('active');
        const toolBar = document.getElementById('toolbarSecundaria');
        if (toolBar) toolBar.style.display = '';
    } else {
        document.getElementById('tabComparativo').classList.add('active');
        const toolBar = document.getElementById('toolbarSecundaria');
        if (toolBar) toolBar.style.display = 'none';
        // Always start on Fase 1 (inputs), step 1 of wizard
        document.getElementById('compFaseInputs').style.display = '';
        document.getElementById('compFaseResultados').style.display = 'none';
        wizardNext(1);

        // Desfazer qualquer seleção anterior ao trocar de aba:
        document.querySelectorAll('.cx-card-option').forEach(c => c.classList.remove('selected'));
        document.getElementById('cxInlineInputs').style.display = 'none';
    }
}

function switchTab(tabId) {
    switchTabDirect(tabId);
}

// ========================================
// WIZARD NAVIGATION (Caixa-style)
// ========================================

function wizardNext(step) {
    // Skip wizStep2 — now only 2 steps: step1 (objetivos) and step3 (resultado)
    const panels = ['wizStep1', 'wizStep3'];
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    // Map: step 2 -> jump to 3 automatically
    const target = document.getElementById('wizStep' + (step === 2 ? 3 : step));
    if (target) target.style.display = '';

    // Update progress indicators
    const progressStep = (step === 2 ? 3 : step) + 1;

    for (let i = 1; i <= 4; i++) {
        const ind = document.getElementById('wizStep' + i + 'Indicator');
        if (!ind) continue;
        ind.classList.remove('active', 'done');
        if (i < progressStep) ind.classList.add('done');
        if (i === progressStep) ind.classList.add('active');
    }

    const s1 = document.getElementById('wizStep1Indicator');
    if (s1) s1.classList.add('done');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function wizSelectMode(mode) {
    window._wizMode = mode;

    // Highlight selected card
    document.querySelectorAll('.cx-card-option').forEach(c => c.classList.remove('selected'));
    const cardMap = { prestacao: 'cardPrestacao', renda: 'cardRenda', imovel: 'cardImovel' };
    const card = document.getElementById(cardMap[mode]);
    if (card) card.classList.add('selected');

    // Show inline inputs
    document.getElementById('cxInlineInputs').style.display = 'flex';

    // Toggle fields per mode
    document.getElementById('fieldPrestacao').style.display = mode === 'prestacao' ? '' : 'none';
    document.getElementById('fieldRenda').style.display = (mode === 'renda' || mode === 'imovel') ? '' : 'none';
    document.getElementById('fieldValorImovel').style.display = mode === 'imovel' ? '' : 'none';
}

// ========================================
// SIMULAÇÃO CAIXA — Auto-direcionamento
// ========================================

function parseCurrency(str) {
    if (typeof str === 'number') return str;
    return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getTaxaCaixa(rendaBruta, servidorPublico) {
    // MCMV faixas (taxas efetivas anuais atualizadas - referência Caixa 2025/2026)
    if (rendaBruta <= 2850) return { taxa: 0.0485, tag: 'MCMV Faixa 1 — 4,85% a.a.', mcmv: true };
    if (rendaBruta <= 4700) return { taxa: 0.0550, tag: 'MCMV Faixa 2 — 5,50% a.a.', mcmv: true };
    if (rendaBruta <= 8600) return { taxa: 0.0766, tag: 'MCMV Faixa 3 — 7,66% a.a.', mcmv: true };
    if (rendaBruta <= 12000) return { taxa: 0.0816, tag: 'MCMV Faixa 4 — 8,16% a.a.', mcmv: false };
    // SBPE
    if (servidorPublico) return { taxa: 0.1049, tag: 'SBPE Servidor — TR + 10,49% a.a.', mcmv: false };
    return { taxa: 0.1099, tag: 'SBPE — TR + 10,99% a.a.', mcmv: false };
}

function calcIdadeMeses(dataNascStr) {
    const nasc = new Date(dataNascStr);
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) anos--;
    return anos;
}

function executarSimulacaoCaixa() {
    // Coleta dados
    const mode = window._wizMode || 'imovel';
    const nascimento = document.getElementById('compNascimento').value;
    const servidorPublico = false;  // padrão: não servidor
    const fgts = true;  // padrão: possui FGTS
    const tipoBem = 'imovel';  // padrão: imóvel residencial

    // Se não preencheu nascimento, assume 35 anos para não quebrar o cálculo
    const idade = nascimento ? calcIdadeMeses(nascimento) : 35;
    const prazoMaxIdade = Math.max(60, (80 - Math.max(0, idade)) * 12);
    const prazoFin = Math.min(420, prazoMaxIdade);

    let valorImovel = 0;
    let rendaBruta = 0;
    let prestacaoDesejada = 0;

    if (mode === 'imovel') {
        valorImovel = parseCurrency(document.getElementById('compValorCredito').value);
        rendaBruta = parseCurrency(document.getElementById('compRendaBruta').value);
    } else if (mode === 'renda') {
        rendaBruta = parseCurrency(document.getElementById('compRendaBruta').value);
    } else if (mode === 'prestacao') {
        prestacaoDesejada = parseCurrency(document.getElementById('compPrestacaoDesejada').value);
        rendaBruta = prestacaoDesejada / 0.30; // Estima renda pra aprovar essa prestacao
    }

    // Auto-determina taxa
    const { taxa, tag, mcmv } = getTaxaCaixa(rendaBruta, servidorPublico);
    const maxComprometimentoRenda = 0.30; // Caixa permite no maximo 30% da renda bruta na prestação

    // Para MCMV, Caixa utiliza preferencialmente PRICE; para SBPE, SAC
    let sistema = mcmv ? 'PRICE' : 'SAC';

    // Taxa mensal (juro composto)
    const taxaMensal = Math.pow(1 + taxa, 1 / 12) - 1;

    // Taxa de administração da CAIXA / Seguros mensais básicos (estimados)
    const taxasExtrasFixas = 0; // Seguros já embutidos na taxa efetiva do MCMV

    // Fatores de cálculo pra determinar a primeira prestação base
    const fatorSAC = (1 / prazoFin) + taxaMensal;
    const fatorPRICE = (taxaMensal * Math.pow(1 + taxaMensal, prazoFin)) / (Math.pow(1 + taxaMensal, prazoFin) - 1);

    // Calcula teto de Parcela da Renda
    let parcelaTeto = (rendaBruta * maxComprometimentoRenda) - taxasExtrasFixas;
    if (parcelaTeto < 0) parcelaTeto = 0;

    // Valor máximo de crédito que aprovaria pra essa renda e prazo
    let maxAprovadoSAC = parcelaTeto > 0 ? parcelaTeto / fatorSAC : 0;
    let maxAprovadoPRICE = parcelaTeto > 0 ? parcelaTeto / fatorPRICE : 0;

    const maxCotaAtendida = 0.8;
    let valorFinanciadoDesejado = 0;

    if (mode === 'imovel') {
        valorFinanciadoDesejado = valorImovel * maxCotaAtendida;
    } else if (mode === 'renda') {
        // Pela renda: MCMV usa PRICE, SBPE usa SAC
        if (mcmv) {
            valorFinanciadoDesejado = maxAprovadoPRICE;
        } else {
            valorFinanciadoDesejado = maxAprovadoSAC;
        }
        valorImovel = valorFinanciadoDesejado / maxCotaAtendida;
    } else if (mode === 'prestacao') {
        // Pela prestação desejada
        let parcelaRealDesejada = prestacaoDesejada - taxasExtrasFixas;
        if (parcelaRealDesejada < 0) parcelaRealDesejada = 0;
        if (mcmv) {
            valorFinanciadoDesejado = parcelaRealDesejada / fatorPRICE;
        } else {
            valorFinanciadoDesejado = parcelaRealDesejada / fatorSAC;
        }
        valorImovel = valorFinanciadoDesejado / maxCotaAtendida;
    }

    let valorFinanciado = valorFinanciadoDesejado;
    let novoValorImovel = valorImovel;

    if (valorFinanciadoDesejado <= maxAprovadoSAC) {
        sistema = 'SAC';
        valorFinanciado = valorFinanciadoDesejado;
    } else if (valorFinanciadoDesejado <= maxAprovadoPRICE) {
        sistema = 'PRICE';
        valorFinanciado = valorFinanciadoDesejado;
    } else {
        // Nada passa na renda real. Corta na carne o valor financiado usando a Tabela PRICE
        if (maxAprovadoPRICE > 0) {
            sistema = 'PRICE';
            valorFinanciado = maxAprovadoPRICE;
            novoValorImovel = valorFinanciado / maxCotaAtendida;
        } else {
            valorFinanciado = 0;
            novoValorImovel = 0;
        }
    }

    // Calcula os valores reais das parcelas
    let entrada = novoValorImovel - valorFinanciado;
    let entradaPct = entrada / novoValorImovel;

    let totalPago = entrada;
    let totalJuros = 0;
    let saldo = valorFinanciado;

    let parcela1 = 0;
    let parcelaFinal = 0;

    if (sistema === 'SAC') {
        const amortizacao = valorFinanciado / prazoFin;
        parcela1 = amortizacao + (valorFinanciado * taxaMensal) + taxasExtrasFixas;
        parcelaFinal = amortizacao + (amortizacao * taxaMensal) + taxasExtrasFixas;

        for (let m = 0; m < prazoFin; m++) {
            const juros = saldo * taxaMensal;
            totalJuros += juros;
            totalPago += amortizacao + juros + taxasExtrasFixas;
            saldo -= amortizacao;
        }
    } else {
        // PRICE
        parcela1 = (valorFinanciado * fatorPRICE) + taxasExtrasFixas;
        parcelaFinal = parcela1; // Em PRICE a parcela é idêntica (fixa) do começo ao fim.
        const pmntFixo = valorFinanciado * fatorPRICE;

        for (let m = 0; m < prazoFin; m++) {
            const juros = saldo * taxaMensal;
            let amort = pmntFixo - juros;
            totalJuros += juros;
            totalPago += pmntFixo + taxasExtrasFixas;
            saldo -= amort;
        }
    }

    // Preenche card DOM
    document.getElementById('cxResultTag').textContent = tag;
    document.getElementById('cxValorFinanciado').textContent = fmtBRL(valorFinanciado);
    document.getElementById('cxEntrada').textContent = fmtBRL(entrada) + ' (' + Math.round(entradaPct * 100) + '%)';
    document.getElementById('cxPrazo').textContent = prazoFin + ' meses (' + Math.round(prazoFin / 12) + ' anos)';
    document.getElementById('cxSistema').textContent = sistema;
    document.getElementById('cxParcela1').textContent = fmtBRL(parcela1);
    document.getElementById('cxParcelaFinal').textContent = fmtBRL(parcelaFinal);
    document.getElementById('cxTotalJuros').textContent = fmtBRL(totalJuros);
    document.getElementById('cxTotalPago').textContent = fmtBRL(totalPago);

    // Renda estimada (só para modo prestação)
    const rendaRow = document.getElementById('cxRendaEstimadaRow');
    if (mode === 'prestacao') {
        const rendaEstimada = parcela1 / 0.30;
        document.getElementById('cxRendaEstimada').textContent = fmtBRL(rendaEstimada);
        rendaRow.style.display = '';
    } else {
        rendaRow.style.display = 'none';
    }

    window._caixaFinData = {
        valorImovel: novoValorImovel,
        valorFinanciado,
        entrada,
        entradaPct,
        taxa, taxaMensal, prazoFin, sistema,
        parcela1, parcelaFinal, totalJuros, totalPago, tag
    };

    // Vai pro step 3
    wizardNext(3);
}

// ========================================
// COMPARATIVO: Fase 2 (resultados)
// ========================================

function executarSimulacaoComp() {
    calcComparativo();
    document.getElementById('compFaseInputs').style.display = 'none';
    document.getElementById('compFaseResultados').style.display = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function voltarFaseInputs() {
    document.getElementById('compFaseResultados').style.display = 'none';
    document.getElementById('compFaseInputs').style.display = '';
    // Volta pro step 3 do wizard
    wizardNext(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function calcComparativo() {
    try {
        // ==================
        // FINANCIAMENTO (dados do wizard Caixa)
        // ==================
        const fin = window._caixaFinData || {};
        const valorCredito = fin.valorFinanciado || 0; // Crédito do consórcio é o financiamento

        const entradaFin = fin.entrada || 0;
        const valorFinanciado = fin.valorFinanciado || 0;
        const parcelaInicialFin = fin.parcela1 || 0;
        const parcelaFinalFin = fin.parcelaFinal || 0;
        const totalJurosFin = fin.totalJuros || 0;
        const custoFinalFin = fin.totalPago || 0;
        const prazoFin = fin.prazoFin || 360;
        const sistemaFin = fin.sistema || 'SAC';
        const labelParcelaFinal = `Parcela final (${sistemaFin})`;

        // ==================
        // CONSÓRCIO (cálculo independente para a tela Comparativo)
        // ==================
        const prazoCon = parseInt(document.getElementById('compPrazoGrupo').value) || 200;
        const adesaoPct = parseFloat(document.getElementById('compAdesao').value) || 0;

        let taxaAdm = parseFloat(document.getElementById('compTaxaAdm').value) || 0;
        let fundoReserva = parseFloat(document.getElementById('compFundoReserva').value) || 0;
        let seguro = parseFloat(document.getElementById('compSeguroPrestamista').value) || 0;
        const lanceEmbutidoPct = parseFloat(document.getElementById('compLanceEmbutido').value) / 100 || 0;

        const admVal = document.getElementById('compAdministradora').value;
        const reducao = document.querySelector('input[name="compReducao"]:checked')?.value || 'parcela';

        let parcelaInteiraSeguro = 0;
        let seguroValid = 0;
        if (admVal === 'porto_seguro') {
            seguroValid = 0.038;
        } else if (admVal === 'embracon') {
            seguroValid = 0.055;
        } else if (admVal === 'rodobens') {
            seguroValid = 0.055;
        }

        // Calcula Carta base necessária 
        // Cap Lance Embutido at 30%
        const embutidoEfetivoPct = Math.min(lanceEmbutidoPct, 0.30);
        const cartaBase = valorCredito / (1 - embutidoEfetivoPct);
        const valorEmbutido = cartaBase * embutidoEfetivoPct;
        const adesaoCon = cartaBase * (adesaoPct / 100);
        const valorPagarCon = parseCurrency(document.getElementById('compLancePagar').value) || 0;

        // Calcula parcela original
        const taxaTotalCon = taxaAdm + fundoReserva;
        let parcelaCon = 0;

        if (admVal === 'porto_seguro' || admVal === 'rodobens' || admVal === 'embracon') {
            const fatorTaxaAdm = taxaAdm / prazoCon;
            const fatorFundoReserva = fundoReserva / prazoCon;
            const fatorAmortizacao = 100 / prazoCon;
            const pmc = fatorAmortizacao + fatorTaxaAdm + fatorFundoReserva + seguroValid;
            parcelaCon = cartaBase * (pmc / 100);
        } else if (admVal === 'canopus' || admVal === 'magalu') {
            const fatorTaxaAdm = taxaAdm / prazoCon;
            const fatorFundoReserva = fundoReserva / prazoCon;
            const fatorAmortizacao = 100 / prazoCon;
            const pmc = fatorAmortizacao + fatorTaxaAdm + fatorFundoReserva;
            parcelaCon = cartaBase * (pmc / 100);
        }

        // Simula a Redução
        const saldoDevedorPreLance = (parcelaCon * prazoCon) - parcelaCon; // Aprox apos pagar a 1a
        const valorAbatidoMeses = saldoDevedorPreLance - (valorPagarCon + valorEmbutido);
        let novaParcelaCon = parcelaCon;
        let novoPrazoCon = prazoCon;

        if (reducao === 'parcela') {
            if (valorAbatidoMeses > 0) {
                novaParcelaCon = valorAbatidoMeses / (prazoCon - 1);
            }
        } else {
            if (valorAbatidoMeses > 0 && novaParcelaCon > 0) {
                novoPrazoCon = Math.ceil(valorAbatidoMeses / novaParcelaCon);
            }
        }

        const custoFinalCon = (novaParcelaCon * novoPrazoCon) + parcelaCon + valorPagarCon + adesaoCon;

        // ==================
        // ALUGUEL
        // ==================
        const mesesAluguel = parseInt(document.getElementById('compMesesAluguel').value) || 0;
        const valorAluguel = parseCurrency(document.getElementById('compValorAluguel').value) || 0;
        const custoFinalAluguel = mesesAluguel * valorAluguel;
        const custoFinalConComAluguel = custoFinalCon + custoFinalAluguel;

        // ==================
        // ECONOMIA
        // ==================
        const ecoPuro = custoFinalFin - custoFinalCon;
        const ecoPuroMeses = novaParcelaCon > 0 ? Math.floor(ecoPuro / novaParcelaCon) : 0;

        const ecoAlu = custoFinalFin - custoFinalConComAluguel;
        const ecoAluMeses = novaParcelaCon > 0 ? Math.floor(ecoAlu / novaParcelaCon) : 0;

        // Card Financiamento
        document.getElementById('compCreditoFin').textContent = formatCurrency(valorFinanciado);
        document.getElementById('compPrazoDisplayFin').textContent = prazoFin + " meses"; // FIX: add ' meses' back if needed based on UI, checking UI context.. Let's leave just value if layout says '0 meses' statically or just output number. The layout has 0 meses -> I will put just num if UI has 'meses'. Wait, UI has <span id="...">0</span> meses. So just format num.
        document.getElementById('compPrazoDisplayFin').textContent = prazoFin;
        document.getElementById('compParcelaFin').textContent = formatCurrency(parcelaInicialFin);

        const elFinalFin = document.getElementById('compParcelaFinalFin');
        if (elFinalFin) {
            elFinalFin.textContent = formatCurrency(parcelaFinalFin);
            const labelEl = elFinalFin.closest('.c-row');
            if (labelEl) {
                const lbl = labelEl.querySelector('.c-label');
                if (lbl) lbl.textContent = labelParcelaFinal;
            }
        }

        const elJurosFin = document.getElementById('compJurosFin');
        if (elJurosFin) elJurosFin.textContent = formatCurrency(totalJurosFin);

        document.getElementById('compCustoFinalFin').textContent = formatCurrency(custoFinalFin);

        // Card Consórcio
        document.getElementById('compCreditoCon').textContent = formatCurrency(valorCredito);
        document.getElementById('compCustoEntradaCon').textContent = formatCurrency(valorPagarCon);
        document.getElementById('compPrazoDisplayCon').textContent = Math.round(novoPrazoCon);
        document.getElementById('compParcelaCon').textContent = formatCurrency(novaParcelaCon);

        const rowAdesaoCon = document.getElementById('rowAdesaoCon');
        const compAdesaoConDisplay = document.getElementById('compAdesaoConDisplay');
        if (adesaoCon > 0) {
            compAdesaoConDisplay.textContent = formatCurrency(adesaoCon);
            if (rowAdesaoCon) rowAdesaoCon.style.display = 'flex';
        } else {
            if (rowAdesaoCon) rowAdesaoCon.style.display = 'none';
        }

        // Custo total Consórcio simplificado para display (Lance + Parcelas)
        let jurosFake = custoFinalCon - valorCredito;
        if (jurosFake < 0) jurosFake = 0;
        const compJurosConEl = document.getElementById('compJurosCon');
        if (compJurosConEl) compJurosConEl.textContent = formatCurrency(jurosFake);

        const compCustoFinalConEl = document.getElementById('compCustoFinalCon');
        if (compCustoFinalConEl) compCustoFinalConEl.textContent = formatCurrency(custoFinalCon);

        // Aluguel display
        const rowAluguel = document.getElementById('rowAluguelCon');
        const txtAluguel = document.getElementById('compCustoAluguelCon');

        if (mesesAluguel > 0 && valorAluguel > 0) {
            if (rowAluguel) rowAluguel.style.display = 'flex';
            if (txtAluguel) txtAluguel.textContent = formatCurrency(custoFinalAluguel);
            if (compCustoFinalConEl) compCustoFinalConEl.textContent = formatCurrency(custoFinalConComAluguel);
        } else {
            if (rowAluguel) rowAluguel.style.display = 'none';
        }

        // Resumo Economia
        const resEcoVal = document.getElementById('compEcoPuroVal');
        const diffMeses = prazoFin > prazoCon ? (prazoFin - Math.round(novoPrazoCon)) : 0;
        const isAluguelAtivo = mesesAluguel > 0 && valorAluguel > 0;
        const finalEcoR = isAluguelAtivo ? ecoAlu : ecoPuro;
        const finalCustoCon = isAluguelAtivo ? custoFinalConComAluguel : custoFinalCon;

        if (resEcoVal) {
            resEcoVal.textContent = formatCurrency(finalEcoR);
        }

        const compDiffMeses = document.getElementById('compDiffMeses');
        if (compDiffMeses) compDiffMeses.textContent = diffMeses + " meses mais rápido";

        // Progress Bars limitadas e atualizadas
        let percentFin = 100;
        let percentCon = 100;
        if (custoFinalFin > 0 || finalCustoCon > 0) {
            if (custoFinalFin >= finalCustoCon) {
                percentFin = 100;
                percentCon = Math.max(0, (finalCustoCon / custoFinalFin) * 100);
            } else {
                percentCon = 100;
                percentFin = Math.max(0, (custoFinalFin / finalCustoCon) * 100);
            }
        }

        const barFin = document.getElementById('barFin');
        if (barFin) barFin.style.width = percentFin + '%';
        const txtBarFin = document.getElementById('barValFin');
        if (txtBarFin) txtBarFin.textContent = formatCurrency(custoFinalFin);

        const barCon = document.getElementById('barCon');
        if (barCon) barCon.style.width = percentCon + '%';
        const txtBarCon = document.getElementById('barValCon');
        if (txtBarCon) txtBarCon.textContent = formatCurrency(finalCustoCon);

    } catch (e) {
        console.error('Erro ao calcular comparativo:', e);
    }
}

// ========================================
// PDF DISPATCHER
// ========================================
window.gerarPDF = function() {
    const simuladorTab = document.getElementById('tabSimulador');
    const isSimuladorActive = simuladorTab && simuladorTab.classList.contains('active');
    
    if (isSimuladorActive) {
        if (typeof gerarPDFSimuladorFrontend === 'function') {
            gerarPDFSimuladorFrontend();
        } else {
            console.error('gerarPDFSimuladorFrontend não está definido na seção frontend de script.js');
        }
    } else {
        if (typeof gerarPDFComparativo === 'function') {
            gerarPDFComparativo();
        } else {
            console.error('gerarPDFComparativo não está definido. Verifique pdf_comp.js');
        }
    }
};
