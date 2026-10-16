(()=>{'use strict';
const el=id=>document.getElementById(id),key='cc_official_lineups_by_scope',safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let dataset=null,limit=30,caches={},actionBusy=false;
const query=new URLSearchParams(window.location.search);for(const [id,values] of [["season",["nature","ink"]],["tier",["0","1","255"]]])if(values.includes(query.get(id)))el(id).value=query.get(id);
function validate(d){if(d?.schema!=='jcc-lineup-rates/v1'||d.metadata?.game!=='jcc-cn'||!['nature','ink'].includes(d.metadata.season)||!Array.isArray(d.comps)||!d.comps.length)throw Error('本机阵容缓存格式无效');for(const r of d.comps){if(typeof r.name!=='string'||!Array.isArray(r.units)||!r.units.length||r.units.some(x=>typeof x!=='string')||!Number.isSafeInteger(r.use_count)||r.use_count<1||![r.win_rate,r.top4_rate,r.average_rank].every(Number.isFinite)||r.win_rate<0||r.win_rate>r.top4_rate||r.top4_rate>1||r.average_rank<1||r.average_rank>8)throw Error('本机阵容统计无效')}return d}
function details(r,index){
 const units=r.unit_details?.length?r.unit_details:r.units.map(name=>({name}));
 const synergy=(r.synergies||[]).map(t=>'<span class="tag '+(t.active?'active':'')+'">'+safe(t.name)+' ×'+t.count+(t.active?' · '+t.active+'人档':t.breakpoints.length?' · 未激活':' · 特殊条件')+'</span>').join('');
 return '<details><summary>阵容详情 · 羁绊与装备</summary><p>'+units.map(h=>'<span class="unit">'+safe(h.name)+(h.cost?' <small>'+h.cost+'费</small>':'')+'</span>').join('')+'</p><p>'+synergy+'</p><p class="muted">核心棋子：'+(r.core_units||[]).map(safe).join(' · ')+'<br>来源主力装备组：'+(r.equipment||[]).map(safe).join(' / ')+'</p><p class="muted">主力装备组来自该阵容变体，不代表下列任意棋子的独立三件套胜率。羁绊档位按唯一棋子计数，转职与特殊机制以游戏内为准。</p><div class="actions"><button data-edit="'+index+'">载入阵容编辑器</button></div><p class="muted">点击棋子，查询独立三件套：</p><div class="actions">'+units.map(h=>'<button data-build="'+safe(h.id||'')+'" '+(!h.id||el('tier').value==='1'?'disabled':'')+'>'+safe(h.name)+'</button>').join('')+'</div>'+(el('tier').value==='1'?'<p class="muted">三件套接口的分段1为铂金至钻石，与阵容的钻石以上不同。请切换大师以上或全部段位查询。</p>':'')+(!r.unit_ids?'<p class="muted">旧缓存缺少棋子身份，请点击更新阵容以启用编辑和查询。</p>':'')+'</details>';
}
function draw(){
 const q=el('search').value.trim().toLowerCase(),sort=el('sort').value,min=Math.max(0,Number(el('minimum').value)||0);
 const rows=(dataset?.comps||[]).map((r,index)=>({r,index})).filter(({r})=>r.use_count>=min&&(r.name+' '+r.units.join(' ')).toLowerCase().includes(q)).sort((a,b)=>sort==='average_rank'?a.r[sort]-b.r[sort]:b.r[sort]-a.r[sort]);
 el('more').hidden=rows.length<=limit;el('count').textContent=rows.length+' 个阵容变体 · 当前显示 '+Math.min(rows.length,limit)+' 个';
 el('results').innerHTML=rows.slice(0,limit).map(({r,index})=>'<article><h2>'+safe(r.name)+' <span class="variant">分组 '+safe(r.group_number)+' / 变体 '+safe(r.variant)+'</span></h2><p>'+r.units.map(safe).join(' · ')+'</p><div class="stats"><span>前四率<b>'+(r.top4_rate*100).toFixed(2)+'%</b></span><span>登顶率<b>'+(r.win_rate*100).toFixed(2)+'%</b></span><span>平均排名<b>'+r.average_rank.toFixed(2)+'</b></span><span>使用次数<b>'+r.use_count.toLocaleString()+'</b></span></div>'+details(r,index)+'</article>').join('')||'<section class="empty">'+(dataset?'没有符合筛选的阵容，请调整搜索或最低使用次数。':'点击「读取 / 更新官方阵容」，查询所选赛季和分段。')+'</section>';
}
function describe(prefix){const m=dataset.metadata,date=m.stat_date,stamp=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8));return prefix+' · '+(m.season==='ink'?'画之灵返场':'自然之力')+' · 统计日期 '+date+' · 资料版本 '+m.static_patch+'\n'+m.mode+' · '+m.rank+' · 统计补丁未提供\n'+dataset.comps.length+' 个变体；'+m.excluded_variants+' 个无法完整映射的变体已排除。'+(Date.now()-stamp>3*86400000?' 缓存已过期，请更新后再判断。':'')}
el('refresh').onclick=async()=>{const tier=el('tier').value,season=el('season').value,scope=season+'|'+tier;el('refresh').disabled=true;el('results').setAttribute('aria-busy','true');el('tier').disabled=true;el('season').disabled=true;el('status').textContent='正在读取所选赛季官网资料并核对阵容统计…';try{const book=await ChanchanOfficial.readOfficial(season,window.fetch.bind(window),message=>{el('status').textContent=message});el('status').textContent='官网资料已核对，正在连接阵容统计接口…';const next=validate(await ChanchanOfficial.readLineups(book,window.fetch.bind(window),tier));const merged={...caches,[scope]:next};let books={};try{books=JSON.parse(localStorage.getItem('cc_local_catalog')||'{}')}catch{}localStorage.setItem('cc_local_catalog',JSON.stringify({...books,[season]:book}));localStorage.setItem(key,JSON.stringify(merged));caches=merged;dataset=next;el('refresh').textContent='读取 / 更新官方阵容';el('status').textContent=describe('官网读取成功，已保存本机');draw()}catch(e){el('refresh').textContent='重试读取官方阵容';el('status').textContent='读取未完成：'+e.message+(dataset?'。已有缓存已保留，可以稍后重试。':'。当前赛季和分段尚无本机缓存，请稍后重试。')+(dataset?'\n'+describe('显示上次缓存'):'')}finally{el('refresh').disabled=false;el('results').setAttribute('aria-busy','false');el('tier').disabled=false;el('season').disabled=false}};
for(const id of ['search','sort','minimum'])el(id).addEventListener(id==='sort'?'change':'input',()=>{limit=30;draw()});
el('more').onclick=()=>{limit+=30;draw()};
try{const saved=localStorage.getItem(key);if(saved){const parsed=JSON.parse(saved);for(const season of ['nature','ink'])for(const tier of ['0','1','255']){const scope=season+'|'+tier;if(parsed[scope]){const d=validate(parsed[scope]);if(d.metadata.tier_part!==tier||d.metadata.season!==season)throw Error('缓存赛季或分段不一致');caches[scope]=d}}dataset=caches[el('season').value+'|'+el('tier').value]||null;if(dataset)el('status').textContent=describe('显示本机缓存，点击更新可重新核实')}}catch(e){el('status').textContent=e.message+'，请重新读取官网。'}draw();
const changeScope=()=>{el('actionStatus').textContent='';dataset=caches[el('season').value+'|'+el('tier').value]||null;limit=30;el('status').textContent=dataset?describe('显示所选分段本机缓存'):'此赛季和分段尚未读取，点击更新查询。';draw()};el('tier').onchange=changeScope;el('season').onchange=changeScope;
el('results').onclick=async event=>{
 const target=event.target.closest('button');if(!target||actionBusy)return;
 const edit=target.getAttribute('data-edit'),build=target.getAttribute('data-build');if(edit===null&&build===null)return;
 const season=el('season').value,tier=el('tier').value;actionBusy=true;target.disabled=true;el('season').disabled=true;el('tier').disabled=true;el('refresh').disabled=true;
 try{
  const book=JSON.parse(localStorage.getItem('cc_local_catalog')||'{}')[season];
  if(!book||book.metadata?.patch!==dataset?.metadata.static_patch)throw Error('资料与阵容版本不一致，请先更新官方阵容');
  if(edit!==null){
   const row=dataset.comps[Number(edit)];const board=ChanchanOfficial.boardDetails(row?.unit_ids,book);
   let saved={};try{saved=JSON.parse(localStorage.getItem('cc_lineup')||'{}')}catch{}
   const previous=saved[season]||[];
   if(JSON.stringify(previous)!==JSON.stringify(board.unit_ids)){
    let backups={};try{backups=JSON.parse(localStorage.getItem('cc_lineup_backup')||'{}')}catch{}
    localStorage.setItem('cc_lineup_backup',JSON.stringify({...backups,[season]:previous}));
   }
   localStorage.setItem('cc_lineup',JSON.stringify({...saved,[season]:board.unit_ids}));
   window.location.href='/catalog.html?season='+season+'&tier='+tier+'&from=lineup#editor';
  }else{
   let hero=book.champions.find(h=>h.id===build);if(!hero){const form=book.forms?.find(h=>h.id===build);hero=book.champions.find(h=>h.name===form?.name)}
   if(!hero)throw Error('此特殊形态暂未找到独立棋子统计，已有数据保留');
   el('actionStatus').textContent='正在查询'+hero.name+'的官方三件套…';
   const next=await ChanchanOfficial.readBuilds(season,hero.id,book,window.fetch.bind(window),tier);
   let previous;try{previous=JSON.parse(localStorage.getItem('cc_official_rates')||'null')}catch{}
   const retained=previous?.schema==='jcc-rate-only/v1'&&Array.isArray(previous.items)?previous.items.filter(r=>!(r.season===season&&r.unit_id===hero.id&&(r.tier_part||'0')===tier)):[];
   next.items=[...retained,...next.items];localStorage.setItem('cc_official_rates',JSON.stringify(next));
   window.location.href='/item-analyzer.html?source=official&season='+season+'&tier='+tier+'&unit='+encodeURIComponent(hero.name)+'&from=lineup';
  }
 }catch(e){el('actionStatus').textContent='操作未完成：'+e.message+'。可以重试；原有统计已保留。'}
 finally{actionBusy=false;target.disabled=false;el('season').disabled=false;el('tier').disabled=false;el('refresh').disabled=false}
};
})();
