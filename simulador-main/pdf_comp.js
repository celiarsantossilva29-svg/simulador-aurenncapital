/**
 * pdf_comp.js — Envia dados do comparativo para o backend Python gerar o PDF.
 */
function gerarPDFComparativo() {
    try {
        // ── Coleta dados do DOM ──
        var fin = window._caixaFinData || {};

        var el = function (id) { return document.getElementById(id); };
        var txt = function (id) { var e = el(id); return e ? e.textContent.trim() : ''; };
        var val = function (id) { var e = el(id); return e ? e.value : ''; };

        // Admin
        var adminEl = el('compAdministradora');
        var adminName = adminEl ? adminEl.options[adminEl.selectedIndex].text : 'Porto Seguro';

        // Valor do imóvel
        var valorImovel = fin.valorImovel || fin.novoValorImovel || 0;
        var valorImovelFmt = (typeof fmtBRL === 'function') ? fmtBRL(valorImovel) : 'R$ ' + valorImovel.toLocaleString('pt-BR');

        // Financiamento
        var finValorFinanciado = txt('cxValorFinanciado') || 'R$ 0,00';
        var finPrazo = txt('cxPrazo') || '420 meses';
        var finParcela1 = txt('cxParcela1') || 'R$ 0,00';
        var finParcelaF = txt('cxParcelaFinal') || 'R$ 0,00';
        var finSistema = txt('cxSistema') || 'SAC';
        var finTotalJuros = txt('cxTotalJuros') || 'R$ 0,00';
        var finTotalPago = txt('cxTotalPago') || 'R$ 0,00';

        // Consórcio
        var conPrazo = (val('compPrazoGrupo') || '200') + ' meses';
        var conParcela = txt('compParcelaCon') || 'R$ 0,00';
        var conLanceRaw = val('compLancePagar');
        var conLance = (conLanceRaw && parseCurrency(conLanceRaw) > 0) ? ('R$ ' + conLanceRaw) : 'R$ 0,00';

        var adesaoEl = el('compAdesaoConDisplay');
        var adesaoVal = (adesaoEl && adesaoEl.parentElement.style.display !== 'none') ? adesaoEl.textContent.trim() : '';


        // Barras
        var barFinVal = txt('barValFin') || 'R$ 0';
        var barConVal = txt('barValCon') || 'R$ 0';
        // Percentuais das barras
        var barFinEl = el('barFin');
        var barConEl = el('barCon');
        var barFinPct = 1.0;
        var barConPct = 0.5;
        if (barFinEl && barConEl) {
            var wFin = parseFloat(barFinEl.style.width) || 100;
            var wCon = parseFloat(barConEl.style.width) || 50;
            barFinPct = wFin / 100;
            barConPct = wCon / 100;
        }

        // Economia
        var economiaVal = txt('compEcoPuroVal') || 'R$ 0,00';
        var economiaMeses = txt('compDiffMeses') || '0 meses';

        // Aluguel
        var aluguelEl = el('compCustoAluguelCon');
        var aluguel = aluguelEl ? aluguelEl.textContent.trim() : '';

        // Data
        var now = new Date();
        var dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // ── Payload ──
        var payload = {
            adminName: adminName,
            valorImovel: valorImovelFmt,
            finValorFinanciado: finValorFinanciado,
            finPrazo: finPrazo,
            finParcela1: finParcela1,
            finParcelaF: finParcelaF,
            finSistema: finSistema,
            finTotalJuros: finTotalJuros,
            finTotalPago: finTotalPago,
            conPrazo: conPrazo,
            conParcela: conParcela,
            conLance: conLance,
            barFinVal: barFinVal,
            barConVal: barConVal,
            barFinPct: barFinPct,
            barConPct: barConPct,
            economiaVal: economiaVal,
            economiaMeses: economiaMeses,
            aluguel: aluguel,
            adesao: adesaoVal,
            dateStr: dateStr
        };

        // ── GERAÇÃO LOCAL VIA HTML2PDF ──
        if (typeof html2pdf === 'undefined') {
            alert('Carregando biblioteca PDF... Aguarde um instante e tente novamente.');
            return;
        }

        const adminKey = val('compAdministradora') || 'porto_seguro';
        const d = (typeof adminData !== 'undefined') ? adminData[adminKey] : null;
        const headerLogoSrc = (typeof logoBase64 !== 'undefined' && logoBase64['logo-nova.png']) ? logoBase64['logo-nova.png'] : 'logo-nova.png';
        const adminLogoSrc = (d && d.logo && typeof logoBase64 !== 'undefined' && logoBase64[d.logo]) ? logoBase64[d.logo] : (d ? d.logo : '');

        // Helper to inline raw SVGs with strict sizes so html2canvas renders them
        const svgIcon = {
            wallet: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
            calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
            target: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
            dollar: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>',
            chart: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>',
            hammer: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><path d="m14 13-9 9a2 2 0 0 1-2.83-2.83l9-9"/><path d="M14.6 10.4 15 10l.4.4.4-.4-1.4-1.4-.4.4-4-4-.4.4-1.4-1.4.4-.4-1.4-1.4a2 2 0 0 1 2.83-2.83l9 9a2 2 0 0 1-2.83 2.83z"/></svg>',
            percent: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
            check: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            ruler: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><rect x="3" y="10" width="18" height="4" rx="1"/><line x1="7" y1="10" x2="7" y2="12"/><line x1="11" y1="10" x2="11" y2="12"/><line x1="15" y1="10" x2="15" y2="12"/></svg>',
            nosign: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'
        };

        const element = document.createElement('div');
        element.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            *{margin:0;padding:0;box-sizing:border-box}
            #pdf-content{font-family:'Inter',sans-serif;background:#fff;color:#111;padding:15mm 18mm;width:210mm;height:296.5mm;position:relative;overflow:hidden}
            
            /* Header */
            .pdf-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid #c9a84c;margin-bottom:22px}
            .pdf-header-left img{height:80px;object-fit:contain}
            .pdf-header-center{text-align:center;flex:1}
            .pdf-header-center h1{font-size:15px;font-weight:800;color:#111;letter-spacing:1px}
            .pdf-header-center h1 span{color:#c9a84c}
            .pdf-header-center p{font-size:11px;color:#999;font-weight:500;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
            .pdf-header-right img{height:52px;max-width:145px;object-fit:contain}

            /* Title Section */
            .title-sec{text-align:center;margin-top:45px;margin-bottom:30px}
            .title-sec h2{font-size:18px;font-weight:700;color:#333;letter-spacing:1px}
            .title-sec h2 .vs{font-size:12px;color:#666;text-transform:lowercase;font-weight:600;margin:0 6px}
            .title-sec h2 .cons{color:#c9a84c}
            .title-sec p{font-size:11px;color:#999;margin-top:4px}

            /* Main Grid */
            .main-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:35px}
            
            /* Cards */
            .card{border-radius:8px;overflow:hidden;background:#fdfcf8;border:1px solid #eee;display:flex;flex-direction:column}
            
            .card-fin .card-head{background:#1a1a1a;color:#fff;text-align:center;padding:16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
            .card-fin .card-foot{background:#1a1a1a;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:16px 20px}
            
            .card-con .card-head{background:#c9a84c;color:#fff;text-align:center;padding:16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
            .card-con .card-foot{background:#c9a84c;color:#111;display:flex;justify-content:space-between;align-items:center;padding:16px 20px}
            
            .card-body{padding:16px 20px;flex-grow:1}
            .row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f0f0f0}
            .row:last-child{border:none;padding-bottom:0}
            
            .row-left{color:#777;font-size:10px;font-weight:500;display:flex;align-items:center;gap:6px}
            .row-left svg{width:15px;height:15px;display:block}
            .row-right{font-size:12px;font-weight:800;color:#222}
            .row-right.red{color:#d32f2f}
            
            .foot-lbl{font-size:10px;text-transform:uppercase;font-weight:600;opacity:0.9;letter-spacing:0.5px}
            .foot-val{font-size:18px;font-weight:800}

            /* Economy Box */
            .eco-box{display:flex;background:#fcfbf8;border-radius:8px;overflow:hidden;margin-bottom:28px;align-items:stretch;}
            .eco-icon-wrap{background:#c9a84c;padding:0 35px;display:flex;align-items:center;justify-content:center}
            .eco-icon{width:46px;height:46px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700}
            .eco-text{padding:20px;flex:1;display:flex;flex-direction:column;justify-content:center}
            .eco-text h3{font-size:12px;font-weight:800;color:#111;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
            .eco-text p{font-size:11.5px;color:#666}
            .eco-text p strong{font-weight:800;color:#111}
            .eco-val{padding:0 35px;display:flex;align-items:center;font-size:24px;font-weight:800;color:#c9a84c}

            /* Bar Chart */
            .chart-sec{margin-bottom:10mm}
            .chart-title{text-align:center;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;position:relative}
            .chart-title::before, .chart-title::after{content:'';position:absolute;top:50%;width:30%;height:1px;background:#dfc578}
            .chart-title::before{left:0; width:28%}
            .chart-title::after{right:0; width:28%}
            
            .chart-row{display:flex;align-items:center;margin-bottom:14px;font-size:9.5px;font-weight:700;text-transform:uppercase}
            .c-lbl{width:120px;color:#555}
            .c-bar-wrap{flex:1;position:relative;height:12px;border-radius:4px;overflow:hidden;background:#f5f5f5}
            .c-bar{height:100%;border-radius:4px;min-width:3px}
            .c-val{width:120px;text-align:right;font-size:11px;font-weight:800;color:#111}
            
            .c-bar.fin{background:#1a1a1a;width:${payload.barFinPct * 100}%}
            .c-bar.con{background:#c9a84c;width:${payload.barConPct * 100}%}

            /* Footer */
            .pdf-footer-container{position:absolute;bottom:15mm;left:18mm;right:18mm}
            .pdf-footer{display:flex;justify-content:space-between;align-items:center;padding:16px 45px;border-top:1px solid #e2cd90;border-bottom:1px solid #e2cd90}
            .f-item{display:flex;align-items:center;gap:10px;font-size:10px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px}
            .f-item img{width:18px;height:18px;}
            .f-sep{width:1px;height:15px;background:#e0e0e0}
            .pdf-date-container{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:0 10px}
            .pdf-date{font-size:8px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:1px}
            .pdf-signature{font-size:8px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:1px}
        </style>
        
        <div id="pdf-content">
            <div class="pdf-header">
                <div class="pdf-header-left">
                    <img src="${headerLogoSrc}" alt="Aurenn Capital">
                </div>
                <div class="pdf-header-center">
                    <h1>COMPARATIVO <span>ESTRATÉGICO</span></h1>
                    <p>AQUISIÇÃO IMOBILIÁRIA</p>
                </div>
                <div class="pdf-header-right">
                    ${adminLogoSrc ? `<img src="${adminLogoSrc}" alt="${payload.adminName}">` : `<span style="font-weight:800;font-size:15px;color:#c9a84c">${payload.adminName}</span>`}
                </div>
            </div>

            <div class="title-sec">
                <h2>FINANCIAMENTO <span class="vs">vs</span> <span class="cons">CONSÓRCIO</span></h2>
                <p>Análise detalhada de custos e prazo para aquisição do imóvel</p>
            </div>

            <div class="main-grid">
                <!-- FINANCIAMENTO -->
                <div class="card card-fin">
                    <div class="card-head">FINANCIAMENTO</div>
                    <div class="card-body">
                        <div class="row">
                            <div class="row-left">${svgIcon.wallet} Valor Financiado</div>
                            <div class="row-right">${payload.finValorFinanciado}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.calendar} Prazo Estimado</div>
                            <div class="row-right">${payload.finPrazo}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.target} Sistema</div>
                            <div class="row-right">${payload.finSistema}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.dollar} 1ª Parcela</div>
                            <div class="row-right">${payload.finParcela1}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.calendar} Última Parcela</div>
                            <div class="row-right">${payload.finParcelaF}</div>
                        </div>
                        <div class="row" style="margin-top:2px; border-bottom:0">
                            <div class="row-left">${svgIcon.chart} Total de Juros</div>
                            <div class="row-right red">${payload.finTotalJuros}</div>
                        </div>
                    </div>
                    <div class="card-foot">
                        <span class="foot-lbl">TOTAL PAGO</span>
                        <span class="foot-val">${payload.finTotalPago}</span>
                    </div>
                </div>

                <!-- CONSÓRCIO -->
                <div class="card card-con">
                    <div class="card-head">CONSÓRCIO</div>
                    <div class="card-body">
                        <div class="row">
                            <div class="row-left">${svgIcon.wallet} Crédito</div>
                            <div class="row-right">${payload.valorImovel}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.hammer} Lance</div>
                            <div class="row-right">${payload.conLance}</div>
                        </div>
                        <div class="row">
                            <div class="row-left">${svgIcon.calendar} Prazo</div>
                            <div class="row-right">${payload.conPrazo}</div>
                        </div>
                        <div class="row" ${!payload.aluguel ? 'style="margin-top:2px; border-bottom:0"' : ''}>
                            <div class="row-left">${svgIcon.dollar} Parcela</div>
                            <div class="row-right">${payload.conParcela}</div>
                        </div>
                        ${payload.aluguel ? `
                        <div class="row" style="margin-top:2px; border-bottom:0">
                            <div class="row-left">${svgIcon.wallet} Custo Aluguel</div>
                            <div class="row-right">${payload.aluguel}</div>
                        </div>` : ''}
                    </div>
                    <div class="card-foot">
                        <span class="foot-lbl">TOTAL PAGO</span>
                        <span class="foot-val">${payload.barConVal}</span>
                    </div>
                </div>
            </div>

            <!-- ECONOMIA -->
            <div class="eco-box">
                <div class="eco-icon-wrap">
                    <div class="eco-icon">$</div>
                </div>
                <div class="eco-text">
                    <h3>ECONOMIA AO ESCOLHER O CONSÓRCIO</h3>
                    <p><strong>${payload.economiaMeses}</strong> mais rápido que o financiamento.</p>
                </div>
                <div class="eco-val">${payload.economiaVal}</div>
            </div>

            <!-- BAR CHART -->
            <div class="chart-sec">
                <div class="chart-title">CUSTO TOTAL DE AQUISIÇÃO</div>
                <div class="chart-row">
                    <div class="c-lbl">FINANCIAMENTO</div>
                    <div class="c-bar-wrap"><div class="c-bar fin"></div></div>
                    <div class="c-val">${payload.finTotalPago}</div>
                </div>
                <div class="chart-row">
                    <div class="c-lbl">CONSÓRCIO</div>
                    <div class="c-bar-wrap"><div class="c-bar con"></div></div>
                    <div class="c-val">${payload.barConVal}</div>
                </div>
            </div>

            <div style="border-top:1px dashed #e0e0e0; margin:15px 0 0px;"></div>

            <!-- FOOTER -->
            <div class="pdf-footer-container">
                <div class="pdf-footer">
                    <div class="f-item">${svgIcon.check} MENOR CUSTO</div>
                    <div class="f-sep"></div>
                    <div class="f-item">${svgIcon.calendar} MENOR PRAZO</div>
                    <div class="f-sep"></div>
                    <div class="f-item">${svgIcon.percent} SEM JUROS</div>
                </div>
                <div class="pdf-date-container">
                    <div class="pdf-date">SIMULAÇÃO GERADA EM ${payload.dateStr}</div>
                    <div class="pdf-signature">Simulação Aurenn Capital</div>
                </div>
            </div>

        </div>`;

        const opt = {
            margin: 0,
            filename: `Comparativo_Financiamento_vs_Consorcio_${payload.adminName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();

    } catch (e) {
        console.error('Erro gerarPDFComparativo:', e);
        alert('Erro ao gerar relatorio: ' + e.message);
    }
}
