const state = {
  raw: [], // {colaborador, treinamento, data_vencimento, dias_para_vencer, status}
  atualizado: '',
  filtrado: [],
  colab: 'Todos',
  busca: '',
  critico: false
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const classColor = (status) => {
  if (status === 'Vencido') return 'red';
  if (status === '≤30 dias') return 'orange';
  if (status === '31–60 dias') return 'yellow';
  if (status === '61–90 dias') return 'green';
  return 'green2';
}

function aplicarFiltros(){
  const q = state.busca.trim().toLowerCase();
  state.filtrado = state.raw.filter(r => {
    const byColab = state.colab === 'Todos' || r.colaborador === state.colab;
    const byBusca = !q || r.treinamento.toLowerCase().includes(q);
    const byCrit = !state.critico || (r.status === 'Vencido' || r.status === '≤30 dias');
    return byColab && byBusca && byCrit;
  });
}

function atualizarKPIs(){
  const total = state.filtrado.length;
  const vencido = state.filtrado.filter(r=>r.status==='Vencido').length;
  const d30 = state.filtrado.filter(r=>r.status==='≤30 dias').length;
  const d60 = state.filtrado.filter(r=>r.status==='31–60 dias').length;
  const d90 = state.filtrado.filter(r=>r.status==='61–90 dias').length;
  const g90 = state.filtrado.filter(r=>r.status==='>90 dias').length;
  document.getElementById('kpi-registros').textContent = total;
  document.getElementById('kpi-criticos').textContent = vencido + d30;
  document.getElementById('kpi-vencidos').textContent = vencido;
  document.getElementById('kpi-30').textContent = d30;
  document.getElementById('kpi-60').textContent = d60;
  document.getElementById('kpi-90').textContent = `${d90} / ${g90}`;
}

function atualizarGrafico(){
  const data = [...state.filtrado]
    .sort((a,b)=>a.dias_para_vencer-b.dias_para_vencer);
  const x = data.map(r=>r.dias_para_vencer);
  const y = data.map(r=>r.treinamento);
  const colors = data.map(r=>{
    if (r.status==='Vencido') return '#ef4444';
    if (r.status==='≤30 dias') return '#f59e0b';
    if (r.status==='31–60 dias') return '#facc15';
    if (r.status==='61–90 dias') return '#86efac';
    return '#22c55e';
  });
  document.getElementById('chart-title').textContent = `Treinamentos — ${state.colab}`;
  const trace = {
    x, y,
    type:'bar', orientation:'h',
    marker:{color:colors},
    hovertemplate: '<b>%{y}</b><br>dias para vencer: %{x}<extra></extra>'
  };
  Plotly.newPlot('plot', [trace], {
    template:'plotly_dark',
    paper_bgcolor:'rgba(0,0,0,0)',
    plot_bgcolor:'rgba(0,0,0,0)',
    margin:{l:200, r:20, t:10, b:40},
    xaxis:{title:'Dias para vencer'},
    yaxis:{autorange:'reversed'}
  },{displayModeBar:false, responsive:true});
}

function atualizarTabela(){
  const corpo = document.querySelector('#tbl tbody');
  corpo.innerHTML='';
  const futuros = state.filtrado.filter(r=>r.dias_para_vencer>=0)
    .sort((a,b)=>a.dias_para_vencer-b.dias_para_vencer)
    .slice(0,20);
  for(const r of futuros){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.colaborador}</td>
      <td>${r.treinamento}</td>
      <td>${fmtDate(r.data_vencimento)}</td>
      <td>${r.dias_para_vencer}</td>
      <td><span class="badge ${classColor(r.status)}">${r.status}</span></td>`
    corpo.appendChild(tr);
  }
}

function baixarCSV(){
  const header = ['colaborador','treinamento','data_vencimento','dias_para_vencer','status'];
  const linhas = state.filtrado.map(r=>[
    r.colaborador,
    r.treinamento,
    fmtDate(r.data_vencimento),
    r.dias_para_vencer,
    r.status
  ]);
  const csv = [header.join(','), ...linhas.map(l=>l.map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'treinamentos_filtrado.csv';
  a.click(); URL.revokeObjectURL(url);
}

async function carregar(){
  const resp = await fetch('data.json');
  const data = await resp.json();
  state.raw = data.rows;
  state.atualizado = data.atualizado_em;
  // Preencher dropdown colaboradores
  const colabs = Array.from(new Set(state.raw.map(r=>r.colaborador))).sort();
  const sel = document.getElementById('f-colab');
  sel.innerHTML = '<option>Todos</option>' + colabs.map(c=>`<option>${c}</option>`).join('');
  document.querySelector('.updated').textContent = `Atualizado em ${state.atualizado}`;
  aplicarFiltros();
  atualizarKPIs();
  atualizarGrafico();
  atualizarTabela();
}

// Eventos
window.addEventListener('DOMContentLoaded', ()=>{
  carregar();
  document.getElementById('f-colab').addEventListener('change', (e)=>{
    state.colab = e.target.value; aplicarFiltros(); atualizarKPIs(); atualizarGrafico(); atualizarTabela();
  });
  document.getElementById('f-busca').addEventListener('input', (e)=>{
    state.busca = e.target.value; aplicarFiltros(); atualizarKPIs(); atualizarGrafico(); atualizarTabela();
  });
  document.getElementById('f-critico').addEventListener('change', (e)=>{
    state.critico = e.target.checked; aplicarFiltros(); atualizarKPIs(); atualizarGrafico(); atualizarTabela();
  });
  document.getElementById('btn-csv').addEventListener('click', (e)=>{e.preventDefault(); baixarCSV();});
});
