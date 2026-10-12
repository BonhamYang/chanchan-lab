/* Personal, explicitly supplied JCC observations. No external data requests. */
(function(root){'use strict';
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
const identity=v=>JSON.stringify(v);
function validate(r){
 if(!r||r.game!=='jcc-cn'||!['nature','ink'].includes(r.season))throw Error('必须是金铲铲国服目标赛季');
 for(const k of ['id','patch','mode','rank'])if(!text(r[k]))throw Error('缺少对局标识、版本、模式或段位');
 if(r.placement_scale!==8)throw Error('这里只接收八名个人排名；四队双人名次不能混算');
 if(!Number.isInteger(r.placement)||r.placement<1||r.placement>8)throw Error('个人名次必须是 1–8');
 if(typeof r.played_at!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(r.played_at)||!Number.isFinite(Date.parse(r.played_at))||Date.parse(r.played_at)>Date.now()+60000)throw Error('对局时间无效或位于未来');
 if(!Array.isArray(r.board)||r.board.length<1||r.board.length>15)throw Error('阵容需要 1–15 名棋子');
 const seen=new Set();
 for(const h of r.board){
  if(!h||!text(h.unit)||seen.has(h.unit.trim()))throw Error('棋子名称无效或重复');seen.add(h.unit.trim());
  if(!Array.isArray(h.items)||h.items.length>4||h.items.some(x=>!text(x)))throw Error('装备需要 0–4 件有效名称');
 }
 return {...r,id:r.id.trim(),patch:r.patch.trim(),mode:r.mode.trim(),rank:r.rank.trim(),board:r.board.map(h=>({unit:h.unit.trim(),items:h.items.map(x=>x.trim()).sort()})).sort((a,b)=>a.unit.localeCompare(b.unit,'zh'))};
}
function merge(existing,incoming){
 if(!Array.isArray(existing)||!Array.isArray(incoming)||existing.length+incoming.length>20000)throw Error('最多保存 1 万条实战记录');
 const map=new Map();let duplicates=0;
 for(const row of [...existing,...incoming]){
  const r=validate(row),key=identity([r.game,r.season,r.id]);
  if(map.has(key)){if(identity(map.get(key))!==identity(r))throw Error('同一对局标识存在冲突，请核对：'+r.id);duplicates++;continue}
  map.set(key,r);
 }
 if(map.size>10000)throw Error('最多保存 1 万条实战记录');
 return {records:[...map.values()],duplicates};
}
function aggregate(records){
 const clean=merge([],records).records,groups={comps:new Map(),items:new Map()};
 let skippedBuilds=0;
 function add(kind,r,name,unit,items){
  const key=identity([r.season,r.patch,r.mode,r.rank,kind==='comps'?r.board.map(x=>x.unit):[unit,items]]);
  if(!groups[kind].has(key))groups[kind].set(key,{season:r.season,patch:r.patch,mode:r.mode,rank:r.rank,name,...(kind==='items'?{unit,items}:{}),sample_count:0,win_count:0,top4_count:0,rank_sum:0});
  const g=groups[kind].get(key);g.sample_count++;g.win_count+=Number(r.placement===1);g.top4_count+=Number(r.placement<=4);g.rank_sum+=r.placement;
 }
 for(const r of clean){
  add('comps',r,r.board.map(x=>x.unit).join(' / '));
  for(const h of r.board){if(h.items.length!==3){skippedBuilds++;continue}add('items',r,h.unit+'三件套',h.unit,h.items)}
 }
 return {metadata:{game:'jcc-cn',status:'local-import',provider:'个人手动记录（未独立核验）',generated_at:new Date().toISOString(),sample_unit:'个人对局记录',observations:clean.length,excluded_non_three_item_boards:skippedBuilds},comps:[...groups.comps.values()],items:[...groups.items.values()]};
}
function interval(success,n){if(!Number.isInteger(n)||n<1||success<0||success>n)return null;const z=1.96,p=success/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)]}
const api={validate,merge,aggregate,interval};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChanchanMatches=api;
})(typeof globalThis!=='undefined'?globalThis:this);
