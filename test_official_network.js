const assert=require('node:assert/strict'),api=require('./official-data.js');
const url='https://game.gtimg.cn/fixture.json',options={credentials:'omit',redirect:'error'};
(async()=>{
 let calls=0,progress=[];
 const data=await api.requestJSON(url,options,async(u,o)=>{calls++;assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');assert.ok(o.signal);if(calls===1)throw new TypeError('Failed to fetch');return {ok:true,text:async()=>'{"fixture":true}'}},'官网棋子资料',1000,m=>progress.push(m));assert.equal(data.fixture,true);assert.equal(calls,2);assert.match(progress[1],/重试一次/);
 calls=0;await assert.rejects(()=>api.requestJSON(url,options,async()=>{calls++;throw new TypeError('Failed to fetch')},'官网版本索引',1000),e=>/官网版本索引/.test(e.message)&&/game.gtimg.cn/.test(e.message)&&/尚不能确定/.test(e.message));assert.equal(calls,2);
 calls=0;await assert.rejects(()=>api.requestJSON('https://mlol.qt.qq.com/fixture',{...options,method:'POST'},async()=>{calls++;throw new TypeError('Failed to fetch')},'官网阵容统计',1000),/官网阵容统计.*mlol.qt.qq.com/);assert.equal(calls,1);
 calls=0;await assert.rejects(()=>api.requestJSON(url,options,async()=>{calls++;return {ok:false,status:403}},'官网装备资料',1000),/403/);assert.equal(calls,1);
 await assert.rejects(()=>api.requestJSON(url,options,async()=>({ok:true,text:async()=>'<html>not JSON</html>'}),'官网羁绊资料',1000),/有效 JSON/);
 await assert.rejects(()=>api.requestJSON(url,options,async()=>{const error=new Error('timeout');error.name='TimeoutError';throw error},'官网装备资料',1000),/超过20秒/);
 console.log('PASS: GET one-retry recovery, stage/domain error details, POST not retried, HTTP/format errors not disguised, timeout labels');
})().catch(e=>{console.error(e);process.exitCode=1});
