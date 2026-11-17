import datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.properties import PageSetupProperties

OUT="/home/hrm4k3r/Documentos/Organização/Planejamento Redes Sociais.xlsx"
meta={"Atacadão Ferrosul":2,"Lavanderia Mundial":4,"Blessed Lavanderia":4,"Gula Gula Pizzaria":3,"Espetinho da Vila":3,"Paradise Sup & Surf":4,"Restaurante Na Cozinha":4,"Rixxer (minha conta)":2}
clients=list(meta)
contas={"Atacadão Ferrosul":["Instagram","Google Meu Negócio"],"Lavanderia Mundial":["Facebook","Instagram","TikTok","YouTube","Google Meu Negócio","Pinterest"],"Blessed Lavanderia":["Facebook","Instagram"],"Gula Gula Pizzaria":["Instagram"],"Espetinho da Vila":["Instagram","Google Meu Negócio"],"Paradise Sup & Surf":["Instagram","TikTok","YouTube","Google Meu Negócio"],"Restaurante Na Cozinha":["Instagram"],"Rixxer (minha conta)":["Facebook","Instagram","TikTok","YouTube","Pinterest","Google Meu Negócio"]}
redes=["Instagram","Facebook","TikTok","YouTube","Pinterest","Google Meu Negócio"]
status=["Postado","Agendado","Planejado","Não postado"]
formatos=["Reels","Feed (imagem)","Carrossel","Stories","Vídeo longo","Texto/Legenda","Outro"]
pilares=["Produto/Serviço","Promoção/Oferta","Bastidores","Prova social/Depoimento","Educativo/Dica","Institucional","Data comemorativa","Engajamento/Enquete"]
start=dt.date(2026,11,16)
WEEKS=8; LOG0,LOGN=6,1000; W0,WN=5,400
NAVY="1F2A44"; ACC="E8590C"; GREY="F1F3F5"; LINE="D0D5DB"
F=lambda **k: Font(name="Arial",size=k.pop("size",10),**k)
hfill=PatternFill("solid",fgColor=NAVY); gfill=PatternFill("solid",fgColor=GREY); yfill=PatternFill("solid",fgColor="FFF9DB")
thin=Side(style="thin",color=LINE); box=Border(left=thin,right=thin,top=thin,bottom=thin)
def header(ws,row,labels):
    for i,t in enumerate(labels,1):
        c=ws.cell(row,i,t); c.font=F(bold=True,color="FFFFFF"); c.fill=hfill
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True); c.border=box
def title(ws,t,sub):
    ws["A1"]=t; ws["A1"].font=F(size=16,bold=True,color=NAVY)
    ws["A2"]=sub; ws["A2"].font=F(italic=True,color="6B7280")
def dyn(col): return f"=OFFSET(Listas!${col}$2,0,0,COUNTA(Listas!${col}$2:${col}$40),1)"

wb=Workbook()
hu=wb.active; hu.title="Como usar"
pa=wb.create_sheet("Painel"); rp=wb.create_sheet("Relatório do cliente"); lg=wb.create_sheet("Postagens"); sm=wb.create_sheet("Semanal"); rs=wb.create_sheet("Resultados dos posts"); li=wb.create_sheet("Listas")

# ---- Listas: A cliente, B meta, C redes, D status, E formatos, F pilares, H semanas
for j,(h,vals) in {1:("Clientes",clients),3:("Redes",redes),4:("Status",status),5:("Formatos",formatos),6:("Pilares",pilares)}.items():
    li.cell(1,j,h)
    for i,v in enumerate(vals,2): li.cell(i,j,v).font=F()
li.cell(1,2,"Meta de posts por semana")
for i,c in enumerate(clients,2):
    li.cell(i,2,meta[c]); li.cell(i,2).font=F(color="0000FF",bold=True); li.cell(i,2).fill=yfill; li.cell(i,2).alignment=Alignment(horizontal="center")
li.cell(1,8,"Semanas (segunda)")
for j in (1,2,3,4,5,6,8): c=li.cell(1,j); c.font=F(bold=True,color="FFFFFF"); c.fill=hfill; c.alignment=Alignment(wrap_text=True,vertical="center")
for j,w in {1:28,2:16,3:22,4:16,5:20,6:26,7:3,8:18}.items(): li.column_dimensions[L(j)].width=w
li["H2"]=start
for i in range(3,54): li.cell(i,8,f"=H{i-1}+7")
for i in range(2,54): li.cell(i,8).number_format="dd/mm/yyyy"; li.cell(i,8).font=F()
li["J1"]="Meta de posts por semana (coluna B, amarela): valor informado por você em 17/11/2026. Para mudar a meta de um cliente, edite a célula — o Painel e a aba Semanal se ajustam sozinhos."
li["J1"].font=F(italic=True,color="6B7280")

# ---- Postagens: A data B dia C semana D cliente E status F formato G pilar H..M redes N descr O link P obs
title(lg,"Registro de postagens","UMA LINHA POR POST (não por rede). Marque com X em quais redes o post foi publicado. A meta semanal de cada cliente fica na aba Listas.")
rc=[8+i for i in range(len(redes))]  # H..M
header(lg,5,["Data","Dia","Semana (seg)","Cliente","Status","Formato","Pilar / Tema"]+redes+["O que foi postado (resumo)","Link da postagem","Observações / resultado rápido","Chave (auto)"])
lg.row_dimensions[5].height=42
for i,w in enumerate([12,7,12,24,13,16,22,11,11,11,11,11,13,48,30,36,16],1): lg.column_dimensions[L(i)].width=w
for r in range(LOG0,LOGN+1):
    lg.cell(r,2,f'=IF(A{r}="","",CHOOSE(WEEKDAY(A{r},2),"Seg","Ter","Qua","Qui","Sex","Sáb","Dom"))')
    lg.cell(r,3,f'=IF(A{r}="","",A{r}-WEEKDAY(A{r},2)+1)')
    for col in range(1,17):
        c=lg.cell(r,col); c.font=F(); c.border=box
        c.alignment=Alignment(vertical="center",wrap_text=col in (14,15,16),horizontal="center" if col<=3 or col==5 or 8<=col<=13 else "left")
    lg.cell(r,1).number_format="dd/mm/yyyy"; lg.cell(r,3).number_format="dd/mm"
    for col in (2,3): lg.cell(r,col).fill=gfill
for r in range(LOG0,LOGN+1):
    lg.cell(r,17,f'=IF(OR(A{r}="",D{r}=""),"",A{r}&"|"&D{r}&"|"&COUNTIFS($A${LOG0}:A{r},A{r},$D${LOG0}:D{r},D{r}))')
    c=lg.cell(r,17); c.font=F(size=8,color="9CA3AF"); c.fill=gfill; c.border=box
lg.freeze_panes="E6"; lg.auto_filter.ref=f"A5:Q{LOGN}"
for col,rg in (("D","A"),("E","D"),("F","E"),("G","F")):
    dv=DataValidation(type="list",formula1=dyn(rg),allow_blank=True,showErrorMessage=False); lg.add_data_validation(dv); dv.add(f"{col}{LOG0}:{col}{LOGN}")
dvx=DataValidation(type="list",formula1='"X"',allow_blank=True,showErrorMessage=False); lg.add_data_validation(dvx); dvx.add(f"H{LOG0}:M{LOGN}")
dvd=DataValidation(type="date",operator="greaterThan",formula1="36526",allow_blank=True,showErrorMessage=True,error="Digite uma data válida (dd/mm/aaaa)"); lg.add_data_validation(dvd); dvd.add(f"A{LOG0}:A{LOGN}")
rng=f"E{LOG0}:E{LOGN}"
for val,bg,fg in (("Postado","C6EFCE","006100"),("Não postado","FFC7CE","9C0006"),("Agendado","FFEB9C","7F6000"),("Planejado","DBEAFE","1E40AF")):
    lg.conditional_formatting.add(rng,CellIsRule(operator="equal",formula=[f'"{val}"'],fill=PatternFill("solid",bgColor=bg),font=Font(name="Arial",color=fg,bold=True)))
lg.conditional_formatting.add(f"H{LOG0}:M{LOGN}",CellIsRule(operator="equal",formula=['"X"'],fill=PatternFill("solid",bgColor="C6EFCE"),font=Font(name="Arial",color="006100",bold=True)))
lg.conditional_formatting.add(f"D{LOG0}:D{LOGN}",FormulaRule(formula=[f'LEFT($D{LOG0},6)="Rixxer"'],font=Font(name="Arial",bold=True,color=ACC)))

# ---- Semanal
title(sm,"Métricas semanais (preencher todo domingo)","Uma linha por conta (cliente + rede) por semana. Amarelo = você preenche. Cinza = calculado. Números vêm do Insights de cada rede (últimos 7 dias).")
header(sm,4,["Semana (seg)","Domingo","Cliente","Rede","Seguidores (total no domingo)","Novos seguidores","Visualizações","Alcance (contas)","Interações (curtidas+coment.+salv.+compart.)","Cliques / visitas ao perfil","Posts feitos nesta rede","Meta do cliente (posts/sem.)","% da meta","Taxa de engajamento","Melhor post da semana (automático)","Aprendizado / ação p/ próxima semana"])
sm.row_dimensions[4].height=54
for i,w in enumerate([12,12,24,18,16,13,14,14,18,16,13,13,11,13,32,40],1): sm.column_dimensions[L(i)].width=w
r=W0
for w in range(WEEKS):
    for c in clients:
        for rd in contas[c]:
            sm.cell(r,1,start+dt.timedelta(days=7*w)); sm.cell(r,3,c); sm.cell(r,4,rd); r+=1
rl=lambda col:f"Postagens!${col}${LOG0}:${col}${LOGN}"
for r in range(W0,WN+1):
    sm.cell(r,2,f'=IF(A{r}="","",A{r}+6)')
    prev=f'SUMIFS($E${W0}:$E${WN},$A${W0}:$A${WN},A{r}-7,$C${W0}:$C${WN},C{r},$D${W0}:$D${WN},D{r})'
    sm.cell(r,6,f'=IF(OR(E{r}="",A{r}=""),"",IF({prev}=0,"",E{r}-{prev}))')
    sm.cell(r,11,f'=IF(A{r}="","",IFERROR(COUNTIFS({rl("D")},C{r},{rl("C")},A{r},{rl("E")},"Postado",INDEX(Postagens!$H${LOG0}:$M${LOGN},0,MATCH(D{r},Postagens!$H$5:$M$5,0)),"X"),0))')
    sm.cell(r,12,f'=IF(A{r}="","",IFERROR(INDEX(Listas!$B$2:$B$40,MATCH(C{r},Listas!$A$2:$A$40,0)),""))')
    sm.cell(r,13,f'=IF(OR(A{r}="",L{r}="",L{r}=0),"",K{r}/L{r})')
    sm.cell(r,14,f'=IF(OR(H{r}="",H{r}=0,I{r}=""),"",I{r}/H{r})')
    sm.cell(r,15,f'=IF(A{r}="","",IFERROR(INDEX(\'Resultados dos posts\'!$H$5:$H$504,MATCH(A{r}&"|"&C{r}&"|"&D{r}&"|1",\'Resultados dos posts\'!$U$5:$U$504,0)),""))')
    for col in range(1,17):
        c=sm.cell(r,col); c.font=F(); c.border=box
        c.alignment=Alignment(vertical="center",wrap_text=col in (15,16),horizontal="center" if col<15 else "left")
        if col in (2,6,11,12,13,14,15): c.fill=gfill
        elif col in (5,7,8,9,10,16): c.fill=yfill
    sm.cell(r,1).number_format="dd/mm/yyyy"; sm.cell(r,2).number_format="dd/mm/yyyy"
    for col in (5,6,7,8,9,10): sm.cell(r,col).number_format="#,##0;-#,##0;0"
    sm.cell(r,13).number_format="0%"; sm.cell(r,14).number_format="0.0%"
sm.freeze_panes="E5"; sm.auto_filter.ref=f"A4:P{WN}"
for col,rg in (("C","A"),("D","C")):
    dv=DataValidation(type="list",formula1=dyn(rg),allow_blank=True,showErrorMessage=False); sm.add_data_validation(dv); dv.add(f"{col}{W0}:{col}{WN}")
dvn=DataValidation(type="decimal",operator="greaterThanOrEqual",formula1="0",allow_blank=True,showErrorMessage=True,error="Digite apenas números (sem texto)."); sm.add_data_validation(dvn); dvn.add(f"E{W0}:E{WN}"); dvn.add(f"G{W0}:J{WN}")
sm.conditional_formatting.add(f"M{W0}:M{WN}",FormulaRule(formula=[f'AND(ISNUMBER(M{W0}),M{W0}<0.7)'],fill=PatternFill("solid",bgColor="FFC7CE")))
sm.conditional_formatting.add(f"M{W0}:M{WN}",FormulaRule(formula=[f'AND(ISNUMBER(M{W0}),M{W0}>=1)'],fill=PatternFill("solid",bgColor="C6EFCE")))
sm.conditional_formatting.add(f"F{W0}:F{WN}",CellIsRule(operator="lessThan",formula=["0"],font=Font(name="Arial",color="C00000",bold=True)))
sm.conditional_formatting.add(f"F{W0}:F{WN}",CellIsRule(operator="greaterThan",formula=["0"],font=Font(name="Arial",color="2B8A3E",bold=True)))
sm.conditional_formatting.add(f"C{W0}:C{WN}",FormulaRule(formula=[f'LEFT($C{W0},6)="Rixxer"'],font=Font(name="Arial",bold=True,color=ACC)))

# ---- Painel
title(pa,"Painel de controle — Redes sociais","Escolha a semana na célula amarela. Tudo abaixo se atualiza sozinho a partir de 'Postagens' e 'Semanal'.")
pa["A4"]="Semana (início na segunda):"; pa["A4"].font=F(bold=True)
pa["B4"]=start; pa["B4"].number_format="dd/mm/yyyy"; pa["B4"].fill=PatternFill("solid",fgColor="FFF3BF"); pa["B4"].font=F(bold=True,size=12); pa["B4"].border=box; pa["B4"].alignment=Alignment(horizontal="center")
dv=DataValidation(type="list",formula1="=Listas!$H$2:$H$53",allow_blank=False); pa.add_data_validation(dv); dv.add("B4")
pa["C4"]="até domingo:"; pa["C4"].font=F(); pa["C4"].alignment=Alignment(horizontal="right")
pa["D4"]="=B4+6"; pa["D4"].number_format="dd/mm/yyyy"; pa["D4"].font=F(bold=True); pa["D4"].alignment=Alignment(horizontal="center")
pa["F4"]="Faltam na semana:"; pa["F4"].font=F(bold=True); pa["F4"].alignment=Alignment(horizontal="right")
pa["H4"]="posts para bater a meta de todos"; pa["H4"].font=F(italic=True,color="6B7280")
header(pa,6,["Cliente","Meta da semana (posts)","Posts feitos","% da meta","Seguidores","Novos seguidores","Visualizações","Δ visualizações vs sem. anterior","Alcance","Interações","Taxa de engajamento"]); pa.row_dimensions[6].height=48
for i,w in enumerate([26,13,11,14,13,14,15,17,12,12,14],1): pa.column_dimensions[L(i)].width=w
sw=lambda col:f"Semanal!${col}${W0}:${col}${WN}"
for k in range(len(clients)):
    r=7+k
    pa.cell(r,1,f"=Listas!A{k+2}"); pa.cell(r,2,f"=Listas!B{k+2}")
    pa.cell(r,3,f'=COUNTIFS({rl("C")},$B$4,{rl("D")},$A{r},{rl("E")},"Postado")')
    pa.cell(r,4,f'=IF(B{r}=0,"",C{r}/B{r})')
    for col,sc in ((5,"E"),(6,"F"),(7,"G"),(9,"H"),(10,"I")):
        pa.cell(r,col,f'=SUMIFS({sw(sc)},{sw("A")},$B$4,{sw("C")},$A{r})')
    pa.cell(r,8,f'=IF(SUMIFS({sw("G")},{sw("A")},$B$4-7,{sw("C")},$A{r})=0,"",G{r}/SUMIFS({sw("G")},{sw("A")},$B$4-7,{sw("C")},$A{r})-1)')
    pa.cell(r,11,f'=IF(I{r}=0,"",J{r}/I{r})')
rt=7+len(clients)
pa.cell(rt,1,"TOTAL")
for col in (2,3,5,6,7,9,10): pa.cell(rt,col,f"=SUM({L(col)}7:{L(col)}{rt-1})")
pa.cell(rt,4,f'=IF(B{rt}=0,"",C{rt}/B{rt})')
pa.cell(rt,8,f'=IF(SUMIFS({sw("G")},{sw("A")},$B$4-7)=0,"",G{rt}/SUMIFS({sw("G")},{sw("A")},$B$4-7)-1)')
pa.cell(rt,11,f'=IF(I{rt}=0,"",J{rt}/I{rt})')
pa["G4"]=f"=MAX(0,B{rt}-C{rt})"; pa["G4"].font=F(bold=True,size=12,color=ACC); pa["G4"].alignment=Alignment(horizontal="center")
for r in range(7,rt+1):
    for col in range(1,12):
        c=pa.cell(r,col); c.font=F(bold=(r==rt)); c.border=box
        c.alignment=Alignment(horizontal="left" if col==1 else "center",vertical="center")
        if r==rt: c.fill=PatternFill("solid",fgColor="DDE3EE")
    for col in (5,6,7,9,10): pa.cell(r,col).number_format="#,##0;-#,##0;0"
    pa.cell(r,4).number_format="0%"; pa.cell(r,8).number_format="+0%;-0%;0%"; pa.cell(r,11).number_format="0.0%"
pa.cell(rt-1,1).font=F(bold=True,color=ACC)
d=f"D7:D{rt-1}"
pa.conditional_formatting.add(d,FormulaRule(formula=['AND(ISNUMBER(D7),D7<0.7)'],fill=PatternFill("solid",bgColor="FFC7CE")))
pa.conditional_formatting.add(d,FormulaRule(formula=['AND(ISNUMBER(D7),D7>=0.7,D7<1)'],fill=PatternFill("solid",bgColor="FFEB9C")))
pa.conditional_formatting.add(d,FormulaRule(formula=['AND(ISNUMBER(D7),D7>=1)'],fill=PatternFill("solid",bgColor="C6EFCE")))
pa.conditional_formatting.add(f"F7:F{rt}",CellIsRule(operator="lessThan",formula=["0"],font=Font(name="Arial",color="C00000",bold=True)))
pa.conditional_formatting.add(f"H7:H{rt}",FormulaRule(formula=['AND(ISNUMBER(H7),H7<0)'],font=Font(name="Arial",color="C00000",bold=True)))
pa.conditional_formatting.add(f"H7:H{rt}",FormulaRule(formula=['AND(ISNUMBER(H7),H7>0)'],font=Font(name="Arial",color="2B8A3E",bold=True)))
h=rt+2
pa.cell(h,1,"Destaques da semana").font=F(bold=True,size=12,color=NAVY)
def best(label,col,row):
    pa.cell(row,1,label).font=F(bold=True); rg=f"{col}7:{col}{rt-1}"
    pa.cell(row,2,f'=IF(MAX({rg})<=0,"— sem dados —",INDEX($A$7:$A${rt-1},MATCH(MAX({rg}),{rg},0)))').font=F()
best("Mais visualizações:","G",h+1); best("Mais alcance:","I",h+2); best("Mais seguidores novos:","F",h+3)
pa.cell(h+4,1,"Abaixo de 70% da meta:").font=F(bold=True)
pa.cell(h+4,2,f'=COUNTIFS(D7:D{rt-1},"<0.7")&" cliente(s) — veja a coluna % da meta"').font=F()
def mk(ttl,c1,c2,anchor):
    ch=BarChart(); ch.type="col"; ch.title=ttl; ch.style=10; ch.roundedCorners=False
    ch.add_data(Reference(pa,min_col=c1,max_col=c2,min_row=6,max_row=rt-1),titles_from_data=True)
    ch.set_categories(Reference(pa,min_col=1,min_row=7,max_row=rt-1))
    ch.legend.position="b"; ch.legend.overlay=False; ch.title.overlay=False
    ch.x_axis.delete=False; ch.y_axis.delete=False; ch.height=8.5; ch.width=17
    pa.add_chart(ch,anchor)
mk("Meta x posts feitos",2,3,f"A{h+6}"); mk("Visualizações por cliente",7,7,f"F{h+6}")
pa.sheet_view.showGridLines=False; pa.freeze_panes="A7"

# ---- Como usar
hu.sheet_view.showGridLines=False
hu.column_dimensions["A"].width=4; hu.column_dimensions["B"].width=30; hu.column_dimensions["C"].width=95
hu["B1"]="Planejamento de Redes Sociais"; hu["B1"].font=F(size=18,bold=True,color=NAVY)
hu["B2"]="Controle de postagens + fechamento semanal de métricas — 7 clientes e a Rixxer"; hu["B2"].font=F(italic=True,color="6B7280")
rows=[
("METAS SEMANAIS (já configuradas)",None),
("Posts por semana, por cliente","Ferrosul 2 · Lavanderia Mundial 4 · Blessed 4 · Gula Gula 3 · Espetinho da Vila 3 · Paradise 4 · Na Cozinha 4 · Rixxer 2. A meta é de posts (conteúdos), não de redes: um post publicado em várias redes conta 1 vez. Para alterar, edite a coluna amarela na aba Listas."),
("ROTINA DIÁRIA (2 min)",None),
("1. Abra a aba Postagens","Cada post publicado vira UMA linha: data, cliente, status (Postado, Agendado, Planejado, Não postado), formato, tema."),
("2. Marque as redes","Coloque X nas colunas das redes em que o post saiu (Instagram, Facebook, TikTok, YouTube, Pinterest, Google Meu Negócio). Só o status 'Postado' conta para a meta."),
("3. Descreva","Resumo do que foi postado, link e uma observação rápida."),
("ROTINA DE DOMINGO (10–15 min)",None),
("4. Abra a aba Semanal","Para cada conta (cliente + rede), preencha as células amarelas com o Insights dos últimos 7 dias: seguidores totais, visualizações, alcance, interações e cliques."),
("5. Fechamento estratégico","Escreva o melhor post da semana e UMA ação para a próxima. É esse campo que transforma número em decisão."),
("6. Veja o Painel","Selecione a semana na célula amarela: meta x feito, crescimento, comparação com a semana anterior e destaques."),
("RESULTADO DE CADA POST (domingo)",None),
("Aba 'Resultados dos posts'","Para cada post, uma linha por rede: informe Data, Cliente, Rede (e 'Post do dia' só se houver 2+ posts do mesmo cliente no mesmo dia). Formato, tema e resumo aparecem sozinhos, buscados em Postagens. Depois digite visualizações, alcance, curtidas, comentários, compartilhamentos, salvamentos e cliques."),
("Ranking e veredito","O ranking compara os posts da mesma conta (cliente + rede) na semana pela taxa de engajamento. O veredito compara cada post com a média da conta: Repetir (20% ou mais acima), Adaptar (20% ou mais abaixo) ou Na média. Precisa de 3 posts na conta para opinar."),
("Melhor post na aba Semanal","A coluna 'Melhor post da semana' é preenchida automaticamente com o post nº 1 do ranking. Use para montar o relatório de segunda-feira."),
("RELATÓRIO PARA O CLIENTE (segunda-feira)",None),
("Aba 'Relatório do cliente'","Escolha o cliente e a semana nas células amarelas do topo. A aba monta sozinha: meta de posts, números por rede (com variação contra a semana anterior), top 3 posts, post para adaptar e os blocos de comentário. Escreva o comentário e os próximos passos nas caixas amarelas."),
("Como enviar","A aba já está ajustada para imprimir em uma página A4. Para mandar ao cliente, use Arquivo > Exportar como PDF (ou Imprimir > PDF) com essa aba selecionada."),
("FINANCEIRO (última aba)",None),
("Cadastro","Preencha o valor mensal e o dia de vencimento de cada cliente (amarelo). A Rixxer não entra por ser conta própria."),
("Controle mensal","Quando o cliente pagar, informe a data e o valor pago na linha do mês. Situação: Pago, Pago com atraso, Parcial, A vencer ou Atrasado — e o topo mostra quem está Adimplente ou INADIMPLENTE."),
("LEGENDA DE CORES",None),
("Amarelo claro","Células que você preenche (métricas semanais e metas)."),
("Cinza","Calculado automaticamente — não digite aqui."),
("Verde / Amarelo / Vermelho","Cumprimento da meta: ≥100% / 70–99% / abaixo de 70%."),
("COMO LER OS NÚMEROS",None),
("% da meta","Posts com status 'Postado' na semana ÷ meta semanal do cliente."),
("Taxa de engajamento","Interações ÷ alcance. Compare a conta com ela mesma semana a semana, não com outras."),
("Δ visualizações / Novos seguidores","Comparam com a semana anterior; aparecem a partir da 2ª semana preenchida."),
("EXEMPLO DE PREENCHIMENTO (ilustrativo, não é dado real)",None),
("Postagens","16/11/2026 | Seg | Lavanderia Mundial | Postado | Reels | Educativo/Dica | X em Instagram, TikTok e YouTube | 'Como tirar mancha de vinho' | link"),
("Semanal","Semana 16/11 | Lavanderia Mundial | Instagram | Seguidores 3.450 | Visualizações 12.800 | Alcance 5.200 | Interações 410 | Cliques 38"),
("DICA DE ESTRATÉGIA",None),
("Olhe a tendência","Uma semana isolada engana. Foque em 3–4 semanas: quem cresce, quem estagnou, qual formato/tema traz mais resultado — e repita o que funciona."),
]
r=4
for a,b in rows:
    if b is None:
        r+=1; c=hu.cell(r,2,a); c.font=F(bold=True,color="FFFFFF"); c.fill=hfill; hu.cell(r,3).fill=hfill
    else:
        hu.cell(r,2,a).font=F(bold=True); hu.cell(r,2).alignment=Alignment(vertical="top",wrap_text=True)
        c=hu.cell(r,3,b); c.font=F(); c.alignment=Alignment(wrap_text=True,vertical="top")
        if a=="Amarelo claro": hu.cell(r,2).fill=yfill
        if a=="Cinza": hu.cell(r,2).fill=gfill
    r+=1

# ---- Resultados dos posts
R0,RN=5,504
title(rs,"Resultado de cada post (preencher no domingo)","Uma linha por post por rede. Informe Data, Cliente, Rede (e o nº do post no dia, se houver mais de um). Formato, tema e resumo vêm de 'Postagens'. Depois digite os números do Insights.")
header(rs,4,["Data do post","Cliente","Post do dia (1, 2…)","Rede","Semana (seg)","Formato","Tema","O que foi postado","Visualizações","Alcance","Curtidas","Comentários","Compartilhamentos","Salvamentos","Cliques","Interações","Taxa de engajamento","Ranking na semana","Veredito","Alerta","Chave (auto)","Linha (auto)","Rank cliente (todas as redes)","Chave top (auto)","Rank pior (auto)","Chave pior (auto)"])
rs.row_dimensions[4].height=48
for i,w in enumerate([12,24,11,18,12,15,20,38,13,11,10,12,15,12,10,11,13,11,14,28,14,10,12,14,10,14],1): rs.column_dimensions[L(i)].width=w
pc=lambda col:f"Postagens!${col}${LOG0}:${col}${LOGN}"
for r in range(R0,RN+1):
    rs.cell(r,22,f'=IF(OR(A{r}="",B{r}=""),"",IFERROR(MATCH(A{r}&"|"&B{r}&"|"&IF(C{r}="",1,C{r}),{pc("Q")},0),""))')
    rs.cell(r,5,f'=IF(A{r}="","",A{r}-WEEKDAY(A{r},2)+1)')
    rs.cell(r,6,f'=IF(V{r}="","",IF(INDEX({pc("F")},V{r})="","",INDEX({pc("F")},V{r})))')
    rs.cell(r,7,f'=IF(V{r}="","",IF(INDEX({pc("G")},V{r})="","",INDEX({pc("G")},V{r})))')
    rs.cell(r,8,f'=IF(V{r}="","",IF(INDEX({pc("N")},V{r})="","",INDEX({pc("N")},V{r})))')
    rs.cell(r,16,f'=IF(COUNT(K{r}:N{r})=0,"",SUM(K{r}:N{r}))')
    rs.cell(r,17,f'=IF(OR(P{r}="",N(J{r})=0),"",P{r}/J{r})')
    rs.cell(r,18,f'=IF(Q{r}="","",COUNTIFS($E${R0}:$E${RN},E{r},$B${R0}:$B${RN},B{r},$D${R0}:$D${RN},D{r},$Q${R0}:$Q${RN},">"&Q{r})+1)')
    cnt=f'COUNTIFS($B${R0}:$B${RN},B{r},$D${R0}:$D${RN},D{r},$Q${R0}:$Q${RN},">=0")'
    avg=f'AVERAGEIFS($Q${R0}:$Q${RN},$B${R0}:$B${RN},B{r},$D${R0}:$D${RN},D{r})'
    rs.cell(r,19,f'=IF(Q{r}="","",IF({cnt}<3,"Poucos dados",IF(Q{r}>=1.2*{avg},"Repetir",IF(Q{r}<=0.8*{avg},"Adaptar","Na média"))))')
    rs.cell(r,20,f'=IF(OR(A{r}="",B{r}="",D{r}=""),"",IF(V{r}="","Post não encontrado em Postagens",IFERROR(IF(INDEX(Postagens!$H${LOG0}:$M${LOGN},V{r},MATCH(D{r},Postagens!$H$5:$M$5,0))="X","","Rede não marcada nesse post"),"")))')
    rs.cell(r,21,f'=IF(OR(R{r}="",A{r}=""),"",E{r}&"|"&B{r}&"|"&D{r}&"|"&R{r})')
    rs.cell(r,23,f'=IF(Q{r}="","",COUNTIFS($E${R0}:$E${RN},E{r},$B${R0}:$B${RN},B{r},$Q${R0}:$Q${RN},">"&Q{r})+COUNTIFS($E${R0}:E{r},E{r},$B${R0}:B{r},B{r},$Q${R0}:Q{r},Q{r}))')
    rs.cell(r,24,f'=IF(W{r}="","",E{r}&"|"&B{r}&"|"&W{r})')
    rs.cell(r,25,f'=IF(Q{r}="","",COUNTIFS($E${R0}:$E${RN},E{r},$B${R0}:$B${RN},B{r},$Q${R0}:$Q${RN},"<"&Q{r})+COUNTIFS($E${R0}:E{r},E{r},$B${R0}:B{r},B{r},$Q${R0}:Q{r},Q{r}))')
    rs.cell(r,26,f'=IF(Y{r}="","",E{r}&"|"&B{r}&"|P"&Y{r})')
    for col in range(1,27):
        c=rs.cell(r,col); c.font=F(size=8 if col>=21 else 10,color="9CA3AF" if col>=21 else "000000"); c.border=box
        c.alignment=Alignment(vertical="center",wrap_text=col in (8,20),horizontal="left" if col in (2,4,6,7,8,20) else "center")
        if col in (5,6,7,8,16,17,18,19,20,21,22,23,24,25,26): c.fill=gfill
        elif col in (9,10,11,12,13,14,15): c.fill=yfill
    rs.cell(r,1).number_format="dd/mm/yyyy"; rs.cell(r,5).number_format="dd/mm"; rs.cell(r,17).number_format="0.0%"
    for col in (9,10,11,12,13,14,15,16): rs.cell(r,col).number_format="#,##0"
for col,rg in (("B","A"),("D","C")):
    dv=DataValidation(type="list",formula1=dyn(rg),allow_blank=True,showErrorMessage=False); rs.add_data_validation(dv); dv.add(f"{col}{R0}:{col}{RN}")
dvr=DataValidation(type="decimal",operator="greaterThanOrEqual",formula1="0",allow_blank=True,showErrorMessage=True,error="Digite apenas números."); rs.add_data_validation(dvr); dvr.add(f"I{R0}:O{RN}")
dvr2=DataValidation(type="whole",operator="greaterThanOrEqual",formula1="1",allow_blank=True,showErrorMessage=True,error="Digite 1, 2, 3…"); rs.add_data_validation(dvr2); dvr2.add(f"C{R0}:C{RN}")
dvr3=DataValidation(type="date",operator="greaterThan",formula1="36526",allow_blank=True,showErrorMessage=True,error="Digite uma data válida (dd/mm/aaaa)"); rs.add_data_validation(dvr3); dvr3.add(f"A{R0}:A{RN}")
for val,bg,fg in (("Repetir","C6EFCE","006100"),("Adaptar","FFC7CE","9C0006"),("Na média","E5E7EB","374151"),("Poucos dados","FFF9DB","7F6000")):
    rs.conditional_formatting.add(f"S{R0}:S{RN}",CellIsRule(operator="equal",formula=[f'"{val}"'],fill=PatternFill("solid",bgColor=bg),font=Font(name="Arial",color=fg,bold=True)))
rs.conditional_formatting.add(f"R{R0}:R{RN}",CellIsRule(operator="equal",formula=["1"],fill=PatternFill("solid",bgColor="C6EFCE"),font=Font(name="Arial",bold=True,color="006100")))
rs.conditional_formatting.add(f"T{R0}:T{RN}",FormulaRule(formula=[f'$T{R0}<>""'],font=Font(name="Arial",color="C00000",bold=True)))
rs.conditional_formatting.add(f"B{R0}:B{RN}",FormulaRule(formula=[f'LEFT($B{R0},6)="Rixxer"'],font=Font(name="Arial",bold=True,color=ACC)))
rs.freeze_panes="E5"; rs.auto_filter.ref=f"A4:Z{RN}"

# ---- Relatório do cliente
RS="'Resultados dos posts'!"
rr=lambda col:f"{RS}${col}$5:${col}$504"
for i,w in enumerate([30,12,14,14,14,14,12,13,14],1): rp.column_dimensions[L(i)].width=w
rp.column_dimensions["J"].width=3; rp.column_dimensions["K"].width=8
rp.merge_cells("A1:I1"); rp["A1"]="Relatório semanal de redes sociais"; rp["A1"].font=F(size=18,bold=True,color="FFFFFF"); rp["A1"].fill=hfill; rp["A1"].alignment=Alignment(horizontal="left",vertical="center",indent=1); rp.row_dimensions[1].height=34
dlab=lambda c:f'RIGHT("0"&DAY({c}),2)&"/"&RIGHT("0"&MONTH({c}),2)'
rp.merge_cells("A2:I2"); rp["A2"]=f'="Cliente: "&B4&"   |   Semana de "&{dlab("F4")}&" a "&{dlab("H4")}&"/"&YEAR(H4)'; rp["A2"].font=F(size=12,bold=True,color=ACC)
rp["A4"]="Cliente"; rp["A4"].font=F(bold=True)
rp.merge_cells("B4:D4"); rp["B4"]=clients[0]
rp["E4"]="Semana (seg):"; rp["E4"].font=F(bold=True); rp["E4"].alignment=Alignment(horizontal="right")
rp["F4"]=start; rp["F4"].number_format="dd/mm/yyyy"; rp["G4"]="até"; rp["G4"].alignment=Alignment(horizontal="center"); rp["G4"].font=F()
rp["H4"]="=F4+6"; rp["H4"].number_format="dd/mm/yyyy"; rp["H4"].font=F(bold=True); rp["H4"].alignment=Alignment(horizontal="center")
for ref in ("B4","C4","D4","F4"):
    rp[ref].fill=PatternFill("solid",fgColor="FFF3BF"); rp[ref].border=box
rp["B4"].font=F(bold=True,size=12); rp["F4"].font=F(bold=True,size=12); rp["F4"].alignment=Alignment(horizontal="center")
dv=DataValidation(type="list",formula1=dyn("A"),allow_blank=False); rp.add_data_validation(dv); dv.add("B4")
dv=DataValidation(type="list",formula1="=Listas!$H$2:$H$53",allow_blank=False); rp.add_data_validation(dv); dv.add("F4")
def sec(row,text):
    for col in range(1,10): rp.cell(row,col).fill=PatternFill("solid",fgColor="DDE3EE")
    rp.cell(row,1,text).font=F(bold=True,color=NAVY,size=11)
sec(6,"1. Meta de postagens")
for i,(a,f,fmt) in enumerate([("Meta da semana (posts)","=IFERROR(INDEX(Listas!$B$2:$B$40,MATCH($B$4,Listas!$A$2:$A$40,0)),0)","0"),
    ("Posts publicados",f'=COUNTIFS({rl("C")},$F$4,{rl("D")},$B$4,{rl("E")},"Postado")',"0"),
    ("% da meta",'=IF(B7=0,"",B8/B7)',"0%"),
    ("Situação",'=IF(B9="","Defina a meta na aba Listas",IF(B9>=1,"Meta batida",IF(B9>=0.7,"Quase lá — faltaram "&(B7-B8)&" post(s)","Abaixo da meta — faltaram "&(B7-B8)&" post(s)")))',"@")]):
    r=7+i; rp.cell(r,1,a).font=F(bold=True); c=rp.cell(r,2,f); c.font=F(bold=True,size=11); c.number_format=fmt; c.alignment=Alignment(horizontal="left")
rp.conditional_formatting.add("B9",FormulaRule(formula=['AND(ISNUMBER($B$9),$B$9<0.7)'],fill=PatternFill("solid",bgColor="FFC7CE")))
rp.conditional_formatting.add("B9",FormulaRule(formula=['AND(ISNUMBER($B$9),$B$9>=0.7,$B$9<1)'],fill=PatternFill("solid",bgColor="FFEB9C")))
rp.conditional_formatting.add("B9",FormulaRule(formula=['AND(ISNUMBER($B$9),$B$9>=1)'],fill=PatternFill("solid",bgColor="C6EFCE")))
sec(12,"2. Números por rede")
header(rp,13,["Rede","Posts","Seguidores","Novos seguidores","Visualizações","Δ vs semana anterior","Alcance","Interações","Engajamento"]); rp.row_dimensions[13].height=34
sa=lambda col:f"Semanal!${col}${W0}:${col}${WN}"
for k,rd in enumerate(redes):
    r=14+k
    rp.cell(r,1,f"=Listas!C{k+2}")
    ex=f'COUNTIFS({sa("A")},$F$4,{sa("C")},$B$4,{sa("D")},$A{r})=0'
    for col,sc in ((2,"K"),(3,"E"),(4,"F"),(5,"G"),(7,"H"),(8,"I")):
        rp.cell(r,col,f'=IF({ex},"",SUMIFS({sa(sc)},{sa("A")},$F$4,{sa("C")},$B$4,{sa("D")},$A{r}))')
    rp.cell(r,4,f'=IF(COUNTIFS({sa("A")},$F$4,{sa("C")},$B$4,{sa("D")},$A{r},{sa("F")},">=-999999999")=0,"",SUMIFS({sa("F")},{sa("A")},$F$4,{sa("C")},$B$4,{sa("D")},$A{r}))')
    pv=f'SUMIFS({sa("G")},{sa("A")},$F$4-7,{sa("C")},$B$4,{sa("D")},$A{r})'
    rp.cell(r,6,f'=IF(OR({ex},{pv}=0),"",E{r}/{pv}-1)')
    rp.cell(r,9,f'=IF(OR(G{r}="",N(G{r})=0),"",H{r}/G{r})')
rt3=14+len(redes)
rp.cell(rt3,1,"TOTAL")
for col in (2,3,4,5,7,8): rp.cell(rt3,col,f"=SUM({L(col)}14:{L(col)}{rt3-1})")
rp.cell(rt3,4,f'=IF(COUNT(D14:D{rt3-1})=0,"",SUM(D14:D{rt3-1}))')
pvt=f'SUMIFS({sa("G")},{sa("A")},$F$4-7,{sa("C")},$B$4)'
rp.cell(rt3,6,f'=IF({pvt}=0,"",E{rt3}/{pvt}-1)'); rp.cell(rt3,9,f'=IF(G{rt3}=0,"",H{rt3}/G{rt3})')
for r in range(14,rt3+1):
    for col in range(1,10):
        c=rp.cell(r,col); c.font=F(bold=(r==rt3)); c.border=box
        c.alignment=Alignment(horizontal="left" if col==1 else "center",vertical="center")
        if r==rt3: c.fill=PatternFill("solid",fgColor="DDE3EE")
    for col in (2,3,4,5,7,8): rp.cell(r,col).number_format="#,##0;-#,##0;0"
    rp.cell(r,6).number_format="+0%;-0%;0%"; rp.cell(r,9).number_format="0.0%"
rp.conditional_formatting.add(f"D14:D{rt3}",CellIsRule(operator="lessThan",formula=["0"],font=Font(name="Arial",color="C00000",bold=True)))
rp.conditional_formatting.add(f"F14:F{rt3}",FormulaRule(formula=['AND(ISNUMBER(F14),F14<0)'],font=Font(name="Arial",color="C00000",bold=True)))
rp.conditional_formatting.add(f"F14:F{rt3}",FormulaRule(formula=['AND(ISNUMBER(F14),F14>0)'],font=Font(name="Arial",color="2B8A3E",bold=True)))
rp.cell(rt3+1,1,"Seguidores e métricas aparecem só nas redes em que o cliente tem conta e que você preencheu na aba Semanal.").font=F(italic=True,size=8,color="6B7280")
def posts_table(r0,title_text,keyfmt,rows):
    sec(r0,title_text)
    header(rp,r0+1,["Post","Rede","Formato","Tema","Visualizações","Alcance","Interações","Engajamento","Veredito"]); rp.row_dimensions[r0+1].height=28
    for i,(lab,key) in enumerate(rows):
        r=r0+2+i
        rp.cell(r,11,f'=IFERROR(MATCH($F$4&"|"&$B$4&"|{key}",{rr(keyfmt)},0),"")')
        g=lambda col:f'=IF($K{r}="","",INDEX({rr(col)},$K{r}))'
        rp.cell(r,1,f'=IF($K{r}="","","{lab}  "&INDEX({rr("H")},$K{r}))')
        for col,sc in ((2,"D"),(3,"F"),(4,"G"),(5,"I"),(6,"J"),(7,"P"),(8,"Q"),(9,"S")): rp.cell(r,col,g(sc))
        rp.row_dimensions[r].height=32
        for col in range(1,10):
            c=rp.cell(r,col); c.font=F(); c.border=box
            c.alignment=Alignment(horizontal="left" if col==1 else "center",vertical="center",wrap_text=True)
        for col in (5,6,7): rp.cell(r,col).number_format="#,##0"
        rp.cell(r,8).number_format="0.0%"
        rp.cell(r,11).font=F(size=8,color="9CA3AF")
    return r0+2
t0=posts_table(22,"3. Posts que mais engajaram (top 3)","X",[("1º —","1"),("2º —","2"),("3º —","3")])
t1=posts_table(28,"4. Post para adaptar (menor engajamento)","Z",[("↓","P1")])
for rng in (f"I{t0}:I{t0+2}",f"I{t1}:I{t1}"):
    for val,bg,fg in (("Repetir","C6EFCE","006100"),("Adaptar","FFC7CE","9C0006"),("Na média","E5E7EB","374151")):
        rp.conditional_formatting.add(rng,CellIsRule(operator="equal",formula=[f'"{val}"'],fill=PatternFill("solid",bgColor=bg),font=Font(name="Arial",color=fg,bold=True)))
rp.cell(21,11,"linha").font=F(size=8,color="9CA3AF")
sec(32,"5. Comentário da semana")
rp.merge_cells("A33:I36"); rp["A33"].fill=yfill; rp["A33"].alignment=Alignment(wrap_text=True,vertical="top"); rp["A33"].font=F()
sec(38,"6. Próximos passos")
rp.merge_cells("A39:I42"); rp["A39"].fill=yfill; rp["A39"].alignment=Alignment(wrap_text=True,vertical="top"); rp["A39"].font=F()
for r in list(range(33,37))+list(range(39,43)):
    for col in range(1,10): rp.cell(r,col).border=box
rp.sheet_view.showGridLines=False
rp.print_area="A1:I42"; rp.page_setup.orientation="portrait"; rp.page_setup.paperSize=9
rp.sheet_properties.pageSetUpPr=PageSetupProperties(fitToPage=True); rp.page_setup.fitToWidth=1; rp.page_setup.fitToHeight=1
rp.print_options.horizontalCentered=True

# ---- Financeiro (última aba)
fi=wb.create_sheet("Financeiro")
fc=clients[:-1]
fin_v={'Atacadão Ferrosul':(300,17),'Lavanderia Mundial':(600,1),'Blessed Lavanderia':(600,1),'Gula Gula Pizzaria':(250,25),'Espetinho da Vila':(250,25),'Paradise Sup & Surf':(1000,28),'Restaurante Na Cozinha':(500,8)}  # exclui Rixxer (conta própria)
MONTHS=12; M0=17; MN=M0+len(fc)*MONTHS-1
title(fi,"Financeiro — mensalidades dos clientes","Cadastre o valor e o dia de vencimento (amarelo). No controle mensal, informe só a data e o valor do pagamento: a situação é calculada sozinha.")
header(fi,4,["Cliente","Valor mensal (R$)","Dia do vencimento (1–31)","Situação","Parcelas em atraso","Valor em atraso (R$)","Último pagamento","Observações"])
fi.row_dimensions[4].height=42
for i,w in enumerate([26,18,16,18,16,18,16,36],1): fi.column_dimensions[L(i)].width=w
BRL='"R$" #,##0.00;-"R$" #,##0.00;"R$" 0.00'
fm=lambda col:f"${col}${M0}:${col}${MN}"
for k in range(len(fc)):
    r=5+k
    fi.cell(r,1,f"=Listas!A{k+2}")
    fi.cell(r,2,fin_v[fc[k]][0]); fi.cell(r,3,fin_v[fc[k]][1])
    fi.cell(r,4,f'=IF(E{r}>0,"INADIMPLENTE","Adimplente")')
    fi.cell(r,5,f'=COUNTIFS({fm("B")},A{r},{fm("G")},"Atrasado")+COUNTIFS({fm("B")},A{r},{fm("G")},"Parcial",{fm("C")},"<"&TODAY())')
    fi.cell(r,6,f'=SUMPRODUCT(({fm("B")}=A{r})*((({fm("G")}="Atrasado")+({fm("G")}="Parcial"))*({fm("C")}<TODAY()))*({fm("D")}-{fm("F")}))')
    fi.cell(r,7,f'=IF(COUNTIFS({fm("B")},A{r},{fm("E")},">0")=0,"",_xlfn.MAXIFS({fm("E")},{fm("B")},A{r}))')
rt2=5+len(fc)
fi.cell(rt2,1,"TOTAL")
fi.cell(rt2,2,f"=SUM(B5:B{rt2-1})"); fi.cell(rt2,5,f"=SUM(E5:E{rt2-1})"); fi.cell(rt2,6,f"=SUM(F5:F{rt2-1})")
fi.cell(rt2,4,f'=COUNTIF(D5:D{rt2-1},"INADIMPLENTE")&" inadimplente(s)"')
for r in range(5,rt2+1):
    for col in range(1,9):
        c=fi.cell(r,col); c.font=F(bold=(r==rt2)); c.border=box
        c.alignment=Alignment(horizontal="left" if col in (1,8) else "center",vertical="center")
        if r==rt2: c.fill=PatternFill("solid",fgColor="DDE3EE")
        elif col in (2,3,8): c.fill=yfill
        elif col in (4,5,6,7): c.fill=gfill
    fi.cell(r,2).number_format=BRL; fi.cell(r,6).number_format=BRL; fi.cell(r,7).number_format="dd/mm/yyyy"
dvv=DataValidation(type="decimal",operator="greaterThanOrEqual",formula1="0",allow_blank=True,showErrorMessage=True,error="Digite apenas números."); fi.add_data_validation(dvv); dvv.add(f"B5:B{rt2-1}"); dvv.add(f"F{M0}:F{MN}")
dvdia=DataValidation(type="whole",operator="between",formula1="1",formula2="31",allow_blank=True,showErrorMessage=True,error="Digite um dia entre 1 e 31."); fi.add_data_validation(dvdia); dvdia.add(f"C5:C{rt2-1}")
fi.conditional_formatting.add(f"D5:D{rt2-1}",CellIsRule(operator="equal",formula=['"INADIMPLENTE"'],fill=PatternFill("solid",bgColor="FFC7CE"),font=Font(name="Arial",color="9C0006",bold=True)))
fi.conditional_formatting.add(f"D5:D{rt2-1}",CellIsRule(operator="equal",formula=['"Adimplente"'],fill=PatternFill("solid",bgColor="C6EFCE"),font=Font(name="Arial",color="006100",bold=True)))
fi.cell(rt2+2,1,"Controle mensal de pagamentos").font=F(bold=True,size=12,color=NAVY)
fi.cell(rt2+3,1,"Já deixei 12 meses (nov/2026 a out/2027) por cliente. Preencha 'Data do pagamento' e 'Valor pago' quando o cliente pagar.").font=F(italic=True,color="6B7280")
header(fi,M0-1,["Mês de referência","Cliente","Vencimento","Valor devido (R$)","Data do pagamento","Valor pago (R$)","Situação","Observações"])
fi.row_dimensions[M0-1].height=36
r=M0
for m in range(MONTHS):
    y=2026+(10+m)//12; mo=(10+m)%12+1
    for c in fc:
        fi.cell(r,1,dt.date(y,mo,1)); fi.cell(r,2,c); r+=1
for r in range(M0,MN+1):
    dia=f"IFERROR(INDEX($C$5:$C${rt2-1},MATCH(B{r},$A$5:$A${rt2-1},0)),0)"
    fi.cell(r,3,f'=IF({dia}<=0,"",DATE(YEAR(A{r}),MONTH(A{r}),MIN({dia},DAY(EOMONTH(A{r},0)))))')
    fi.cell(r,4,f'=IFERROR(INDEX($B$5:$B${rt2-1},MATCH(B{r},$A$5:$A${rt2-1},0)),0)')
    fi.cell(r,7,f'=IF(OR(C{r}="",D{r}=0),"Defina valor e vencimento",IF(E{r}<>"",IF(N(F{r})<D{r},"Parcial",IF(E{r}<=C{r},"Pago","Pago com atraso")),IF(TODAY()>C{r},"Atrasado","A vencer")))')
    for col in range(1,9):
        c=fi.cell(r,col); c.font=F(); c.border=box
        c.alignment=Alignment(horizontal="left" if col in (2,8) else "center",vertical="center",wrap_text=col==8)
        if col in (3,4,7): c.fill=gfill
        elif col in (5,6,8): c.fill=yfill
    fi.cell(r,1).number_format="mm/yyyy"; fi.cell(r,3).number_format="dd/mm/yyyy"; fi.cell(r,5).number_format="dd/mm/yyyy"
    fi.cell(r,4).number_format=BRL; fi.cell(r,6).number_format=BRL
dvp=DataValidation(type="date",operator="greaterThan",formula1="36526",allow_blank=True,showErrorMessage=True,error="Digite uma data válida (dd/mm/aaaa)"); fi.add_data_validation(dvp); dvp.add(f"E{M0}:E{MN}")
g=f"G{M0}:G{MN}"
for val,bg,fg in (("Pago","C6EFCE","006100"),("Pago com atraso","FFEB9C","7F6000"),("Atrasado","FFC7CE","9C0006"),("Parcial","FFD8A8","7C2D12"),("A vencer","DBEAFE","1E40AF")):
    fi.conditional_formatting.add(g,CellIsRule(operator="equal",formula=[f'"{val}"'],fill=PatternFill("solid",bgColor=bg),font=Font(name="Arial",color=fg,bold=True)))
fi.freeze_panes="B5"; fi.sheet_view.showGridLines=False

wb.active=1
wb.save(OUT)
