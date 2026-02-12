# Dashboard de Vencimentos de Treinamentos (GitHub Pages)

Site estático publicado via **GitHub Pages** com build diário (GitHub Actions) que recalcula os status com base na data atual (fuso `America/Campo_Grande`).

## Publicação rápida
1. Crie um repositório e faça upload destes arquivos.
2. Vá em **Settings → Pages** e selecione **Source: Deploy from a branch** e **Branch: `main` / folder: `/docs`**.
3. Em **Actions → General**, habilite workflows para o repositório (se necessário).
4. O workflow `Build Dashboard (diário)` já está configurado para rodar às **07:00 (MS)** (~11:00 UTC). Você pode rodar manualmente via **Actions → Run workflow**.

## Estrutura
```
/docs
  ├── index.html   # dashboard
  ├── styles.css   # tema escuro + gradiente do header
  ├── app.js       # filtros, gráfico e tabela
  └── data.json    # dados (gerado no build)
/build
  └── build.py     # lê planilha e gera data.json + carimba data
.github/workflows
  └── build.yml    # agenda diária
```

## Base de dados
- Arquivo esperado: `teste.xlsx` (neste mesmo diretório), no formato fornecido: 1ª coluna = **colaborador**; para cada treinamento, existem 3 colunas: `Treinamento`, `DATA` (vencimento) e `VENCIMENTO` (dias). O script usa **DATA** para calcular `dias_para_vencer` diariamente.

## Regras de status
- **Vencido**: `< 0` dias  
- **≤ 30 dias**: `0–30`  
- **31–60 dias**: `31–60`  
- **61–90 dias**: `61–90`  
- **> 90 dias**: `> 90`  
- **Críticos** = Vencidos + ≤30.

## Como atualizar a base
- Substitua o `teste.xlsx` no repositório. O próximo build (ou build manual) vai refletir os dados.

## Observações
- O gráfico usa **Plotly** e roda 100% no front.
- O botão **Baixar CSV** baixa **o filtro atual**.
- O Top 20 da tabela **exclui vencidos** por padrão. Se quiser incluir, ajuste no `app.js` (filtro da função `atualizarTabela`).
```
const futuros = state.filtrado /* .filter(r=>r.dias_para_vencer>=0) */
```

---

> Qualquer ajuste de identidade visual (cores, logo, fontes) me avise que eu aplico.
