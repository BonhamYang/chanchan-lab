/* Independent official-document adapter. No copied upstream implementation. */
(function(root){'use strict';
const BASE='https://game.gtimg.cn/images/lol/act/jkzlk/js';
const INDEX=BASE+'/config/versiondataconfig.js';
const SEASONS={nature:{name:'自然之力',mode:'18',season:'S19'},ink:{name:'画之灵',mode:'11',season:'S100030'}};
function selectVersion(index,season){
 const expected=SEASONS[season];if(!expected||!Array.isArray(index))throw Error('未知赛季或官网版本索引格式变更');
 const rows=index.filter(r=>r&&r.name===expected.name&&Number(r.is_newest_version)===1&&String(r.mode)===expected.mode&&r.season===expected.season);
 if(rows.length!==1)throw Error('未找到唯一的目标赛季当前版本，保留现有资料');
 const r=rows[0];if(typeof r.version!=='string'||!/^\d+(?:\.\d+)+[a-z]?$/.test(r.version))throw Error('官网版本格式变更');
 const prefix='/'+expected.mode+'/'+r.version+'-'+expected.season+'/';
 for(const [key,file] of [['herourl','chess.js'],['traiturl','trait.js'],['equipurl','equip.js']])if(r[key]!==prefix+file)throw Error('官网文件路径与赛季身份不一致');
 return {...r};
}
function rows(document,version){
 if(!document||document.version!==version.version||document.season!==version.season||String(document.setId)!==String(version.mode)||!document.data||typeof document.data!=='object'||Array.isArray(document.data))throw Error('官网资料赛季或版本不一致');
 return Object.values(document.data);
}
function catalog(season,version,chess,trait,equip){
 const expected=SEASONS[season];if(!expected||String(version.mode)!==expected.mode||version.season!==expected.season||version.name!==expected.name)throw Error('目标赛季不一致');
 const traitMap=new Map();
 for(const r of rows(trait,version)){
  const id=String(r.checkId??'').trim(),name=String(r.name??'').trim(),num=Number(r.num);
  if(!id||!name||!Number.isSafeInteger(num)||num<0)throw Error('羁绊标识或档位无效');
  if(traitMap.has(id)&&traitMap.get(id).name!==name)throw Error('同一羁绊标识映射到多个名称');
  const t=traitMap.get(id)||{id,name,breakpoints:[],upstream_ids:[]};if(num>0&&!t.breakpoints.includes(num))t.breakpoints.push(num);t.upstream_ids.push(String(r.id));traitMap.set(id,t);
 }
 const champions=[],forms=[];
 for(const r of rows(chess,version)){
  if(String(r.heroType)!=='0'||!['0','1'].includes(String(r.showHeroTag)))continue;
  // Official documents include star-level variants; keep the one-star identity only.
  if(!/^1\d{4}$/.test(String(r.id)))continue;
  const cost=Number(r.price),id=String(r.id??''),name=String(r.name??'').trim();
  if(!id||!name||!Number.isSafeInteger(cost)||cost<1||cost>5)throw Error('可玩棋子的名称或费用无效');
  const ids=[...new Set([r.class,r.species].flatMap(v=>String(v??'').split(/[,|]/)).map(v=>v.trim()).filter(v=>v&&v!=='-1'&&v!=='0'))];
  if(ids.some(v=>!traitMap.has(v)))throw Error('棋子羁绊无法映射，拒绝部分更新');
  (String(r.showHeroTag)==='1'?champions:forms).push({id,name,cost,traits:ids.map(v=>traitMap.get(v).name)});
 }
 const items=rows(equip,version).map(r=>{
  const id=String(r.id??''),name=String(r.name??'').trim();if(!id||!name)throw Error('装备缺少 ID 或名称');
  return {id,name,category:String(r.type||'装备'),components:[r.synthesis1,r.synthesis2].filter(v=>v!==undefined&&String(v)!=='0'&&String(v)!=='').map(String)};
 });
 const itemMap=new Map(items.map(r=>[r.id,r.name]));
 if(itemMap.size!==items.length||new Set(champions.map(r=>r.id)).size!==champions.length)throw Error('棋子或装备 ID 重复');
 for(const r of items){if(r.components.some(id=>!itemMap.has(id)))throw Error('装备合成引用不完整');r.components=r.components.map(id=>itemMap.get(id))}
 if(!champions.length||!items.length)throw Error('官网返回空资料，保留现有资料');
 return {season,metadata:{game:'jcc-cn',status:'official-browser',provider:'腾讯金铲铲官网（本机直接读取）',patch:version.version,version_start_time:version.version_start_time,upstream_mode:version.mode,upstream_season:version.season,retrieved_at:new Date().toISOString(),source_urls:[INDEX,BASE+version.herourl,BASE+version.traiturl,BASE+version.equipurl]},champions,forms,items,traits:[...traitMap.values()].map(t=>({...t,breakpoints:t.breakpoints.sort((a,b)=>a-b)}))};
}
async function readOfficial(season,fetcher){
 if(typeof fetcher!=='function')throw Error('缺少请求实现');
 async function get(url){
  const response=await fetcher(url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('官网读取失败（HTTP '+response.status+'），保留现有资料');
  const body=await response.text();if(body.length>2500000)throw Error('官网响应超过大小限制');
  try{return JSON.parse(body.replace(/^\uFEFF/,''))}catch{throw Error('官网不再返回 JSON，保留现有资料')}
 }
 const version=selectVersion(await get(INDEX),season);
 // Bounded explicit action: one index and three documents for one selected season.
 const [chess,trait,equip]=await Promise.all([get(BASE+version.herourl),get(BASE+version.traiturl),get(BASE+version.equipurl)]);
 return catalog(season,version,chess,trait,equip);
}
function normalizeRates(response,context){
 if(!response||response.result!==0||!response.data||!context||context.game!=='jcc-cn'||!SEASONS[context.season])throw Error('国服组合响应或上下文无效');
 for(const k of ['patch','mode','rank','unit'])if(typeof context[k]!=='string'||!context[k].trim())throw Error('组合记录缺少独立核实的 '+k);
 if(context.scope_verified!==true)throw Error('接口赛季和模式尚未核实，禁止冒充目标范围');
 if(!['fraction','percent'].includes(context.rate_unit))throw Error('必须明确百分比单位，不能猜测');
 const d=response.data,date=String(d.dtstatdate??'');if(!/^\d{8}$/.test(date))throw Error('来源没有有效统计日期');
 const stamp=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8));if(new Date(stamp).toISOString().slice(0,10).replace(/-/g,'')!==date)throw Error('统计日期无效');
 if(stamp>Date.now()+86400000)throw Error('统计日期位于未来');
 if(!Array.isArray(d.combine_itemid_details))throw Error('来源缺少组合数组');
 const denom=context.rate_unit==='percent'?100:1,seen=new Set(),items=[];let excluded=0;
 for(const r of d.combine_itemid_details){
  if(!Array.isArray(r.equips)||r.equips.length!==3){excluded++;continue}
  const gear=r.equips.map(String).sort();if(gear.some(v=>!v.trim()))throw Error('组合装备 ID 无效');
  const nums=[r.top1_rate,r.top4_rate,r.avg_rank];if(nums.some(v=>v===null||v===''||typeof v!=='number'||!Number.isFinite(v)))throw Error('组合统计缺失或无效');
  const win=r.top1_rate/denom,top4=r.top4_rate/denom,avg=r.avg_rank;if(win<0||top4>1||win>top4||avg<1||avg>8)throw Error('组合统计范围无效');
  const key=JSON.stringify(gear);if(seen.has(key))throw Error('重复三件套，拒绝含冲突响应');seen.add(key);
  items.push({season:context.season,patch:context.patch,mode:context.mode,rank:context.rank,unit:context.unit,items:gear,win_rate:win,top4_rate:top4,average_rank:avg,sample_count:null,stat_date:date});
 }
 return {schema:'jcc-rate-only/v1',metadata:{game:'jcc-cn',status:'local-rate-import',provider:'腾讯官方组合响应（用户本机导入）',stat_date:date,sample_count_available:false,excluded_non_three_item:excluded},items};
}
async function readBuilds(season,heroId,book,fetcher){
 const expected=SEASONS[season];const hero=book?.champions?.find(h=>h.id===heroId);
 if(!expected||book.season!==season||book.metadata?.status!=='official-browser'||String(book.metadata.upstream_mode)!==expected.mode||book.metadata.upstream_season!==expected.season||!hero||!/^1\d{4}$/.test(heroId))throw Error('先读取并选择本赛季官网棋子资料');
 const patchStart=Date.parse(book.metadata.version_start_time);if(!Number.isFinite(patchStart))throw Error('官网资料缺少版本生效时间，请重新读取');
 const url='https://mlol.qt.qq.com/go/jgame/get_hero_equip_ranking';
 const response=await fetcher(url,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({heroid:heroId.slice(1),tier_part:'0',set_id:expected.mode,time_type:'1'}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('官方统计暂不可用（HTTP '+response.status+'）');
 const text=await response.text();if(text.length>1500000)throw Error('官方统计响应超出限制');const payload=JSON.parse(text);
 if(payload.result===0&&!payload.data?.dtstatdate)throw Error('官方暂未提供该棋子或赛季的有效统计日期');
 const result=normalizeRates(payload,{game:'jcc-cn',season,patch:'统计版本未提供（资料 '+book.metadata.patch+'）',mode:'官方默认统计（未细分玩法）',rank:'大师以上（官网 tier_part=0）',unit:hero.name,scope_verified:true,rate_unit:'fraction'});
 const date=result.metadata.stat_date,stamp=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8));
 if(stamp<patchStart||Date.now()-stamp>3*86400000)throw Error('官方统计过期或早于当前版本，保留已有统计');
 const itemMap=new Map(book.items.map(i=>[i.id,i.name]));
 for(const row of result.items){if(row.items.some(id=>!itemMap.has(id)))throw Error('统计装备不属于本赛季资料，拒绝映射');row.items=row.items.map(id=>itemMap.get(id));row.unit_id=heroId}
 if(!result.items.length)throw Error('该棋子或赛季尚无可核实的三件套统计');
 result.metadata.source_url=url;result.metadata.retrieved_at=new Date().toISOString();result.metadata.mode_supported=false;result.metadata.static_patch=book.metadata.patch;result.metadata.statistics_patch=null;
 return result;
}

const LINEUP_TIERS={'0':'大师以上','1':'钻石以上','255':'全部段位'};
function normalizeLineups(payload,book,now=Date.now(),tier='0'){
 if(!Object.hasOwn(LINEUP_TIERS,tier))throw Error('未经核实的阵容分段');
 const expected=SEASONS[book?.season];if(!expected||book.metadata?.status!=='official-browser'||String(book.metadata.upstream_mode)!==expected.mode||book.metadata.upstream_season!==expected.season)throw Error('阵容赛季身份未经核实');
 const packet=payload?.data;if(payload?.result!==0||!Array.isArray(packet)||packet.length!==1||packet[0]?.code!==0)throw Error('官方阵容响应失败或格式变更');
 const data=packet[0].data,date=String(data?.dtstatdate??'');
 if(!/^\d{8}$/.test(date))throw Error('官方阵容没有有效统计日期');
 const stamp=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8)),start=Date.parse(book.metadata.version_start_time);
 if(new Date(stamp).toISOString().slice(0,10).replace(/-/g,'')!==date||!Number.isFinite(start)||stamp<start||stamp>now+86400000||now-stamp>3*86400000)throw Error('阵容日期无效、过期或早于资料版本');
 if(!Array.isArray(data.main_traits_data)||!data.main_traits_data.length)throw Error('官方暂无阵容统计');
 const heroes=new Map([...book.champions,...(book.forms||[])].map(h=>[h.id.slice(1),h.name]));
 const traits=new Map((book.traits||[]).flatMap(t=>(t.upstream_ids||[]).map(id=>[id,t.name])));
 const output=[],seen=new Set();let excluded=0,groupNumber=0;
 const equipment=new Map(book.items?.map(i=>[i.id,i.name])||[]);
 const number=(v,label)=>{if((typeof v!=='string'&&typeof v!=='number')||String(v).trim()===''||!Number.isFinite(Number(v)))throw Error('阵容'+label+'无效');return Number(v)};
 for(const group of data.main_traits_data){
  groupNumber++;
  if(!Array.isArray(group?.info?.list))throw Error('官方阵容分组结构变更');
  for(const row of group.info.list){
   if(!Array.isArray(row.lineup)||!row.lineup.length||row.lineup.length>12)throw Error('阵容棋子结构无效');
   const ids=row.lineup.map(String),main=row.main_trait_group;
   if(new Set(ids).size!==ids.length||ids.some(id=>!heroes.has(id))||!Array.isArray(main)||!main.length||main.some(t=>!traits.has(String(t.trait_id)))){excluded++;continue}
   const win=number(row.top_1_rate,'登顶率'),top4=number(row.top_4_rate,'前四率'),avg=number(row.avg_rank,'排名'),uses=number(row.use_num,'使用次数');
   if(win<0||win>top4||top4>1||avg<1||avg>8||!Number.isSafeInteger(uses)||uses<1)throw Error('阵容统计超出范围');
   // A group aggregate and its variants overlap. Only keep variant rows, never sum them.
   const variant=number(row.lineup_rank,'变体编号');if(!Number.isSafeInteger(variant)||variant<1||typeof group.id!=='string'||!group.id)throw Error('阵容变体身份无效');
   const key=JSON.stringify([group.id,variant]);
   if(seen.has(key))throw Error('官方阵容变体重复');seen.add(key);
   output.push({key,group_number:groupNumber,variant,core_units:(row.core_chess||[]).map(id=>heroes.get(String(id))).filter(Boolean),equipment:(row.main_c_chess_equip||[]).map(id=>equipment.get(String(id))||'未映射装备 '+String(id)),units:ids.map(id=>heroes.get(id)),name:[...new Set(main.map(t=>traits.get(String(t.trait_id))))].join(' / '),win_rate:win,top4_rate:top4,average_rank:avg,use_count:uses,stat_date:date});
  }
 }
 if(!output.length)throw Error('没有能与目标赛季棋子和羁绊同时对应的阵容');
 return {schema:'jcc-lineup-rates/v1',metadata:{game:'jcc-cn',season:book.season,static_patch:book.metadata.patch,statistics_patch:null,stat_date:date,retrieved_at:new Date(now).toISOString(),queue_id:book.season==='ink'?'2030':'31',tier_part:tier,mode:book.season==='ink'?'标准排位（官网场景2030）':'官方默认队列（玩法名称未核实）',rank:LINEUP_TIERS[tier],excluded_variants:excluded},comps:output};
}
async function readLineups(book,fetcher,tier='0'){
 if(!Object.hasOwn(LINEUP_TIERS,tier))throw Error('未经核实的阵容分段');
 const url='https://mlol.qt.qq.com/go/jgame/common_proxy_v2';
 const expected=SEASONS[book?.season];if(!expected||book.metadata?.upstream_season!==expected.season||String(book.metadata?.upstream_mode)!==expected.mode)throw Error('阵容赛季身份未经核实');
 const queue=book.season==='ink'?'2030':'31';
 const response=await fetcher(url,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({req_group:[{req_alias:'lineup_group_list',req_params:{queue_id:queue,tier_part:tier,time_type:'1',version_id:'v6'}}]}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('官方阵容暂不可用（HTTP '+response.status+'）');
 const body=await response.text();if(body.length>5000000)throw Error('官方阵容响应超过大小限制');
 const result=normalizeLineups(JSON.parse(body),book,Date.now(),tier);result.metadata.source_url=url;return result;
}
const api={selectVersion,catalog,readOfficial,normalizeRates,readBuilds,normalizeLineups,readLineups};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChanchanOfficial=api;
})(typeof globalThis!=='undefined'?globalThis:this);
