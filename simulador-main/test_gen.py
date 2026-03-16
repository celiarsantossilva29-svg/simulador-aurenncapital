import json
from server import SimuladorEstrategicoPDF

data = {
    "administradora": "Porto Seguro",
    "admin_id": "porto_seguro",
    "credito": "3.500.000,00",
    "prazo": "155",
    "reduzir_apos_contemplar": "parcela",
    "lances": {
        "embutido_pct": "30,00",
        "embutido_val": "1.050.000,00",
        "proprio_pct": "0,00",
        "proprio_val": "0,00",
        "total_pct": "30,00",
        "total_val": "1.050.000,00"
    },
    "resultados": {
        "qtd_primeiras": "1",
        "pct_antecipada": "0",
        "primeiras_val": "46.236,56",
        "demais_val": "37.903,23",
        "credito_liquido": "2.450.000,00",
        "apos_contemplar_val": "28.108,85",
        "prazo_restante": "154"
    }
}

try:
    pdf = SimuladorEstrategicoPDF(data)
    pdf_bytes = pdf.build()
    with open("test_simulador.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
