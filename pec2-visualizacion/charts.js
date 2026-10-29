const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}, text = null) {
  const el = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text !== null) el.textContent = text;
  return el;
}

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return value => rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function positionTooltip(container, tooltip, event) {
  const box = container.getBoundingClientRect();
  const x = Math.min(event.clientX - box.left, box.width - 230);
  const y = Math.max(0, event.clientY - box.top);
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function renderStackedBars() {
  const container = document.getElementById('stacked-chart');
  if (!container) return;
  const tooltip = container.querySelector('.tooltip');
  const svg = svgEl('svg', {
    viewBox: '0 0 900 450',
    role: 'img',
    'aria-labelledby': 'stacked-title stacked-desc'
  });
  svg.append(svgEl('title', {id: 'stacked-title'}, 'Estructura de la población por grandes grupos de edad en 2025'));
  svg.append(svgEl('desc', {id: 'stacked-desc'}, 'Cinco barras horizontales apiladas al cien por cien comparan la proporción de población joven, adulta y mayor en España, Japón, México, Nigeria y Suecia.'));

  const left = 110, right = 30, top = 42, barH = 48, gap = 25;
  const width = 900 - left - right;
  const x = scaleLinear(0, 100, left, left + width);
  [0,20,40,60,80,100].forEach(tick => {
    svg.append(svgEl('line', {x1:x(tick),x2:x(tick),y1:top-18,y2:top+(barH+gap)*ageData.length-15,class:'grid'}));
    svg.append(svgEl('text', {x:x(tick),y:22,'text-anchor':tick===0?'start':tick===100?'end':'middle',class:'tick-label'}, tick + '%'));
  });

  const keys = [
    {key:'young',label:'0–14 años',fill:'var(--young)'},
    {key:'working',label:'15–64 años',fill:'var(--working)'},
    {key:'older',label:'65 años o más',fill:'var(--older)'}
  ];

  ageData.forEach((row, i) => {
    const y = top + i * (barH + gap);
    svg.append(svgEl('text', {x:left-14,y:y+barH/2+5,'text-anchor':'end',class:'axis-title'}, row.country));
    let acc = 0;
    keys.forEach(item => {
      const value = row[item.key];
      const rect = svgEl('rect', {
        x:x(acc), y, width:x(acc+value)-x(acc), height:barH,
        fill:item.fill, tabindex:'0', role:'img',
        'aria-label':row.country + ', ' + item.label + ': ' + value.toFixed(1) + '%'
      });
      const show = event => {
        tooltip.innerHTML = '<strong>' + row.country + '</strong><br>' + item.label + ': ' + value.toFixed(1) + '%';
        tooltip.hidden = false;
        if (event.clientX) positionTooltip(container, tooltip, event);
      };
      rect.addEventListener('pointermove', show);
      rect.addEventListener('pointerleave', () => tooltip.hidden = true);
      rect.addEventListener('focus', event => {
        const box = rect.getBoundingClientRect();
        show({clientX:box.left+box.width/2,clientY:box.top+box.height/2});
      });
      rect.addEventListener('blur', () => tooltip.hidden = true);
      svg.append(rect);
      if (value >= 8) {
        svg.append(svgEl('text', {
          x:(x(acc)+x(acc+value))/2,y:y+barH/2+5,'text-anchor':'middle',fill:'#fff','font-size':'13','font-weight':'700','pointer-events':'none'
        }, value.toFixed(1) + '%'));
      }
      acc += value;
    });
  });
  svg.append(svgEl('text', {x:left+width/2,y:440,'text-anchor':'middle',class:'axis-title'}, 'Porcentaje de la población total'));
  container.prepend(svg);
}

function renderParallelCoordinates() {
  const container = document.getElementById('parallel-chart');
  if (!container) return;
  const tooltip = container.querySelector('.tooltip');
  const buttons = [...document.querySelectorAll('[data-species]')];
  const dims = [
    {key:'sepalLength',label:'Longitud sépalo'},
    {key:'sepalWidth',label:'Anchura sépalo'},
    {key:'petalLength',label:'Longitud pétalo'},
    {key:'petalWidth',label:'Anchura pétalo'}
  ];
  const colors = {setosa:'var(--setosa)',versicolor:'var(--versicolor)',virginica:'var(--virginica)'};
  let active = 'all';

  function draw() {
    container.querySelector('svg')?.remove();
    const svg = svgEl('svg', {viewBox:'0 0 900 470',role:'img','aria-label':'Coordenadas paralelas de 150 flores Iris según cuatro medidas en centímetros'});
    const left=70,right=70,top=72,bottom=54;
    const plotW=900-left-right, plotH=470-top-bottom;
    const xs=dims.map((_,i)=>left+i*(plotW/(dims.length-1)));
    const scales={};
    dims.forEach((dim,i)=>{
      const values=irisData.map(d=>d[dim.key]);
      const min=Math.min(...values), max=Math.max(...values);
      scales[dim.key]=scaleLinear(min,max,top+plotH,top);
      svg.append(svgEl('line',{x1:xs[i],x2:xs[i],y1:top,y2:top+plotH,class:'axis'}));
      svg.append(svgEl('text',{x:xs[i],y:28,'text-anchor':'middle',class:'axis-title'},dim.label));
      svg.append(svgEl('text',{x:xs[i],y:46,'text-anchor':'middle',class:'tick-label'},'(cm)'));
      svg.append(svgEl('text',{x:xs[i]-8,y:top+4,'text-anchor':'end',class:'tick-label'},max.toFixed(1)));
      svg.append(svgEl('text',{x:xs[i]-8,y:top+plotH,'text-anchor':'end',class:'tick-label'},min.toFixed(1)));
    });

    const visible=active==='all'?irisData:irisData.filter(d=>d.species===active);
    visible.forEach((row,index)=>{
      const points=dims.map((dim,i)=>[xs[i],scales[dim.key](row[dim.key])]);
      const path=svgEl('path',{
        d:'M'+points.map(p=>p[0]+','+p[1]).join(' L'),fill:'none',stroke:colors[row.species],
        'stroke-width':active==='all'?'1.15':'1.8',opacity:active==='all'?'.34':'.62',tabindex:'0',
        'aria-label':'Iris '+row.species+', observación '+(index+1)
      });
      const show=event=>{
        [...svg.querySelectorAll('path')].forEach(p=>p.setAttribute('opacity','.08'));
        path.setAttribute('opacity','1'); path.setAttribute('stroke-width','3');
        tooltip.innerHTML='<strong>Iris '+row.species+'</strong><br>Sépalo: '+row.sepalLength+' × '+row.sepalWidth+' cm<br>Pétalo: '+row.petalLength+' × '+row.petalWidth+' cm';
        tooltip.hidden=false;
        if(event.clientX) positionTooltip(container,tooltip,event);
      };
      const hide=()=>{
        [...svg.querySelectorAll('path')].forEach(p=>p.setAttribute('opacity',active==='all'?'.34':'.62'));
        path.setAttribute('stroke-width',active==='all'?'1.15':'1.8'); tooltip.hidden=true;
      };
      path.addEventListener('pointermove',show); path.addEventListener('pointerleave',hide);
      path.addEventListener('focus',event=>show({clientX:container.getBoundingClientRect().left+450,clientY:container.getBoundingClientRect().top+200}));
      path.addEventListener('blur',hide);
      svg.insertBefore(path,svg.firstChild);
    });
    svg.append(svgEl('text',{x:450,y:458,'text-anchor':'middle',class:'tick-label'},visible.length+' observaciones visibles · cada eje usa su propia escala'));
    container.prepend(svg);
  }

  buttons.forEach(button=>button.addEventListener('click',()=>{
    active=button.dataset.species;
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    draw();
  }));
  draw();
}

function renderSparklines() {
  const tbody=document.getElementById('spark-body');
  if(!tbody) return;
  const detail=document.getElementById('spark-detail');
  const codes=['ESP','JPN','MEX','NGA','SWE'];
  const y=scaleLinear(45,86,55,8);
  const x=scaleLinear(2000,2023,6,594);
  codes.forEach(code=>{
    const values=lifeData.filter(d=>d.code===code).sort((a,b)=>a.year-b.year);
    const latest=values[values.length-1];
    const first=values[0];
    const tr=document.createElement('tr');
    const country=document.createElement('th'); country.scope='row'; country.textContent=countryNames[code];
    const period=document.createElement('td'); period.textContent='2000–2023';
    const spark=document.createElement('td'); spark.className='spark-cell';
    const latestCell=document.createElement('td'); latestCell.className='latest'; latestCell.textContent=latest.value.toFixed(1)+' años';
    const svg=svgEl('svg',{viewBox:'0 0 600 65',role:'img','aria-label':'Esperanza de vida en '+countryNames[code]+' entre 2000 y 2023'});
    [50,60,70,80].forEach(v=>svg.append(svgEl('line',{x1:0,x2:600,y1:y(v),y2:y(v),class:'grid'})));
    const path='M'+values.map(d=>x(d.year)+','+y(d.value)).join(' L');
    svg.append(svgEl('path',{d:path,fill:'none',stroke:'var(--accent)','stroke-width':'2.3'}));
    svg.append(svgEl('circle',{cx:x(latest.year),cy:y(latest.value),r:'3.7',fill:'var(--accent)'}));
    const guide=svgEl('line',{x1:x(latest.year),x2:x(latest.year),y1:5,y2:58,stroke:'var(--muted)','stroke-width':'1',opacity:'0'});
    const point=svgEl('circle',{cx:x(latest.year),cy:y(latest.value),r:'4.5',fill:'var(--surface)',stroke:'var(--accent)','stroke-width':'2',opacity:'0'});
    svg.append(guide,point);
    const overlay=svgEl('rect',{x:0,y:0,width:600,height:65,fill:'transparent',tabindex:'0','aria-label':'Explorar valores de '+countryNames[code]});
    const update=year=>{
      const nearest=values.reduce((best,d)=>Math.abs(d.year-year)<Math.abs(best.year-year)?d:best,values[0]);
      guide.setAttribute('x1',x(nearest.year)); guide.setAttribute('x2',x(nearest.year)); guide.setAttribute('opacity','1');
      point.setAttribute('cx',x(nearest.year)); point.setAttribute('cy',y(nearest.value)); point.setAttribute('opacity','1');
      detail.innerHTML='<strong>'+countryNames[code]+'</strong> · '+nearest.year+': '+nearest.value.toFixed(1)+' años';
    };
    overlay.addEventListener('pointermove',event=>{
      const box=svg.getBoundingClientRect();
      const px=(event.clientX-box.left)/box.width*600;
      update(Math.round(2000+(px/600)*23));
    });
    overlay.addEventListener('pointerleave',()=>{guide.setAttribute('opacity','0');point.setAttribute('opacity','0');});
    overlay.addEventListener('focus',()=>update(2023));
    overlay.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        const current=Number(detail.dataset.year||2023)+(event.key==='ArrowRight'?2:-2);
        const bounded=Math.max(2000,Math.min(2023,current)); detail.dataset.year=bounded; update(bounded);
      }
    });
    svg.append(overlay); spark.append(svg);
    tr.append(country,period,spark,latestCell); tbody.append(tr);
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  renderStackedBars();
  renderParallelCoordinates();
  renderSparklines();
});

