(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EMPTY={metadata:{status:'empty'},comps:[],items:[]};
let server=EMPTY,local=null,mode='server',current=EMPTY,quality={invalid:0,duplicates:0};
const key=r=>[r.season,r.patch,r.unit,...r.items.map(x=>x.trim()).sort()].join('\u001f');
function validRow(r){return r&&['nature','ink'].includes(r.season)&&typeof r.unit==='string'&&r.unit.trim()&&typeof r.patch==='string'&&r.patch.trim()&&Array.isArray(r.items)&&r.items.length===3&&r.items.every(x=>typeof x==='string'&&x.trim())&&[r.sample_count,r.win_count,r.top4_count,r.rank_sum].every(Number.isSafeInteger)&&r.sample_count>0&&r.win_count>=0&&r.top4_count>=r.win_count&&r.top4_count<=r.sample_count&&r.rank_sum>=r.sample_count&&r.rank_sum<=r.sample_count*8}
function readData(d){quality={invalid:0,duplicates:0};if(!d||!Array.isArray(d.items))return EMPTY;
 const seen=new Set(),items=[];for(const r of d.items){if(!validRow(r)){quality.invalid++;continue}
 const k=key(r);if(seen.has(k)){quality.duplicates++;continue}seen.add(k);items.push(r)}
 return {metadata:d.metadata||{},comps:Array.isArray(d.comps)?d.comps:[],items};
}
function fill(id,values,label){const e=$(id),prev=e.value;e.innerHTML='<option value="">'+label+'</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(values.includes(prev))e.value=prev}
const uniq=a=>[...new Set(a)].sort((a,b)=>String(a).localeCompare(String(b),'zh'));
function render(){
 const season=$('season').value,rows=current.items.filter(r=>r.season===season);
 fill('unit',uniq(rows.map(r=>r.unit)),'全部棋子');
 let unit=$('unit').value;
 fill('patch',uniq(rows.filter(r=>!unit||r.unit===unit).map(r=>r.patch)),'全部版本（独立展示）');
 let patch=$('patch').value;
 const base=rows.filter(r=>(!unit||r.unit===unit)&&(!patch||r.patch===patch));
 fill('item1',uniq(base.flatMap(r=>r.items)),'不限');
 fill('item2',uniq(base.flatMap(r=>r.items)),'不限');
 const a=$('item1').value,b=$('item2').value;
 const rawMin=Number($('minimum').value),minimum=Number.isSafeInteger(rawMin)&&rawMin>=1&&rawMin<=10000000?rawMin:100;
 const arr=base.filter(r=>r.sample_count>=minimum&&(!a||r.items.includes(a))&&(!b||r.items.filter(x=>x===b).length>=(a===b&&a!==''?2:1)));
 const sort=$('sort').value;
 arr.sort((x,y)=>sort==='top4'?y.top4_count/y.sample_count-x.top4_count/x.sample_count:sort==='win'?y.win_count/y.sample_count-x.win_count/x.sample_count:sort==='avg'?x.rank_sum/x.sample_count-y.rank_sum/y.sample_count:y.sample_count-x.sample_count);
 const pct=(x,n)=>(x*100/n).toFixed(1)+'%';
 $('count').textContent=arr.length+' 个';
 $('server').disabled=mode==='server';$('local').disabled=mode==='local';
 $('source').textContent=(mode==='server'?'服务器':'个人本地')+' · '+(current.metadata.status||'未标识')+' · '+(current.metadata.generated_at||'未提供时间')+' · 可用三件套记录 '+current.items.length+' · 跳过不合格 '+quality.invalid+' 条、重复组合 '+quality.duplicates+' 条';
 $('results').innerHTML=arr.length?arr.map(r=>'<div class="card"><b>'+esc(r.unit)+'</b> <span class="tag">'+esc(r.patch)+'</span> <span class="tag">'+esc(r.sample_count)+' 样本</span><div>'+r.items.map(x=>'<span class="tag">'+esc(x)+'</span>').join('')+'</div><div class="stats"><div class="stat"><div class="muted">前四率</div><div class="value">'+pct(r.top4_count,r.sample_count)+'</div></div><div class="stat"><div class="muted">登顶率</div><div class="value">'+pct(r.win_count,r.sample_count)+'</div></div><div class="stat"><div class="muted">平均排名</div><div class="value">'+(r.rank_sum/r.sample_count).toFixed(2)+'</div></div><div class="stat"><div class="muted">样本量</div><div class="value">'+esc(r.sample_count)+'</div></div></div></div>').join(''):'<div class="empty">当前条件下没有可用的真实统计样本。可以降低最低样本数，或切换棋子及版本。<p>若服务器尚未接入授权数据，请先在首页导入合法获取的数据文件。</p></div>';
}
for(const id of ['season','unit','patch','item1','item2','sort','minimum'])$(id).addEventListener(id==='minimum'?'input':'change',render);
$('reset').onclick=()=>{for(const id of ['unit','patch','item1','item2'])$(id).value='';$('minimum').value='100';render()};
$('server').onclick=()=>{mode='server';current=readData(server);render()};
$('local').onclick=()=>{if(!local){$('source').textContent='未找到本地数据：请先返回首页导入 JSON';return}mode='local';current=readData(local);render()};
try{const saved=localStorage.getItem('chanchan_dataset');if(saved)local=readData(JSON.parse(saved))}catch(e){local=null}
fetch('/api/snapshot').then(r=>r.ok?r.json():null).then(d=>{server=readData(d);if(mode==='server')current=readData(server);render()}).catch(()=>{render()});
render();
})();