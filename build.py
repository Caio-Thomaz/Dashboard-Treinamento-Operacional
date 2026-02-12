import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
import json, re

TZ = ZoneInfo("America/Campo_Grande")
BASE_XLSX = Path('teste.xlsx')  # arquivo enviado
DOCS = Path('docs')
DOCS.mkdir(exist_ok=True)

# Regras de status

def classificar_status(dias:int):
    if dias < 0: return 'Vencido'
    if dias <= 30: return '≤30 dias'
    if dias <= 60: return '31–60 dias'
    if dias <= 90: return '61–90 dias'
    return '>90 dias'


def ler_planilha_custom():
    """
    Lê a planilha no formato fornecido (1ª linha = cabeçalhos, 1ª coluna = colaborador,
    depois blocos de 3 colunas: [treinamento, DATA, VENCIMENTO]).
    Retorna DataFrame com colunas: colaborador, treinamento, data_vencimento (ISO), dias_para_vencer, status.
    """
    df = pd.read_excel(BASE_XLSX, engine='openpyxl', header=None)
    # Primeira linha são cabeçalhos
    headers = df.iloc[0].tolist()
    # Demais linhas são dados
    data = df.iloc[1:].reset_index(drop=True)
    registros = []
    for _, row in data.iterrows():
        colab = str(row.iloc[0]).strip()
        if not colab or colab.lower() == 'nan':
            continue
        # Percorre em blocos de 3 colunas
        j = 1
        while j + 2 < df.shape[1]:
            cod_hdr = str(headers[j]).strip() if j < len(headers) else ''
            if not cod_hdr or cod_hdr.lower() == 'nan':
                j += 3
                continue
            treinamento = str(row.iloc[j]).strip()
            data_v = row.iloc[j+1]
            dias_val = row.iloc[j+2]
            # Ignora se não houver treinamento preenchido
            if pd.isna(treinamento) or str(treinamento).strip() == '':
                j += 3
                continue
            # Normaliza data
            data_venc = None
            if pd.notna(data_v):
                try:
                    if isinstance(data_v, datetime):
                        data_venc = data_v.date()
                    else:
                        data_venc = pd.to_datetime(str(data_v), dayfirst=False, errors='coerce').date()
                except Exception:
                    data_venc = None
            # Calcula dias para vencer a partir de data_venc
            today = datetime.now(TZ).date()
            if data_venc:
                dias = (data_venc - today).days
            else:
                # fallback: se tiver coluna "vencimento" numérica
                try:
                    dias = int(dias_val)
                except Exception:
                    dias = None
            if dias is None:
                j += 3
                continue
            status = classificar_status(dias)
            registros.append({
                'colaborador': colab,
                'treinamento': str(treinamento),
                'data_vencimento': data_venc.isoformat() if data_venc else None,
                'dias_para_vencer': int(dias),
                'status': status
            })
            j += 3
    out = pd.DataFrame(registros)
    return out


def salvar_json(df: pd.DataFrame, today):
    payload = {
        'atualizado_em': today.strftime('%d/%m/%Y'),
        'registros': int(len(df)),
        'rows': df.to_dict(orient='records')
    }
    (DOCS / 'data.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')


def atualizar_data_no_html(today):
    idx = DOCS / 'index.html'
    if not idx.exists():
        return
    html = idx.read_text(encoding='utf-8')
    html = re.sub(r'(Atualizado em )\d{2}/\d{2}/\d{4}', r'\g<1>'+today.strftime('%d/%m/%Y'), html)
    idx.write_text(html, encoding='utf-8')


if __name__ == '__main__':
    today = datetime.now(TZ)
    df = ler_planilha_custom()
    # Ordena por colaborador e dias
    if not df.empty:
        df = df.sort_values(['colaborador','dias_para_vencer','treinamento'])
    salvar_json(df, today)
    atualizar_data_no_html(today)
    print(f'Linhas exportadas: {len(df)}')
