"""
server.py  –  Servidor HTTP estático + endpoint POST /gerar-pdf-comparativo
Gera PDF do Comparativo Financiamento × Consórcio usando fpdf2.
"""
import http.server, json, io, os, sys, base64
from urllib.parse import urlparse
from fpdf import FPDF

PORT = 8000
DIR  = os.path.dirname(os.path.abspath(__file__))

# ────────────────────────────────────────
# PDF Builder
# ────────────────────────────────────────
class ComparativoPDF(FPDF):
    def __init__(self, data):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.data = data
        self.set_auto_page_break(auto=False)
        self.set_margins(15, 2, 15)

    # Cores baseadas na paleta AURENN CAPITAL
    GOLD = (200, 161, 90)    # #C8A15A
    DARK = (31, 31, 35)      # #1F1F23
    GRAY_TEXT = (107, 107, 107) # #6B6B6B
    LIGHT_BG = (245, 245, 245)  # #F5F5F5
    RED = (209, 62, 62)      
    WHITE = (255, 255, 255)
    BLACK = (31, 31, 35)
    
    def draw_rounded_rect(self, x, y, w, h, r, style='F'):
        try:
            self.rect(x, y, w, h, style=style, round_corners=True, corner_radius=r)
        except TypeError:
            self.rect(x, y, w, h, style=style)

    def draw_shadow(self, x, y, w, h, r=4):
        # Sombra leve
        for i in range(3, 0, -1):
            c = 255 - (3 - i) * 6
            self.set_fill_color(c, c, c)
            self.draw_rounded_rect(x - (i * 0.3), y - (i * 0.3) + 1, w + (i * 0.6), h + (i * 0.6), r, style='F')

    def draw_svg_icon(self, x, y, icon_type='generic', color=None):
        if color is None: color = self.GOLD
        self.set_draw_color(*color)
        self.set_line_width(0.2)
        if icon_type == 'wallet':
            self.rect(x, y+0.5, 4, 2.5, 'D')
            self.rect(x+2.5, y+1.2, 1.5, 1, 'D')
        elif icon_type == 'calendar':
            self.rect(x, y+0.5, 3.5, 3, 'D')
            self.line(x, y+1.5, x+3.5, y+1.5)
            self.line(x+1, y, x+1, y+1)
            self.line(x+2.5, y, x+2.5, y+1)
        elif icon_type == 'target':
            self.ellipse(x, y, 3, 3, 'D')
            self.ellipse(x+1, y+1, 1, 1, 'D')
            self.line(x+1.5, y-1, x+1.5, y)
            self.line(x+1.5, y+3, x+1.5, y+4)
            self.line(x-1, y+1.5, x, y+1.5)
            self.line(x+3, y+1.5, x+4, y+1.5)
        elif icon_type == 'money':
            self.ellipse(x, y, 3, 3, 'D')
            self.line(x+1.5, y+0.5, x+1.5, y+2.5)
            self.line(x+1, y+1, x+2, y+1)
            self.line(x+1, y+2, x+2, y+2)
        elif icon_type == 'chart':
            self.line(x, y+3, x+3.5, y+3)
            self.rect(x+0.5, y+1.5, 0.8, 1.5, 'D')
            self.rect(x+1.5, y+0.5, 0.8, 2.5, 'D')
            self.rect(x+2.5, y-0.5, 0.8, 3.5, 'D')
        elif icon_type == 'phone':
            self.line(x+0.5, y+3, x+2.5, y+1)
            self.rect(x+1.5, y+0, 1.5, 1.5, 'D')
        elif icon_type == 'percent':
            self.ellipse(x, y, 1, 1, 'D')
            self.ellipse(x+2, y+2, 1, 1, 'D')
            self.line(x+3, y, x, y+3)
        else:
            self.rect(x, y, 3, 3, 'D')

    def build_header(self):
        d = self.data
        
        # Thin gold rule (drawn before logos so it doesn't cut through them)
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.3)
        self.line(15, 28, 195, 28)
        
        logo_path = os.path.join(DIR, 'logo-nova-transparent.png')
        if not os.path.isfile(logo_path):
            logo_path = os.path.join(DIR, 'logo-nova.png')
        if os.path.isfile(logo_path):
            self.image(logo_path, 15, 4, w=24)

        admin_name = d.get('adminName', '')
        
        # Center stacked title
        self.set_xy(0, 14)
        self.set_font('Helvetica', 'B', 12)
        
        w_comp = self.get_string_width('COMPARATIVO ')
        w_est = self.get_string_width('ESTRATEGICO')
        cx = (210 - (w_comp + w_est))/2
        self.set_x(cx)
        self.set_text_color(*self.DARK)
        self.cell(w_comp, 6, 'COMPARATIVO ')
        self.set_text_color(*self.GOLD)
        self.cell(w_est, 6, 'ESTRATEGICO', new_x='LMARGIN', new_y='NEXT')
        
        self.set_xy(0, 20)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(160, 160, 160) # Lighter gray
        self.cell(210, 6, 'AQUISIÇÃO IMOBILIÁRIA', align='C')

        # Right Admin
        logo_admin_path = os.path.join(DIR, 'logo-porto.png')
        if "porto" in admin_name.lower() and os.path.isfile(logo_admin_path):
            self.image(logo_admin_path, 162, 10, w=33)
        else:
            self.set_xy(140, 16)
            self.set_font('Helvetica', 'B', 12)
            self.set_text_color(*self.DARK)
            self.cell(55, 6, admin_name.upper(), align='R')

    def build_title(self):
        self.set_y(44)
        
        self.set_font('Helvetica', '', 14)
        w_fin = self.get_string_width('FINANCIAMENTO ')
        
        self.set_font('Helvetica', 'B', 9)
        w_vs = self.get_string_width('VS') + 6
        
        self.set_font('Helvetica', 'B', 14)
        w_con = self.get_string_width(' CONSORCIO')
        
        total_w = w_fin + w_vs + w_con
        start_x = (210 - total_w) / 2
        
        self.set_xy(start_x, 46)
        self.set_font('Helvetica', '', 14)
        self.set_text_color(*self.DARK)
        self.cell(w_fin, 8, 'FINANCIAMENTO ')
        
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*self.DARK)
        self.cell(w_vs, 8, 'VS', align='C')
        
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.GOLD)
        self.cell(w_con, 8, ' CONSÓRCIO', new_x='LMARGIN', new_y='NEXT')
        
        self.ln(1)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(160, 160, 160) # Light gray
        self.cell(0, 6, 'Análise detalhada de custos e prazo para aquisição do imóvel', align='C', new_x='LMARGIN', new_y='NEXT')
        self.ln(6)

    def build_cards(self):
        d = self.data
        col_w = 86
        gap = 8
        x1 = 15
        x2 = x1 + col_w + gap
        y_cards = self.get_y()
        
        card_h = 82
        
        # ────────────────────────────────────
        # CARD ESQUERDO: FINANCIAMENTO
        # ────────────────────────────────────
        self.set_fill_color(*self.DARK)
        self.draw_rounded_rect(x1, y_cards, col_w, card_h, r=3, style='F')
        
        self.set_xy(x1+4, y_cards+3)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*self.WHITE)
        self.cell(col_w-8, 6, 'FINANCIAMENTO', align='C')
        
        rows_fin = [
            ('Valor Financiado', d.get('finValorFinanciado', 'R$ 0,00'), 'wallet'),
            ('Prazo Estimado', d.get('finPrazo', '420 meses (35 anos)'), 'calendar'),
            ('Sistema', d.get('finSistema', 'SAC'), 'target'),
            ('1a Parcela', d.get('finParcela1', 'R$ 0,00'), 'money'),
            ('Ultima Parcela', d.get('finParcelaF', 'R$ 0,00'), 'calendar'),
            ('Total de Juros', d.get('finTotalJuros', 'R$ 0,00'), 'chart'),
        ]
        
        y_r = y_cards + 16
        for i, (lbl, val, icon) in enumerate(rows_fin):
            self.draw_svg_icon(x1 + 6, y_r + 1.5, icon, color=self.GOLD)
            self.set_xy(x1 + 12, y_r)
            
            self.set_font('Helvetica', '', 8)
            self.set_text_color(180, 180, 180) # Light silver gray
            self.cell(40, 6, lbl)
            
            self.set_font('Helvetica', 'B', 9)
            if 'Juros' in lbl:
                self.set_text_color(*self.RED)
            else:
                self.set_text_color(*self.WHITE)
            
            w_val = self.get_string_width(val)
            self.set_xy(x1 + col_w - w_val - 6, y_r)
            self.cell(w_val, 6, val)
            
            if i < len(rows_fin) - 1:
                self.set_draw_color(60, 60, 65) # Dark thin separator
                self.set_line_width(0.1)
                self.line(x1 + 6, y_r + 6.0, x1 + col_w - 6, y_r + 6.0)
            y_r += 8.2
            
        # Totalizer Bottom Attached
        y_t = y_cards + 68
        self.set_fill_color(21, 21, 25) # slightly darker tone for footer
        self.draw_rounded_rect(x1, y_t, col_w, 14, r=3, style='F')
        self.rect(x1, y_t, col_w, 6, style='F') # Square top to connect seamlessly
        
        self.set_xy(x1 + 6, y_t + 4)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(180, 180, 180)
        self.cell(30, 6, 'TOTAL PAGO')
        
        self.set_font('Helvetica', 'B', 12)
        total_pago = d.get('finTotalPago', 'R$ 0,00')
        w_tot = self.get_string_width(total_pago)
        self.set_xy(x1 + col_w - w_tot - 8, y_t + 1.5)
        self.set_text_color(*self.WHITE)
        self.cell(w_tot + 5, 10, total_pago)


        # ────────────────────────────────────
        # CARD DIREITO: CONSORCIO
        # ────────────────────────────────────
        self.set_fill_color(*self.GOLD)
        self.draw_rounded_rect(x2, y_cards, col_w, card_h, r=3, style='F')
        
        self.set_xy(x2+4, y_cards+3)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*self.WHITE)
        self.cell(col_w-8, 6, 'CONSÓRCIO', align='C')
        
        rows_con = [
            ('Crédito', d.get('finValorFinanciado', 'R$ 0,00'), 'wallet'),
            ('Lance', d.get('conLance', 'R$ 0,00'), 'phone'),
            ('Prazo', d.get('conPrazo', '200 meses'), 'calendar'),
            ('Parcela', d.get('conParcela', 'R$ 0,00'), 'money'),
        ]
        
        if d.get('adesao'):
            rows_con.append(('Taxa Adm.', d.get('adesao'), 'percent'))
        else:
            rows_con.append(('Taxa Adm.', '-', 'percent'))
            
        rows_con.append(('Fundo Res.', '-', 'chart'))

        y_r = y_cards + 16
        for i, (lbl, val, icon) in enumerate(rows_con):
            self.draw_svg_icon(x2 + 6, y_r + 1.5, icon, color=self.WHITE)
            self.set_xy(x2 + 12, y_r)
            
            self.set_font('Helvetica', '', 8)
            self.set_text_color(*self.WHITE)
            self.cell(40, 6, lbl)
            
            self.set_font('Helvetica', 'B', 9)
            self.set_text_color(*self.DARK)
            w_val = self.get_string_width(val)
            self.set_xy(x2 + col_w - w_val - 6, y_r)
            self.cell(w_val, 6, val)
            
            if i < len(rows_con) - 1:
                # Thin transparent-like line
                self.set_draw_color(225, 190, 120)
                self.set_line_width(0.1)
                self.line(x2 + 6, y_r + 6.0, x2 + col_w - 6, y_r + 6.0)
            y_r += 8.2

        # Totalizer Bottom Attached
        y_t = y_cards + 68
        self.set_fill_color(185, 145, 75)  # Slightly darker tone for footer
        self.draw_rounded_rect(x2, y_t, col_w, 14, r=3, style='F')
        self.rect(x2, y_t, col_w, 6, style='F')
        
        self.set_xy(x2 + 6, y_t + 4)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*self.WHITE)
        self.cell(30, 6, 'TOTAL PAGO')
        
        self.set_font('Helvetica', 'B', 12)
        con_total = str(d.get('barConVal', 'R$ 0,00')).strip()
        if not con_total.startswith('R$'):
            con_total = 'R$ ' + con_total
            
        self.set_text_color(*self.DARK) 
        w_tot2 = self.get_string_width(con_total)
        self.set_xy(x2 + col_w - w_tot2 - 8, y_t + 1.5)
        self.cell(w_tot2 + 5, 10, con_total)
        
        self.set_y(y_cards + 95)

    def build_economia(self):
        d = self.data
        y = self.get_y()
        
        w_box = 180
        x_box = 15
        
        # main box
        self.set_fill_color(*self.LIGHT_BG)
        self.draw_rounded_rect(x_box, y+4, w_box, 20, r=3, style='F')
        
        # golden tab on the left
        self.set_fill_color(*self.GOLD)
        self.draw_rounded_rect(x_box-1, y+4, 30, 20, r=4, style='F')
        self.rect(x_box+26, y+4, 3, 20, 'F')
        
        # Big white $ icon w/ up-arrow
        circle_cx = x_box + 15
        circle_cy = y + 14
        self.set_draw_color(*self.WHITE)
        self.set_line_width(0.3)
        self.ellipse(circle_cx - 8, circle_cy - 8, 16, 16, 'D')
        
        # Clean, large $ symbol inside the circle
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.WHITE)
        self.set_xy(circle_cx - 6, circle_cy - 7)
        self.cell(12, 14, '$', align='C')
        
        # Texts
        self.set_xy(x_box + 40, y+8)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*self.DARK)
        self.cell(0, 5, 'ECONOMIA AO ESCOLHER O CONSÓRCIO')

        self.set_xy(x_box + 40, y+14)
        self.set_font('Helvetica', 'B', 10)
        
        meses_str = str(d.get('economiaMeses', '0 meses')).strip()
        import re
        m = re.search(r'(\d+)\s*meses', meses_str)
        if m:
            bold_part = f"{m.group(1)} meses"
            rest_part = " mais rápido que o financiamento."
        else:
            bold_part = meses_str
            rest_part = " que o financiamento."
            
        self.cell(self.get_string_width(bold_part)+1, 6, bold_part)
        self.set_font('Helvetica', '', 10)
        self.set_text_color(*self.GRAY_TEXT)
        self.cell(0, 6, rest_part)
        
        eco_val = str(d.get('economiaVal', 'R$ 0')).strip()
        if not eco_val.startswith('R$'):
            eco_val = 'R$ ' + eco_val
            
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(*self.GOLD)
        w_eco = self.get_string_width(eco_val)
        start_x = x_box + w_box - w_eco - 8
        self.set_xy(start_x, y+7)
        self.cell(w_eco + 5, 14, eco_val)
        
        self.set_y(y + 36)

    def build_barras(self):
        d = self.data
        y = self.get_y()
        
        self.set_xy(15, y)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.DARK)
        title_str = 'CUSTO TOTAL DE AQUISIÇÃO'
        w_title = self.get_string_width(title_str)
        self.cell(0, 5, title_str, align='C')
        
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.3)
        c_x = 210 / 2
        self.line(c_x - (w_title/2) - 15, y+2.5, c_x - (w_title/2) - 3, y+2.5)
        self.line(c_x + (w_title/2) + 3, y+2.5, c_x + (w_title/2) + 15, y+2.5)
        
        self.set_y(y + 12)
        
        bar_h = 5
        label_w = 30
        track_w = 110
        val_w = 40
        
        fin_pct = float(d.get('barFinPct', 1.0))
        y_fin = self.get_y()
        self.set_xy(15, y_fin)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*self.DARK)
        self.cell(label_w, bar_h, 'FINANCIAMENTO')
        
        fill_fin = max(track_w * fin_pct, 4)
        self.set_fill_color(*self.DARK)
        self.draw_rounded_rect(15 + label_w, y_fin, fill_fin, bar_h, r=1, style='F')
        
        self.set_xy(195 - val_w, y_fin)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*self.DARK)
        self.cell(val_w, bar_h, d.get('finTotalPago', 'R$ 0'), align='R')
        
        self.set_y(y_fin + 12)
        
        con_pct = float(d.get('barConPct', 0.5))
        y_con = self.get_y()
        self.set_xy(15, y_con)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*self.DARK)
        self.cell(label_w, bar_h, 'CONSÓRCIO')
        
        fill_con = max(track_w * con_pct, 4)
        self.set_fill_color(*self.GOLD)
        self.draw_rounded_rect(15 + label_w, y_con, fill_con, bar_h, r=1, style='F')
        
        self.set_xy(195 - val_w, y_con)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*self.DARK)
        con_total = str(d.get('barConVal', 'R$ 0')).strip()
        if not con_total.startswith('R$'):
            con_total = 'R$ ' + con_total
        self.cell(val_w, bar_h, con_total, align='R')
        
        # Dotted thin boundary underneath and line right under
        y_line = y_con + 12
        self.set_draw_color(225, 225, 225)
        self.set_line_width(0.1)
        for dash_x in range(15, 195, 2):
            self.line(dash_x, y_line, dash_x+1, y_line)
            
        self.set_y(y_line + 10)

    def draw_footer_icon(self, x, y, icon):
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.4)
        if icon == 'shield':
            self.line(x, y+1, x+2, y)
            self.line(x+2, y, x+4, y+1)
            self.line(x, y+1, x, y+3)
            self.line(x+4, y+1, x+4, y+3)
            self.line(x, y+3, x+2, y+5)
            self.line(x+4, y+3, x+2, y+5)
            # checkmark inside
            self.line(x+1, y+2, x+2, y+3)
            self.line(x+2, y+3, x+3.5, y+1)
        elif icon == 'calendar_box':
            self.rect(x, y, 4, 3, 'D')
            self.line(x, y+1, x+4, y+1)
            # dots
            self.line(x+1, y+1.5, x+1, y+1.5)
            self.line(x+2, y+1.5, x+2, y+1.5)
            self.line(x+3, y+1.5, x+3, y+1.5)
            self.line(x+1, y+2.5, x+1, y+2.5)
            self.line(x+2, y+2.5, x+2, y+2.5)
            self.line(x+3, y+2.5, x+3, y+2.5)
        elif icon == 'percent_circle':
            self.ellipse(x, y, 4, 4, 'D')
            self.ellipse(x+1, y+1, 0.5, 0.5, 'D')
            self.ellipse(x+2.5, y+2.5, 0.5, 0.5, 'D')
            self.line(x+3, y+1, x+1, y+3)

    def build_footer(self):
        y = self.get_y()
        
        self.set_draw_color(220, 200, 150)
        self.set_line_width(0.3)
        self.line(15, y, 195, y)
        
        # separator marks |
        self.set_draw_color(230, 230, 230)
        self.line(75, y+4, 75, y+10)
        self.line(135, y+4, 135, y+10)
        
        self.draw_footer_icon(28, y+4.5, 'shield')
        self.draw_footer_icon(88, y+5.5, 'calendar_box')
        self.draw_footer_icon(148, y+4.5, 'percent_circle')
        
        self.set_xy(15, y)
        self.set_font('Helvetica', 'B', 7)
        self.set_text_color(*self.DARK)
        self.cell(60, 14, '      MENOR CUSTO', align='C')
        
        self.set_xy(75, y)
        self.cell(60, 14, '      MENOR PRAZO', align='C')
        
        self.set_xy(135, y)
        self.cell(60, 14, '      SEM JUROS', align='C')
        
        # Bottom gold rule
        self.set_draw_color(220, 200, 150)
        self.line(15, y+14, 195, y+14)

    def build(self):
        self.add_page()
        self.build_header()
        self.build_title()
        self.build_cards()
        self.build_economia()
        self.build_barras()
        self.build_footer()
        return self.output()

# ────────────────────────────────────────
# RELATÓRIO: SIMULAÇÃO ESTRATÉGICA
# ────────────────────────────────────────

class SimuladorEstrategicoPDF(FPDF):
    def __init__(self, data):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.data = data
        self.set_auto_page_break(auto=False)
        self.add_page()
        
        # Colors
        self.GOLD = (201, 168, 76)
        self.DARK = (31, 31, 35)
        self.LT_GRAY = (245, 245, 245)
        self.WHITE = (255, 255, 255)
        
    def build_header(self):
        # Top Logo Aurenn Capital
        logo_cr_path = os.path.join(DIR, 'logo-nova-transparent.png')
        if not os.path.isfile(logo_cr_path):
            logo_cr_path = os.path.join(DIR, 'logo-nova.png')
        if os.path.isfile(logo_cr_path):
            self.image(logo_cr_path, 15, 13, h=23) # Height matched to text block
            
        # Vertical Separator Line
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.3)
        self.line(60, 15, 60, 35)
        
        mode = self.data.get('mode', 'integral')
        pct_reducao = self.data.get('pctReducao', '25')

        self.set_xy(65, 13)
        self.set_font('Helvetica', '', 14)
        self.set_text_color(*self.DARK)
        self.cell(0, 7, 'S I M U L A Ç Ã O')
        
        self.set_xy(65, 20)
        self.set_font('Helvetica', 'B', 22)
        self.cell(0, 9, 'ESTRATÉGICA')
        
        self.set_xy(65, 30)
        self.set_font('Helvetica', '', 11)
        self.set_text_color(120, 120, 120)
        
        if mode == 'reduzida':
            self.cell(0, 5, f'D E   C O N S Ó R C I O   ({pct_reducao}% REDUZIDA)')
        else:
            self.cell(0, 5, 'D E   C O N S Ó R C I O')
        
        # Bottom Golden Line for Title
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.5)
        self.line(65, 36, 120, 36)
        
        # Right Logo Administradora
        admin_id = self.data.get('admin_id', 'porto_seguro')
        admin_name = self.data.get('administradora', 'Porto Seguro')
        
        self.set_xy(150, 14)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(45, 4, 'ADMINISTRADORA', align='R')
        
        logo_admin_path = os.path.join(DIR, f'logo-{admin_id}.png')
        if not os.path.isfile(logo_admin_path):
            logo_admin_path = os.path.join(DIR, 'logo-porto.png')
            
        if os.path.isfile(logo_admin_path):
            if "embracon" in admin_id:
                self.image(logo_admin_path, 165, 20, w=30)
            else:
                self.image(logo_admin_path, 160, 20, w=35)
        else:
            self.set_xy(145, 22)
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(*self.DARK)
            self.cell(50, 8, admin_name.upper(), align='R')
            
    def draw_icon(self, cx, cy, icon_type="", radius=4.5, with_bg_circle=False):
        if with_bg_circle:
            self.set_fill_color(248, 243, 235) # Very light warm gold/beige
            self.set_draw_color(248, 243, 235)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx - radius*1.4, cy - radius*1.4, radius * 2.8, radius * 2.8, style='F')
                
        self.set_draw_color(201, 168, 76) # Gold inner
        self.set_line_width(0.3)
        r = radius
        
        if icon_type == "plano":
            self.polygon(((cx-r, cy-r*1.2), (cx+r*0.4, cy-r*1.2), (cx+r, cy-r*0.6), (cx+r, cy+r*1.2), (cx-r, cy+r*1.2)), style='D')
            self.line(cx+r*0.4, cy-r*1.2, cx+r*0.4, cy-r*0.6)
            self.line(cx+r*0.4, cy-r*0.6, cx+r, cy-r*0.6)
            self.line(cx-r*0.5, cy-r*0.3, cx+r*0.5, cy-r*0.3)
            self.line(cx-r*0.5, cy+r*0.2, cx+r*0.5, cy+r*0.2)
            self.line(cx-r*0.5, cy+r*0.7, cx, cy+r*0.7)
            
        elif icon_type == "prazo":
            self.rect(cx-r, cy-r*0.6, r*2, r*1.8, style='D')
            self.line(cx-r, cy-r*0.1, cx+r, cy-r*0.1)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*0.6, cy-r*1.1, r*0.4, r*0.4, style='D')
                self.ellipse(cx+r*0.2, cy-r*1.1, r*0.4, r*0.4, style='D')
            self.rect(cx-r*0.3, cy+r*0.3, r*0.6, r*0.6, style='D')
            
        elif icon_type == "estrategia":
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r, cy-r, r*2, r*2, style='D')
                self.ellipse(cx-r*0.3, cy-r*0.3, r*0.6, r*0.6, style='D')
            self.line(cx, cy, cx+r*1.2, cy-r*1.2)
            self.line(cx+r*1.2, cy-r*1.2, cx+r*0.5, cy-r*1.2)
            self.line(cx+r*1.2, cy-r*1.2, cx+r*1.2, cy-r*0.5)
            
        elif icon_type == "embutido":
            bg_f = (248, 243, 235) if with_bg_circle else (255, 255, 255)
            self.set_fill_color(*bg_f)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r, cy, r*2, r*0.8, style='FD')
                self.ellipse(cx-r, cy-r*0.7, r*2, r*0.8, style='FD')
                self.ellipse(cx-r, cy-r*1.4, r*2, r*0.8, style='FD')
            self.set_fill_color(255, 255, 255)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx+r*0.3, cy-r*0.2, r*1.2, r*1.2, style='FD')
            self.line(cx+r*0.6, cy+r*0.4, cx+r*1.2, cy+r*0.4)
                
        elif icon_type == "proprio":
            self.line(cx-r*1.2, cy+r*0.5, cx-r*0.5, cy+r*1.2)
            self.line(cx-r*0.5, cy+r*1.2, cx+r*0.5, cy+r*1.2)
            self.line(cx+r*0.5, cy+r*1.2, cx+r*1.2, cy+r*0.5)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*0.5, cy-r*0.6, r*1, r*1, style='D')
            self.line(cx, cy-r*0.2, cx, cy+r*0.3)
            self.line(cx-r*0.25, cy+r*0.05, cx+r*0.25, cy+r*0.05)
            
        elif icon_type == "fluxo1":
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*0.8, cy-r*1.2, r*1.6, r*1.6, style='D')
            self.line(cx-r*0.4, cy+r*0.3, cx-r*0.6, cy+r*1.2)
            self.line(cx-r*0.6, cy+r*1.2, cx, cy+r*0.8)
            self.line(cx, cy+r*0.8, cx+r*0.6, cy+r*1.2)
            self.line(cx+r*0.6, cy+r*1.2, cx+r*0.4, cy+r*0.3)
            self.line(cx-r*0.1, cy-r*0.6, cx, cy-r*0.8)
            self.line(cx, cy-r*0.8, cx, cy)
            self.line(cx-r*0.2, cy, cx+r*0.2, cy)
            
        elif icon_type == "fluxo2":
            bg_f = (248, 243, 235) if with_bg_circle else (255, 255, 255)
            self.set_fill_color(*bg_f)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx+r*0.2, cy-r*1.2, r, r, style='D')
            self.rect(cx+r*0.1, cy-r*0.1, r*1.2, r*1.1, style='D')
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*0.8, cy-r*0.8, r*1.2, r*1.2, style='FD')
            self.rect(cx-r*1.2, cy+r*0.4, r*2, r*0.8, style='FD')
            
        elif icon_type == "fluxo3":
            self.rect(cx-r*1.0, cy-r*1.2, r*2.0, r*2.4, style='D')
            self.line(cx-r*0.4, cy, cx+r*0.1, cy+r*0.6)
            self.line(cx+r*0.1, cy+r*0.6, cx+r*0.8, cy-r*0.6)
            self.line(cx-r*0.6, cy-r*0.6, cx+r*0.2, cy-r*0.6)
            
        elif icon_type == "fluxo4":
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*1.2, cy-r*1.2, r*2.4, r*2.4, style='D')
            self.line(cx, cy, cx, cy-r*0.8)
            self.line(cx, cy, cx+r*0.5, cy+r*0.5)

        elif icon_type == "title_estrategia":
            self.rect(cx-r*0.8, cy-r*1.2, r*1.6, r*2.2, style='D')
            self.line(cx-r*0.4, cy-r*0.8, cx+r*0.4, cy-r*0.8)
            self.set_fill_color(248, 248, 248) 
            if hasattr(self, 'ellipse'):
                self.ellipse(cx+r*0.2, cy, r*1.2, r*1.2, style='FD')
                self.ellipse(cx+r*0.6, cy+r*0.4, r*0.4, r*0.4, style='D')

        elif icon_type == "title_fluxo":
            self.rect(cx-r, cy+r*0.2, r*0.5, r*0.8, style='D')
            self.rect(cx-r*0.3, cy-r*0.5, r*0.5, r*1.5, style='D')
            self.rect(cx+r*0.4, cy-r*1.2, r*0.5, r*2.2, style='D')
            self.line(cx-r, cy-r*0.2, cx+r*0.6, cy-r*1.2)
            self.line(cx+r*0.6, cy-r*1.2, cx+r*0.1, cy-r*1.2)
            self.line(cx+r*0.6, cy-r*1.2, cx+r*0.6, cy-r*0.7)
        elif icon_type == "recomendacao":
            # Hand holding a lightbulb
            if hasattr(self, 'ellipse'):
                self.ellipse(cx-r*0.6, cy-r*1.1, r*1.2, r*1.2, style='D')
            self.rect(cx-r*0.3, cy+r*0.1, r*0.6, r*0.3, style='D')
            self.line(cx-r*0.1, cy+r*0.4, cx+r*0.1, cy+r*0.4)
            # Rays
            self.line(cx, cy-r*1.3, cx, cy-r*1.6)
            self.line(cx-r*0.9, cy-r*0.5, cx-r*1.3, cy-r*0.5)
            self.line(cx+r*0.9, cy-r*0.5, cx+r*1.3, cy-r*0.5)
            self.line(cx-r*0.8, cy-r*1.0, cx-r*1.1, cy-r*1.3)
            self.line(cx+r*0.8, cy-r*1.0, cx+r*1.1, cy-r*1.3)
        self.set_line_width(0.2)
    def draw_circle_icon(self, x, y, icon_type="", radius=8):
        # Draw the Gold Circle Outline
        self.set_fill_color(*self.WHITE)
        self.set_draw_color(220, 190, 130)
        self.set_line_width(0.25)
        if hasattr(self, 'ellipse'):
            self.ellipse(x, y, radius*2, radius*2, style='D')
            
        # Draw clean and minimal geometry inside
        self.set_line_width(0.2)
        cx = x + radius
        cy = y + radius
        self.set_draw_color(201, 168, 76) # Gold inner
        
        if icon_type == "plano":
            # Document with checkmark
            self.rect(cx - 1.5, cy - 2, 3, 4, style='D')
            # Checkmark
            self.line(cx - 0.5, cy + 0.5, cx, cy + 1)
            self.line(cx, cy + 1, cx + 1, cy - 0.5)
            
        elif icon_type == "prazo":
            # Clean Calendar
            self.rect(cx - 2, cy - 1.5, 4, 3.5, style='D')
            self.line(cx - 2, cy - 0.5, cx + 2, cy - 0.5)
            self.line(cx - 1, cy - 2.5, cx - 1, cy - 1)
            self.line(cx + 1, cy - 2.5, cx + 1, cy - 1)
            
        elif icon_type == "estrategia":
            # Clean Target with arrow
            if hasattr(self, 'ellipse'):
                self.ellipse(cx - 2, cy - 2, 4, 4, style='D')
                self.ellipse(cx - 0.5, cy - 0.5, 1, 1, style='D')
            self.line(cx + 0.5, cy - 0.5, cx + 2.5, cy - 2.5)
            # Arrow head
            self.line(cx + 2.5, cy - 2.5, cx + 1.5, cy - 2.5)
            self.line(cx + 2.5, cy - 2.5, cx + 2.5, cy - 1.5)
            
        elif icon_type == "embutido":
            # Stack of 3 coins
            if hasattr(self, 'ellipse'):
                self.ellipse(cx - 2.5, cy + 1, 5, 2, style='D')
                self.ellipse(cx - 2.5, cy - 1, 5, 2, style='D')
                self.ellipse(cx - 2.5, cy - 3, 5, 2, style='D')
                
        elif icon_type == "proprio":
            # Hand dropping coin/leaf
            self.line(cx - 3, cy, cx, cy + 3)
            self.line(cx, cy + 3, cx + 3, cy)
            if hasattr(self, 'ellipse'):
                self.ellipse(cx - 1.5, cy - 2.5, 3, 3, style='D')
                
        elif icon_type == "fluxo1":
            # Play button
            self.polygon(((cx-1.5, cy-2.5), (cx+2.5, cy), (cx-1.5, cy+2.5)), style='D')
            
        elif icon_type == "fluxo2":
            # Hourglass
            self.polygon(((cx-2, cy-2.5), (cx+2, cy-2.5), (cx, cy), (cx-2, cy+2.5), (cx+2, cy+2.5)), style='D')
            
        elif icon_type == "fluxo3":
            # Checkmark
            self.line(cx - 2, cy + 0.5, cx - 0.5, cy + 2)
            self.line(cx - 0.5, cy + 2, cx + 2.5, cy - 2)
            
        elif icon_type == "fluxo4":
            # Flag
            self.line(cx - 1.5, cy + 3, cx - 1.5, cy - 3)
            self.polygon(((cx-1.5, cy-3), (cx+2.5, cy-1.5), (cx-1.5, cy)), style='D')
            
        self.set_line_width(0.2)

            
    def build_main_card(self):
        self.set_y(50)
        start_y = 50
        card_h = 35 # Reduced height
        card_w = 160
        card_x = 25
        
        # Draw the shadow effect (optional basic line or offset rect)
        self.set_fill_color(230, 230, 230)
        if hasattr(self, 'round_rect'):
            self.round_rect(card_x, start_y+1, card_w, card_h, 4, style='F')
            
        # Draw the main Gray Box
        self.set_fill_color(*self.LT_GRAY)
        if hasattr(self, 'round_rect'):
            self.round_rect(card_x, start_y, card_w, card_h, 4, style='F')
        else:
            self.rect(card_x, start_y, card_w, card_h, style='F') # Fallback
            
        # Draw the Slanted Gold overlay
        self.set_fill_color(*self.GOLD)
        self.set_draw_color(*self.GOLD)
        pts = (
            (card_x, start_y),             # Top Left
            (108, start_y),                # Top Right (starts slant)
            (98, start_y + card_h),        # Bottom Right
            (card_x, start_y + card_h)     # Bottom Left
        )
        self.polygon(pts, style='F')
        
        # Adjust font sizes and vertical centering to match image perfectly
        self.set_xy(card_x + 8, start_y + 5)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.DARK)
        self.cell(70, 4, 'CRÉDITO DISPONÍVEL')
        
        self.set_xy(card_x + 8, start_y + 9)
        self.set_font('Helvetica', '', 8)
        self.cell(70, 4, 'PARA AQUISIÇÃO')
        
        self.set_xy(card_x + 8, start_y + 16)
        self.set_font('Helvetica', 'B', 14)
        cred_liq = self.data.get('resultados', {}).get('credito_liquido', '0,00')
        self.cell(10, 10, 'R$')
        self.set_xy(card_x + 16, start_y + 15.5)
        self.set_font('Helvetica', 'B', 26)
        self.cell(60, 10, cred_liq)
        
        # Vertical Separators for the right side stats
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.3)
        self.line(133, start_y + 6, 133, start_y + 29)
        self.line(159, start_y + 6, 159, start_y + 29)
        
        # Right section stats: centers around 120, 146, 172
        cell_w = 38
        
        # Box 1: PLANO
        cx1 = 120
        self.draw_icon(cx1, start_y + 8.0, 'plano', 4.0, False)
        
        self.set_xy(cx1 - cell_w/2, start_y + 18)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(cell_w, 4, 'PLANO', align='C', new_x='LMARGIN', new_y='NEXT')
        
        self.set_xy(cx1 - cell_w/2, start_y + 22)
        self.set_font('Helvetica', 'B', 9) 
        self.set_text_color(*self.DARK)
        cred = self.data.get('credito', '0,00')
        self.cell(cell_w, 5, 'R$ ' + cred, align='C')
        
        # Box 2: PRAZO
        cx2 = 146
        self.draw_icon(cx2, start_y + 8.0, 'prazo', 4.0, False)
        
        prazo = self.data.get('prazo', '0')
        self.set_xy(cx2 - cell_w/2, start_y + 18)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(cell_w, 4, 'PRAZO', align='C')
        
        self.set_xy(cx2 - cell_w/2, start_y + 22)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(*self.DARK)
        self.cell(cell_w, 5, str(prazo), align='C')
        
        self.set_xy(cx2 - cell_w/2, start_y + 26.5)
        self.set_font('Helvetica', '', 6)
        self.set_text_color(150, 150, 150)
        self.cell(cell_w, 4, 'MESES', align='C')

        # Box 3: ESTRATÉGIA LANCE
        cx3 = 172
        self.draw_icon(cx3, start_y + 8.0, 'estrategia', 4.0, False)
        
        lance_pct = self.data.get('lances', {}).get('total_pct', '0')
        self.set_xy(cx3 - cell_w/2, start_y + 18)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(cell_w, 4, 'ESTRATÉGIA', align='C')
        
        self.set_xy(cx3 - cell_w/2, start_y + 22)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(*self.DARK)
        self.cell(cell_w, 5, f"{lance_pct}%", align='C')

        self.set_xy(cx3 - cell_w/2, start_y + 26.5)
        self.set_font('Helvetica', '', 6)
        self.set_text_color(150, 150, 150)
        self.cell(cell_w, 4, 'DE LANCE', align='C')

    def build_columns(self):
        start_y = 95
        
        # ----- COL 1: ESTRATÉGIA DE LANCE -----
        self.set_fill_color(*self.LT_GRAY)
        if hasattr(self, 'round_rect'):
            self.round_rect(25, start_y, 75, 90, 4, style='F') # Card Bg
        else:
            self.rect(25, start_y, 75, 90, style='F')
        
        self.draw_icon(35, start_y + 11, 'title_estrategia', 2.5, False)
        self.set_xy(40, start_y + 8)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*self.DARK)
        self.cell(45, 6, 'ESTRATÉGIA DE LANCE', align='L')
        
        # Lance Embutido Bubble
        bubble_y1 = start_y + 18
        self.set_fill_color(255, 255, 255)
        if hasattr(self, 'round_rect'):
            self.round_rect(30, bubble_y1, 65, 17, 3, style='F')
        else:
            self.rect(30, bubble_y1, 65, 17, style='F')
            
        self.draw_icon(39.0, bubble_y1 + 8.5, 'embutido', 3.5, True)
        
        self.set_xy(50, bubble_y1 + 4.5)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(40, 4, 'LANCE EMBUTIDO', align='L')
        
        self.set_xy(50, bubble_y1 + 8.5)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*self.DARK)
        emb_val = self.data.get('lances', {}).get('embutido_val', '0,00')
        self.cell(40, 5, 'R$ ' + emb_val, align='L')
        
        # Recurso Proprio Bubble
        bubble_y2 = bubble_y1 + 22
        self.set_fill_color(255, 255, 255)
        if hasattr(self, 'round_rect'):
            self.round_rect(30, bubble_y2, 65, 17, 3, style='F')
        else:
            self.rect(30, bubble_y2, 65, 17, style='F')
            
        self.draw_icon(39.0, bubble_y2 + 8.5, 'proprio', 3.5, True)
        
        self.set_xy(50, bubble_y2 + 4.5)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(150, 150, 150)
        self.cell(40, 4, 'RECURSO PRÓPRIO', align='L')
        
        self.set_xy(50, bubble_y2 + 8.5)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*self.DARK)
        prop_val = self.data.get('lances', {}).get('proprio_val', '0,00')
        self.cell(40, 5, 'R$ ' + prop_val, align='L')
        
        # Lance Total Dark Block
        block_y = bubble_y2 + 22
        self.set_fill_color(*self.DARK)
        if hasattr(self, 'round_rect'):
            self.round_rect(25, block_y, 75, 23, 4, style='F') 
        else:
            self.rect(25, block_y, 75, 23, style='F')
            
        self.set_fill_color(*self.GOLD)
        self.set_draw_color(*self.GOLD)
        pts_tot = (
            (75, block_y),
            (100, block_y),
            (100, block_y + 23),
            (65, block_y + 23)
        )
        self.polygon(pts_tot, style='F')
        
        self.set_xy(30, block_y + 8.5)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*self.GOLD)
        self.cell(40, 5, 'LANCE TOTAL', align='C')
        
        self.set_xy(70, block_y + 6)
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(*self.WHITE)
        tot_pct = self.data.get('lances', {}).get('total_pct', '0')
        self.cell(35, 10, f"{tot_pct}%", align='C')
        
        # ----- COL 2: FLUXO FINANCEIRO -----
        self.set_fill_color(*self.LT_GRAY)
        if hasattr(self, 'round_rect'):
            self.round_rect(110, start_y, 75, 100, 4, style='F') 
        else:
            self.rect(110, start_y, 75, 100, style='F')
        
        self.draw_icon(120, start_y + 11, 'title_fluxo', 2.5, False)
        self.set_xy(125, start_y + 8)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*self.DARK)
        self.cell(45, 6, 'FLUXO FINANCEIRO', align='L')
        
        # Items list
        res = self.data.get('resultados', {})
        items = [
            ("1A PARCELA (ENTRADA)", res.get('primeiras_val', '0,00'), "fluxo1"),
            ("PARCELAS ANTES DA CONTEMPLAÇÃO", res.get('demais_val', '0,00'), "fluxo2"),
            ("PARCELAS APÓS CONTEMPLAÇÃO", res.get('apos_contemplar_val', '0,00'), "fluxo3"),
            ("PRAZO RESTANTE", f"{res.get('prazo_restante', '0')} MESES", "fluxo4")
        ]
        
        y_cursor = start_y + 18
        
        for title, val, icon in items:
            self.set_fill_color(255, 255, 255)
            if hasattr(self, 'round_rect'):
                self.round_rect(115, y_cursor, 65, 16, 3, style='F')
            else:
                self.rect(115, y_cursor, 65, 16, style='F')
            
            # Professionally distinct icons centered horizontally/vertically in its left margin
            self.draw_icon(124.0, y_cursor + 8.0, icon, 3.5, True)
                
            # Title bounded rigidly using multi_cell to never overlap with value
            self.set_xy(132, y_cursor + 4)
            self.set_font('Helvetica', '', 6)
            self.set_text_color(150, 150, 150)
            self.multi_cell(22, 3, title, align='L')
                
            # Value forced to right margin 
            val_text = val if ('MESES' in val or 'R$' in val) else 'R$ ' + val
            self.set_xy(154, y_cursor + 5.5)
            self.set_font('Helvetica', 'B', 10)
            self.set_text_color(*self.DARK)
            self.cell(24, 5, val_text, align='R')
                
            y_cursor += 19

    def build_recommendation_card(self):
        start_y = 205
        
        self.set_fill_color(*self.LT_GRAY)
        if hasattr(self, 'round_rect'):
            self.round_rect(25, start_y, 160, 25, 4, style='F')
        else:
            self.rect(25, start_y, 160, 25, style='F')
            
        # Hand and Lightbulb Icon
        self.draw_icon(39, start_y + 13.5, 'recomendacao', 4.5, False)
        
        # Gold ribbon left
        self.set_fill_color(*self.GOLD)
        if hasattr(self, 'round_rect'):
            self.round_rect(25, start_y, 5, 25, 2, style='F')
        else:
            self.rect(25, start_y, 5, 25, style='F')
        
        self.set_xy(48, start_y + 4)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.DARK)
        self.cell(100, 4, 'ESTRATÉGIA RECOMENDADA PELA AURENN CAPITAL')

        # Horizontal gold separator line
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.2)
        self.line(48, start_y + 8.5, 175, start_y + 8.5)
        
        self.set_xy(48, start_y + 10)
        self.set_font('Helvetica', '', 10)
        cred = self.data.get('resultados', {}).get('credito_liquido', '0,00')
        msg = f"Com esta estrutura de lance, você acessa um crédito líquido de R$ {cred} mantendo parcelas estruturadas antes e após a contemplação, sem juros bancários."
        self.multi_cell(130, 4.5, msg)
        
    def build_observacoes_card(self):
        msg_obs = self.data.get('observacoes', '').strip()
        if not msg_obs:
            return  # Hide the entire observacoes block if empty
            
        start_y = 235
        
        self.set_fill_color(*self.LT_GRAY)
        if hasattr(self, 'round_rect'):
            self.round_rect(25, start_y, 160, 35, 4, style='F')
        else:
            self.rect(25, start_y, 160, 35, style='F')
            
        # Gold ribbon left
        self.set_fill_color(*self.DARK) # Dark ribbon for observacoes to differentiate
        if hasattr(self, 'round_rect'):
            self.round_rect(25, start_y, 5, 35, 2, style='F')
        else:
            self.rect(25, start_y, 5, 35, style='F')
            
        self.set_xy(35, start_y + 5)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*self.DARK)
        self.cell(100, 5, 'OBSERVAÇÕES DOS ESPECIALISTAS')
        
        self.set_draw_color(200, 200, 200)
        self.line(35, start_y + 10, 180, start_y + 10)
        
        self.set_xy(35, start_y + 15)
        self.set_font('Helvetica', '', 10)
        self.multi_cell(145, 5, msg_obs)
        
    def build_footer(self):
        self.set_y(280)
        self.set_draw_color(*self.GOLD)
        self.set_line_width(0.5)
        self.line(25, 275, 185, 275)
        
        from datetime import datetime
        data_atual = datetime.now().strftime("%d/%m/%Y")
        
        self.set_y(278)
        self.set_font('Helvetica', '', 7)
        self.set_text_color(120, 120, 120)
        
        # Left side: Date
        self.set_x(25)
        self.cell(40, 5, f"Data da simulação: {data_atual}", align='L')
        
        # Center: Main Slogan
        self.set_x(65)
        self.cell(80, 5, 'SEGURANÇA   .   PLANEJAMENTO   .   INTELIGÊNCIA   .   PATRIMONIAL', align='C')
        
        # Right Side: Company Name
        self.set_x(145)
        self.cell(40, 5, "AURENN CAPITAL", align='R')

    def build(self):
        self.build_header()
        self.build_main_card()
        self.build_columns()
        self.build_recommendation_card()
        self.build_observacoes_card()
        self.build_footer()
        return self.output()


# ────────────────────────────────────────
# HTTP Handler
# ────────────────────────────────────────
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == '/gerar-pdf-comparativo':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                data = json.loads(body)

                pdf = ComparativoPDF(data)
                pdf_bytes = pdf.build()

                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', 'attachment; filename="Comparativo_Financiamento_vs_Consorcio.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(pdf_bytes)
            except Exception as e:
                import traceback
                traceback.print_exc()
                err = json.dumps({'error': str(e)}).encode()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err)))
                self.end_headers()
                self.wfile.write(err)
                
        elif path == '/gerar-pdf-simulador':
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                data = json.loads(body)

                pdf = SimuladorEstrategicoPDF(data)
                pdf_bytes = pdf.build()

                self.send_response(200)
                self.send_header('Content-Type', 'application/pdf')
                self.send_header('Content-Disposition', 'attachment; filename="Simulacao_Estrategica_Consorcio.pdf"')
                self.send_header('Content-Length', str(len(pdf_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(pdf_bytes)
            except Exception as e:
                import traceback
                traceback.print_exc()
                err = json.dumps({'error': str(e)}).encode()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(err)))
                self.end_headers()
                self.wfile.write(err)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    print(f'Servidor rodando em http://localhost:{PORT}')
    print('  - Arquivos estáticos: servidos normalmente')
    print('  - POST /gerar-pdf-comparativo: gera PDF')
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        srv.serve_forever()
