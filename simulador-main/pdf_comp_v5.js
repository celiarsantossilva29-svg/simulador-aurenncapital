/**
 * pdf_comp.js ÔÇö Envia dados do comparativo para o backend Python gerar o PDF.
 */
function gerarPDFComparativo() {
    try {
        // ÔöÇÔöÇ Coleta dados do DOM ÔöÇÔöÇ
        var fin = window._caixaFinData || {};

        var el = function (id) { return document.getElementById(id); };
        var txt = function (id) { var e = el(id); return e ? e.textContent.trim() : ''; };
        var val = function (id) { var e = el(id); return e ? e.value : ''; };

        // Admin
        var adminEl = el('compAdministradora');
        var adminName = adminEl ? adminEl.options[adminEl.selectedIndex].text : 'Porto Seguro';

        // Valor do im├│vel
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

        // Cons├│rcio
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

        // ÔöÇÔöÇ Payload ÔöÇÔöÇ
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

        // ÔöÇÔöÇ Envia para o backend Python ÔöÇÔöÇ
        fetch('/gerar-pdf-comparativo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (resp) {
                if (!resp.ok) {
                    return resp.json().then(function (err) {
                        throw new Error(err.error || 'Erro no servidor');
                    });
                }
                return resp.blob();
            })
            .then(function (blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'Comparativo_Financiamento_vs_Consorcio.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(function (err) {
                console.error('Erro PDF:', err);
                alert('Erro ao gerar PDF Comparativo: ' + err.message);
            });

    } catch (e) {
        console.error('Erro gerarPDFComparativo:', e);
        alert('Erro ao coletar dados: ' + e.message);
    }
}
