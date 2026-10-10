(()=>{'use strict';
const el=id=>document.getElementById(id),validSeasons=['nature','ink'],defaultData=s=>({season:s,metadata:{status:'empty'},champions:[],items:[]});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let remote={},local={},lineups={};
function check(d,s){if(!d||d.season!==s||!Array.isArray(d.champions)||!Array.isArray(d.items))throw Error('赛季或数组格式不符合要求');for(const kind of ['champions','items']){const ids=new Set();for(const r of d[kind]){if(!r||typeof r.id!=='string'||!r.id.trim()||typeof r.name!=='string'||!r.name.trim()||ids.has(r.id))throw Error(kind+' ID/名称非法或重复');ids.add(r.id);if(kind==='champions'&&(!Number.isInteger(r.cost)||r.cost<1||r.cost>5||!Array.isArray(r.traits)||r.traits.some(t=>typeof t!=='string')))throw Error('棋子属性无效');if(kind==='items'&&r.components!==undefined&&(!Array.isArray(r.components)||r.components.some(t=>typeof t!=='string')))throw Error('装备属性无效')}}}return d}
const season=()=>el('season').value,db=()=>local[season()]||remote[season()]||defaultData(season()),lineup=()=>lineups[season()]||(lineups[season()]=[]);
function store(){try{localStorage.setItem('cc_local_catalog',JSON.stringify(local));localStorage.setItem('cc_lineup',JSON.stringify(lineups))}catch(e){el('importStatus').textContent='浏览器存储空间不足'}}
function updateFilter(data,kind){
 const selection=el('filter').value;
 const values=kind==='champions'?['1','2','3','4','5']:[...new Set(data.items.map(x=>x.category).filter(x=>typeof x==='string'&&x.trim()))].sort();
 el('filter').innerHTML='<option value="">全部费用 / 类型</option>'+values.map(x=>'<option value="'+escape(x)+'">'+escape(kind==='champions'?x+' 费':x)+'</option>').join('');
 if(values.includes(selection))el('filter').value=selection;
}
function draw(){const data=db(),kind=el('kind').value,q=el('search').value.trim().toLowerCase();updateFilter(data,kind);
 const filter=el('filter').value;
 const list=data[kind].filter(r=>(!filter||(kind==='champions'?String(r.cost)===filter:r.category===filter))&&(r.name+' '+(r.traits||[]).join(' ')+' '+(r.category||'')).toLowerCase().includes(q));
el('source').textContent=(local[season()]?'本地导入':'服务器资料')+' · 版本：'+(data.metadata?.patch||'未知')+' · 棋子 '+data.champions.length+' · 装备 '+data.items.length;el('count').textContent=list.length+' 条';
el('cards').innerHTML=list.length?list.map(r=>'<div class="card"><b>'+escape(r.name)+'</b><p class="muted">'+(kind==='champions'?escape(r.cost)+' 费':escape(r.category||'装备'))+'</p>'+(kind==='champions'?(r.traits||[]):(r.components||[])).map(t=>'<span class="tag">'+escape(t)+'</span>').join('')+(kind==='champions'?'<p><button data-add="'+escape(r.id)+'">加入阵容</button></p>':'')+'</div>').join(''):'<p class="empty">该赛季暂无已导入的资料，请使用下面的导入功能。</p>';
el('lineup').innerHTML=lineup().length?lineup().map((id,i)=>{const h=data.champions.find(x=>x.id===id);return '<button data-del="'+i+'">'+escape(h?.name||id)+' ×</button>'}).join(''):'<div class="empty">当前阵容为空</div>';
 const traits={};for(const id of lineup()){const hero=data.champions.find(x=>x.id===id);if(hero)for(const t of new Set(hero.traits||[])){traits[t]=(traits[t]||0)+1}}
 const ordered=Object.entries(traits).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh'));
 el('synergy').innerHTML=ordered.length?'已选棋子的羁绊计数（不代表激活档位）： '+ordered.map(([name,n])=>'<span class="tag">'+escape(name)+' ×'+n+'</span>').join(''):'尚无羁绊统计';
}
el('cards').onclick=e=>{const id=e.target.getAttribute('data-add');if(!id)return;if(lineup().includes(id)){el('notice').textContent='已加入这名棋子';return}if(lineup().length>=9){el('notice').textContent='阵容最多 9 位';return}lineup().push(id);store();draw()};
el('lineup').onclick=e=>{const v=e.target.getAttribute('data-del');if(v===null)return;lineup().splice(Number(v),1);store();draw()};
['season','kind'].forEach(id=>el(id).onchange=()=>{el('filter').value='';draw()});el('search').oninput=draw;el('filter').onchange=draw;
el('clearLineup').onclick=()=>{lineups[season()]=[];store();draw()};
el('removeData').onclick=()=>{delete local[season()];lineups[season()]=[];store();draw();el('importStatus').textContent='已清除本赛季资料'};
el('export').onclick=()=>{const blob=new Blob([JSON.stringify({season:season(),champion_ids:lineup()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lineup-'+season()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
el('file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2000000)throw Error('文件不得超过 2MB');local[season()]=check(JSON.parse(await f.text()),season());lineups[season()]=[];store();draw();el('importStatus').textContent='导入成功'}catch(err){el('importStatus').textContent='导入失败：'+err.message}};
try{const a=JSON.parse(localStorage.getItem('cc_local_catalog')||'{}'),b=JSON.parse(localStorage.getItem('cc_lineup')||'{}');for(const s of validSeasons){if(a[s])local[s]=check(a[s],s);if(Array.isArray(b[s]))lineups[s]=b[s].filter(x=>typeof x==='string').slice(0,9)}}catch(err){local={};lineups={}}
Promise.all(validSeasons.map(s=>fetch('/api/catalog/'+s).then(r=>r.ok?r.json():defaultData(s)).then(d=>{remote[s]=check(d,s)}).catch(()=>{remote[s]=defaultData(s)}))).then(draw);draw()
})();