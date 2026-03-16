// pdf_simulador.js

function baixarPDFBuffer(pdfBytes, filename) {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.gerarPDFSimulador = async function() {
    try {
        // Obter Administradora
        const selAdmin = document.getElementById('administradora');
        const adminIndex = selAdmin.selectedIndex;
        const nomeAdministradora = selAdmin.options[adminIndex].text;
        const adminValue = selAdmin.value;

        // Obter valores do painel esquerdo "Condições do Plano" e "Oferta de Lance"
        const paramCreditoStr = document.getElementById('valorCredito').value;
        const paramPrazo = document.getElementById('prazoGrupo').value;
        
        // Obter modalidade redução (parcela vs prazo)
        const radiosReducao = document.getElementsByName('reducao');
        let tipoReducao = 'parcela';
        for (const r of radiosReducao) {
            if (r.checked) {
                tipoReducao = r.value;
                break;
            }
        }

        const pctLanceEmbutido = document.getElementById('lanceEmbutido').value;
        const pctLancePagar = document.getElementById('lancePagar').value;
        const pctLanceTotal = document.getElementById('lanceTotal').value;

        const valEmbutidoStr = document.getElementById('valorEmbutido').value;
        const valPagarStr = document.getElementById('valorPagar').value;
        const valTotalStr = document.getElementById('valorTotal').value;

        // Obter valores do painel direito "Resultado da Simulação"
        const qtdPrimeiras = document.getElementById('primeirasN').value;
        const pctAntecipada = document.getElementById('antecipada').value;
        const p1Str = document.getElementById('resultPrimeiras').value;
        const pDemaisStr = document.getElementById('resultDemais').value;
        const credLiqStr = document.getElementById('resultCredLiquido').value;
        const pPosStr = document.getElementById('resultPosContemp').value;
        const prazoRestante = document.getElementById('resultPrazoRestante').value;
        const obsEl = document.getElementById('observacoes');
        const observacoesTxt = obsEl ? obsEl.innerText : '';

        // Montar Payload
        const payload = {
            administradora: nomeAdministradora,
            admin_id: adminValue,
            credito: paramCreditoStr,
            prazo: paramPrazo,
            reduzir_apos_contemplar: tipoReducao,
            observacoes: observacoesTxt,
            
            lances: {
                embutido_pct: pctLanceEmbutido,
                embutido_val: valEmbutidoStr,
                proprio_pct: pctLancePagar,
                proprio_val: valPagarStr,
                total_pct: pctLanceTotal,
                total_val: valTotalStr
            },
            
            resultados: {
                qtd_primeiras: qtdPrimeiras,
                pct_antecipada: pctAntecipada,
                primeiras_val: p1Str,
                demais_val: pDemaisStr,
                credito_liquido: credLiqStr,
                apos_contemplar_val: pPosStr,
                prazo_restante: prazoRestante
            }
        };

        // Enviar para o servidor
        const response = await fetch('/gerar-pdf-simulador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro no servidor Python');
        }

        const arrayBuffer = await response.arrayBuffer();
        baixarPDFBuffer(arrayBuffer, `Simulacao_Estrategica_CRInvest_${nomeAdministradora}.pdf`);

    } catch (e) {
        console.error('Erro ao gerar PDF do Simulador:', e);
        alert('Ocorreu um erro ao gerar o PDF. Verifique o console.');
    }
};
