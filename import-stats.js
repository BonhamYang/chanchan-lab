(()=>{'use strict';
const el=id=>document.getElementById(id);
const required=['season','patch','mode','tier','kind','name','placement','count'];
function csvRows(text){
 const result=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"'){quoted=false}else{cell+=c}}
  else if(c==='"'&&cell===''){quoted=true}
  else if(c===','){row.push(cell);cell=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))result.push(row);row=[];cell=''}
  else{cell+=c}
 }
 if(quoted)throw Error('CSV 存在没有闭合的引号');
 row.push(cell);if(row.some(x=>x.trim()))result.push(row);
 return result;
}
function convert(text){
 const rows=csvRows(text.replace(/^\uFEFF/,''));
 if(rows.length<2)throw Error('CSV 必须有表头和至少一条样本记录');
 if(rows.length>100001)throw Error('文件最多允许 10 万条记录');
 const headings=rows.shift().map(x=>x.trim().toLowerCase());
 if(new Set(headings).size!==headings.length)throw Error('CSV 表头存在重复字段');
 for(const k of required)if(!headings.includes(k))throw Error('缺少必填列：'+k);
 const get=(row,key)=>String(row[headings.indexOf(key)]||'').trim();
 const groups=new Map();
 for(let i=0;i<rows.length;i++){
  const row=rows[i];if(row.length!==headings.length)throw Error('第 '+(i+2)+' 行列数与表头不一致');
  const season=get(row,'season'),patch=get(row,'patch'),mode=get(row,'mode'),tier=get(row,'tier'),kind=get(row,'kind');
  const name=get(row,'name'),unit=get(row,'unit'),placement=Number(get(row,'placement')),count=Number(get(row,'count'));
  if(!['nature','ink'].includes(season)||!patch||!mode||!tier||!['comps','items'].includes(kind)||!name)throw Error('第 '+(i+2)+' 行赛季、版本、模式、分段或种类无效');
  if(!Number.isInteger(placement)||placement<1||placement>8||!Number.isSafeInteger(count)||count<0)throw Error('第 '+(i+2)+' 行名次或样本数无效');
  const equipment=[get(row,'item1'),get(row,'item2'),get(row,'item3')];
  if(kind==='items'&&(!unit||equipment.some(v=>!v)))throw Error('第 '+(i+2)+' 行三件套缺少棋子或装备字段');
  const identity=[season,patch,mode,tier,kind,kind==='items'?unit:name,...(kind==='items'?equipment.slice().sort():[])].join('\u001f');
  if(!groups.has(identity))groups.set(identity,{season,patch,mode,rank:tier,kind,name,unit,items:equipment,places:[0,0,0,0,0,0,0,0]});
  const g=groups.get(identity);
  if(g.places[placement-1]>Number.MAX_SAFE_INTEGER-count)throw Error('样本计数溢出');
  g.places[placement-1]+=count;
 }
 const data={metadata:{status:'local-import',provider:'用户自行导入的对局数据',generated_at:new Date().toISOString()},comps:[],items:[]};
 for(const g of groups.values()){
  const n=g.places.reduce((a,b)=>a+b,0);
  if(!Number.isSafeInteger(n))throw Error('累计样本数超出安全范围');
  if(n===0)continue;
  const record={season:g.season,patch:g.patch,mode:g.mode,rank:g.rank,name:g.name,
   sample_count:n,top4_count:g.places.slice(0,4).reduce((a,b)=>a+b,0),win_count:g.places[0],
   rank_sum:g.places.reduce((a,b,i)=>a+b*(i+1),0)};
  if(!Number.isSafeInteger(record.rank_sum))throw Error('累计名次总和超出安全范围');
  if(g.kind==='items'){record.unit=g.unit;record.items=g.items;data.items.push(record)}
  else data.comps.push(record);
 }
 if(!data.comps.length&&!data.items.length)throw Error('文件中没有有效样本');
 return data;
}
function exportJson(data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chanchan-statistics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
let converted=null;
el('csv').onchange=async e=>{converted=null;el('import').disabled=true;el('download').disabled=true;try{
 const file=e.target.files[0];if(!file)return;if(file.size>2_000_000)throw Error('CSV 文件不得超过 2MB');
 converted=convert(await file.text());el('result').textContent='校验通过：阵容 '+converted.comps.length+' 组，三件套 '+converted.items.length+' 组。数据来源由你自行确认。';
 el('import').disabled=false;el('download').disabled=false
}catch(err){el('result').textContent='校验失败：'+err.message}};
el('import').onclick=()=>{if(!converted)return;try{localStorage.setItem('chanchan_dataset',JSON.stringify(converted));el('result').textContent='已保存到当前浏览器。返回主页后点击「查看本地导入」，或者打开三件套分析器选择「浏览器本地数据」。';}catch(e){el('result').textContent='浏览器存储不足，请先点「下载转换后的 JSON」并在首页导入。'}};
el('download').onclick=()=>{if(converted)exportJson(converted)};
})();