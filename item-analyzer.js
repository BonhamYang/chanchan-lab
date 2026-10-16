(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EMPTY={metadata:{status:'empty'},comps:[],items:[]};
let server=EMPTY,local=null,official=null,mode='server',current=EMPTY,quality={invalid:0,duplicates:0};
const key=r=>[r.season,r.mode||'未标注',r.rank||'未标注',r.patch,r.unit,...r.items.map(x=>x.trim()).sort()].join('\u001f');
function validRow(r){return r&&['nature','ink'].includes(r.season)&&typeof r.unit==='string'&&r.unit.trim()&&typeof r.patch==='string'&&r.patch.trim()&&Array.isArray(r.items)&&r.items.length===3&&r.items.every(x=>typeof x==='string'&&x.trim())&&[r.sample_count,r.win_count,r.top4_count,r.rank_sum].every(Number.isSafeInteger)&&r.sample_count>0&&r.win_count>=0&&r.top4_count>=r.win_count&&r.top4_count<=r.sample_count&&r.rank_sum>=r.sample_count&&r.rank_sum<=r.sample_count*8}
function readData(d){const counters={invalid:0,duplicates:0};if(!d||!Array.isArray(d.items))return {...EMPTY,quality:counters};
 const seen=new Set(),items=[];for(const r of d.items){if(!validRow(r)){counters.invalid++;continue}
 const k=key(r);if(seen.has(k)){counters.duplicates++;continue}seen.add(k);items.push(r)}
 return {metadata:d.metadata||{},comps:Array.isArray(d.comps)?d.comps:[],items,quality:counters};
}
function readRates(d){
 if(!d||d.schema!=='jcc-rate-only/v1'||d.metadata?.game!=='jcc-cn'||!Array.isArray(d.items))throw Error('官网本机统计格式无效');
 const seen=new Set();for(const r of d.items){
 if(!r||!['nature','ink'].includes(r.season)||!['unit','patch','mode','rank','stat_date'].every(k=>typeof r[k]==='string'&&r[k].trim())||!/^\d{8}$/.test(r.stat_date)||r.sample_count!==null||!Array.isArray(r.items)||r.items.length!==3||r.items.some(x=>typeof x!=='string'||!x.trim())||![r.win_rate,r.top4_rate,r.average_rank].every(x=>typeof x==='number'&&Number.isFinite(x))||r.win_rate<0||r.top4_rate>1||r.win_rate>r.top4_rate||r.average_rank<1||r.average_rank>8)throw Error('官网组合统计字段无效');
 const k=key(r);if(seen.has(k))throw Error('官网组合数据存在重复');seen.add(k);
 }return {...d,comps:[],quality:{invalid:0,duplicates:0}};
}
const top4=r=>r.sample_count===null?r.top4_rate:r.top4_count/r.sample_count,win=r=>r.sample_count===null?r.win_rate:r.win_count/r.sample_count,average=r=>r.sample_count===null?r.average_rank:r.rank_sum/r.sample_count;
function card(r){
 const unknown=r.sample_count===null,pct=n=>(n*100).toFixed(1)+'%';
 const ci=unknown?null:ChanchanMatches.interval(r.win_count,r.sample_count);
 const interval=ci?'登顶率 95% 区间 '+pct(ci[0])+'–'+pct(ci[1])+'（仅反映样本随机波动）':'来源未提供组合样本量，无法计算置信区间或判断低样本风险。';
 return '<div class="card"><b>'+esc(r.unit)+'</b> <span class="tag">'+esc(r.mode||'未标注')+'</span> <span class="tag">'+esc(r.rank||'未标注')+'</span> <span class="tag">'+esc(r.patch)+'</span> '+(r.stat_date?'<span class="tag">统计日期 '+esc(r.stat_date)+'</span>':'')+'<span class="tag">'+(unknown?'样本量未提供':esc(r.sample_count)+' 样本')+'</span><div>'+r.items.map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</div>'+(!unknown&&r.sample_count<500?'<p class="warning">低样本：少于 500 局，胜率波动可能较大</p>':'')+'<p class="muted">'+esc(interval)+'</p><div class="stats"><div class="stat"><div class="muted">前四率</div><div class="value">'+pct(top4(r))+'</div></div><div class="stat"><div class="muted">登顶率</div><div class="value">'+pct(win(r))+'</div></div><div class="stat"><div class="muted">平均排名</div><div class="value">'+average(r).toFixed(2)+'</div></div><div class="stat"><div class="muted">样本量</div><div class="value">'+(unknown?'未提供':esc(r.sample_count))+'</div></div></div></div>';
}
function fill(id,values,label){const e=$(id),prev=e.value;e.innerHTML='<option value="">'+label+'</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(values.includes(prev))e.value=prev}
const uniq=a=>[...new Set(a)].sort((a,b)=>String(a).localeCompare(String(b),'zh'));
function render(){
 const season=$('season').value,rows=current.items.filter(r=>r.season===season);
 fill('mode',uniq(rows.map(r=>r.mode||'未标注')),'全部模式（分开展示）');
 const selectedMode=$('mode').value,modeRows=rows.filter(r=>!selectedMode||(r.mode||'未标注')===selectedMode);
 fill('rank',uniq(modeRows.map(r=>r.rank||'未标注')),'全部分段（分开展示）');
 const rank=$('rank').value,scoped=modeRows.filter(r=>!rank||(r.rank||'未标注')===rank);
 fill('unit',uniq(scoped.map(r=>r.unit)),'全部棋子');
 let unit=$('unit').value;
 fill('patch',uniq(scoped.filter(r=>!unit||r.unit===unit).map(r=>r.patch)),'全部版本（独立展示）');
 let patch=$('patch').value;
 const base=scoped.filter(r=>(!unit||r.unit===unit)&&(!patch||r.patch===patch));
 fill('item1',uniq(base.flatMap(r=>r.items)),'不限');
 fill('item2',uniq(base.flatMap(r=>r.items)),'不限');
 const a=$('item1').value,b=$('item2').value;
 const rawMin=Number($('minimum').value),minimum=Number.isSafeInteger(rawMin)&&rawMin>=1&&rawMin<=10000000?rawMin:100;
 $('minimum').disabled=mode==='official';$('sort').querySelector('[value="samples"]').disabled=mode==='official';if(mode==='official'&&$('sort').value==='samples')$('sort').value='top4';
 const arr=base.filter(r=>(r.sample_count===null||r.sample_count>=minimum)&&(!a||r.items.includes(a))&&(!b||r.items.filter(x=>x===b).length>=(a===b&&a!==''?2:1)));
 const sort=$('sort').value;
 arr.sort((x,y)=>sort==='top4'?top4(y)-top4(x):sort==='win'?win(y)-win(x):sort==='avg'?average(x)-average(y):(y.sample_count||0)-(x.sample_count||0));
 $('count').textContent=arr.length+' 个';
 $('server').disabled=mode==='server';$('local').disabled=mode==='local';$('official').disabled=mode==='official';
 $('source').textContent=(mode==='server'?'服务器':mode==='official'?'官网直读 · 仅保存在本机':'个人本地')+' · '+(current.metadata.provider||current.metadata.status||'未标识')+' · '+(current.metadata.retrieved_at||current.metadata.generated_at||'未提供时间')+' · 可用三件套记录 '+current.items.length+' · 跳过不合格 '+(current.quality?.invalid||0)+' 条、重复组合 '+(current.quality?.duplicates||0)+' 条';
 $('results').innerHTML=arr.length?arr.map(card).join(''):'<div class="empty">当前条件下没有可用的统计记录。<p>个人数据可调整样本筛选；官方组合可前往<a href="/catalog.html">赛季图鉴</a>选择棋子读取，不会自动批量查询。</p></div>';
}
for(const id of ['season','mode','rank','unit','patch','item1','item2','sort','minimum'])$(id).addEventListener(id==='minimum'?'input':'change',render);
$('reset').onclick=()=>{for(const id of ['mode','rank','unit','patch','item1','item2'])$(id).value='';$('minimum').value='100';render()};
$('server').onclick=()=>{mode='server';current=server;render()};
$('local').onclick=()=>{if(!local){$('source').textContent='未找到本地数据：请前往导入统计页导入 JSON';return}mode='local';current=local;render()};
$('official').onclick=()=>{if(!official){$('source').textContent='先到赛季图鉴读取官网资料，再选择一名棋子查询三件套';return}mode='official';current=official;render()};
try{const saved=localStorage.getItem('cc_official_rates');if(saved)official=readRates(JSON.parse(saved))}catch{official=null}
try{const saved=localStorage.getItem('chanchan_dataset');if(saved)local=readData(JSON.parse(saved))}catch(e){local=null}
fetch('/api/snapshot').then(r=>r.ok?r.json():null).then(d=>{server=readData(d);if(mode==='server')current=server;render()}).catch(()=>{render()});
if(new URLSearchParams(window.location.search).get('source')==='local'&&local){mode='local';current=local;$('minimum').value='1'}
const query=new URLSearchParams(window.location.search);if(query.get('from')==='lineup'){const back=$('backToLineup');back.hidden=false;back.href='/?season='+(['nature','ink'].includes(query.get('season'))?query.get('season'):'nature')+'&tier='+(['0','1','255'].includes(query.get('tier'))?query.get('tier'):'0')}if(query.get('source')==='official'&&official){mode='official';current=official;if(['nature','ink'].includes(query.get('season')))$('season').value=query.get('season');render();const selectedTier=query.get('tier');const selectedRow=official.items.find(r=>r.season===$('season').value&&(r.tier_part||'0')===selectedTier);if(selectedRow){$('rank').value=selectedRow.rank;render()}if(official.items.some(r=>r.unit===query.get('unit')))$('unit').value=query.get('unit')}
render();
})();