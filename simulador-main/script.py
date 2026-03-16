import sys

with open('script.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    if (modoLancePagar === 'pct') {
        // Modo Padrão: Usuário digitou %
        if (lanceTotalPct === 0) {
            valorTotalLance = 0;
            valorEmbutido = 0;
            valorAPagar = 0;
        } else {
            const limiteEmbutido = 0.30 * credito;
            valorEmbutido = Math.min(lanceEmbutidoPct * baseCalculo, limiteEmbutido);
            valorAPagar = lancePagarPct * baseCalculo;
            valorTotalLance = valorEmbutido + valorAPagar;
        }
    } else {
        // Modo Reverso: Usuário digitou $ no campo a Pagar
        const valorPagarDigitado = parseCurrency(document.getElementById('valorPagar').value);
        valorAPagar = valorPagarDigitado;

        // Embutido base: usa estritamente o percentual digitado (limitado a 30% do crédito)
        const limiteEmbutido = 0.30 * credito;
        let embutidoDesejado = lanceEmbutidoPct * baseCalculo;
        if (embutidoDesejado > limiteEmbutido) embutidoDesejado = limiteEmbutido;

        valorEmbutido = embutidoDesejado;
        valorTotalLance = valorAPagar + valorEmbutido;

        // Atualiza campos inativos (%)
        let pctCalculada = valorTotalLance / baseCalculo;
        if (pctCalculada < 0) pctCalculada = 0;

        let pagarPctCalc = pctCalculada - (valorEmbutido / baseCalculo);
        if (pagarPctCalc < 0) pagarPctCalc = 0;
        document.getElementById('lancePagar').value = (pagarPctCalc * 100).toFixed(2);
    }"""

replacement = """    if (modoLancePagar === 'pct') {
        // Modo Padrão: Usuário digitou %
        if (lanceTotalPct === 0) {
            valorTotalLance = 0;
            valorEmbutido = 0;
            valorAPagar = 0;
        } else {
            const valorOfertaEmbutido = lanceEmbutidoPct * baseCalculo;
            const limiteEmbutido = 0.30 * credito;
            
            // O valor do lance embutido é limitado a 30% do crédito.
            const embutidoUsado = Math.min(valorOfertaEmbutido, limiteEmbutido);
            
            // Se o lance (usando cota embutida) passar do limite de exclusividade do crédito, a diferença cai no bolso.
            const spillover = valorOfertaEmbutido - embutidoUsado;
            
            valorEmbutido = embutidoUsado;
            // Somamos a diferença excedida (spillover) com qualquer valor extra digitado puramente em 'A Pagar'
            valorAPagar = spillover + (lancePagarPct * baseCalculo);
            valorTotalLance = valorEmbutido + valorAPagar;
        }
    } else {
        // Modo Reverso: Usuário digitou $ no campo a Pagar
        const valorPagarDigitado = parseCurrency(document.getElementById('valorPagar').value);
        valorAPagar = valorPagarDigitado;

        const valorOfertaEmbutido = lanceEmbutidoPct * baseCalculo;
        const limiteEmbutido = 0.30 * credito;
        const embutidoUsado = Math.min(valorOfertaEmbutido, limiteEmbutido);
        const spillover = valorOfertaEmbutido - embutidoUsado;

        valorEmbutido = embutidoUsado;
        valorTotalLance = valorAPagar + valorEmbutido;

        // Atualiza o percentual inativo de % A Pagar
        // O Pagar absorve o spillover; então descontamos o spillover do A Pagar total para saber
        // a "oferta pura de bolso"
        let pagarPctCalc = (valorAPagar - spillover) / baseCalculo;
        if (pagarPctCalc < 0) pagarPctCalc = 0;
        document.getElementById('lancePagar').value = (pagarPctCalc * 100).toFixed(2);
    }"""

text = text.replace(target, replacement)
text = text.replace(target.replace('\\n', '\\r\\n'), replacement.replace('\\n', '\\r\\n'))

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Replacement Complete")
