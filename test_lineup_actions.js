const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),api=require('./official-data.js');
const book={season:'nature',metadata:{status:'official-browser',upstream_mode:'18',upstream_season:'S19',patch:'fixture',version_start_time:'2020-01-01'},champions:[{id:'11500',name:'fixture-unit',cost:1,traits:['fixture-trait']}],forms:[{id:'11501',name:'fixture-unit',cost:1,traits:['fixture-trait']}],traits:[{name:'fixture-trait',breakpoints:[1,2]}]};
const facts=api.boardDetails(['11500','11501'],book);assert.equal(facts.synergies[0].count,1);assert.equal(facts.synergies[0].active,1);assert.throws(()=>api.boardDetails(['wrong-season-id'],book),/不属于/);assert.throws(()=>api.boardDetails(['11500','11500'],book),/身份/);
const storage=new Map(),els={};for(const id of ['season','tier','refresh','status','actionStatus','search','sort','minimum','more','count','results'])els[id]={value:'',textContent:'',innerHTML:'',disabled:false,addEventListener(){},setAttribute(){}};
els.season.value='nature';els.tier.value='0';els.sort.value='top4_rate';els.minimum.value='0';
const date=new Date().toISOString().slice(0,10).replace(/-/g,''),row={...facts,key:'fixture',name:'fixture',units:['fixture-unit'],use_count:100,top4_rate:.5,win_rate:.1,average_rank:4};
storage.set('cc_official_lineups_by_scope',JSON.stringify({'nature|255':{schema:'jcc-lineup-rates/v1',metadata:{game:'jcc-cn',season:'nature',tier_part:'255',static_patch:'fixture',stat_date:date},comps:[row]}}));
storage.set('cc_local_catalog',JSON.stringify({nature:book}));storage.set('cc_lineup',JSON.stringify({nature:['11501'],ink:['ink-untouched']}));
let fail=false;const location={search:'?season=nature&tier=255',href:''};
const context={URLSearchParams,document:{getElementById:id=>els[id]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{location,fetch(){}},ChanchanOfficial:{...api,readBuilds:async(season,id,b,fetch,tier)=>{assert.equal(tier,'255');if(fail)throw Error('fixture outage');return {schema:'jcc-rate-only/v1',metadata:{game:'jcc-cn'},items:[{season,unit_id:id,tier_part:tier,unit:'fixture-unit',items:['a','b','c']}]}}}};
vm.runInNewContext(fs.readFileSync('official-lineups.js','utf8'),context);
const target=attrs=>({disabled:false,getAttribute:k=>attrs[k]??null});const click=t=>els.results.onclick({target:{closest:()=>t}});
(async()=>{
 await click(target({'data-edit':'0'}));assert.match(location.href,/catalog.html\?season=nature&tier=255/);assert.deepEqual(JSON.parse(storage.get('cc_lineup')).nature,['11500','11501']);assert.deepEqual(JSON.parse(storage.get('cc_lineup')).ink,['ink-untouched']);assert.deepEqual(JSON.parse(storage.get('cc_lineup_backup')).nature,['11501']);
 storage.set('cc_official_rates',JSON.stringify({schema:'jcc-rate-only/v1',items:[{season:'nature',unit_id:'11500',tier_part:'0'}]}));
 await click(target({'data-build':'11500'}));assert.match(location.href,/item-analyzer.html.*tier=255.*from=lineup/);assert.equal(JSON.parse(storage.get('cc_official_rates')).items.length,2);
 const saved=storage.get('cc_official_rates');fail=true;const button=target({'data-build':'11500'});await click(button);assert.equal(storage.get('cc_official_rates'),saved);assert.equal(button.disabled,false);assert.equal(els.season.disabled,false);assert.match(els.actionStatus.textContent,/fixture outage/);
 console.log('PASS: canonical synergy counts, invalid board rejection, context links, editor backup, other-season preservation, tier cache retention and failed query recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
