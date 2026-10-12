const assert=require('node:assert/strict');const api=require('./match-data.js');
function row(id,patch='fixture-a',mode='fixture-standard',rank='fixture-rank'){return {id,game:'jcc-cn',season:'nature',patch,mode,rank,placement_scale:8,placement:1,played_at:'2026-01-01T00:00:00Z',board:[{unit:'fixture-unit',items:['C','A','B']},{unit:'fixture-tank',items:[]}]}}
let a=row('fixture-1'),b={...row('fixture-2'),placement:8};let stats=api.aggregate([a,b]);assert.equal(stats.comps.length,1);assert.deepEqual([stats.comps[0].sample_count,stats.comps[0].win_count,stats.comps[0].top4_count,stats.comps[0].rank_sum],[2,1,1,9]);assert.equal(stats.items[0].sample_count,2);assert.deepEqual(stats.items[0].items,['A','B','C']);
assert.equal(api.merge([a],[a]).duplicates,1);assert.equal(api.aggregate([a,a]).comps[0].sample_count,1);
assert.throws(()=>api.merge([a],[{...a,placement:2}]),/冲突/);
assert.equal(api.aggregate([a,row('p','fixture-b'),row('m','fixture-a','fixture-other'),row('r','fixture-a','fixture-standard','fixture-other-rank'),{...row('s'),season:'ink'}]).comps.length,5);
assert.throws(()=>api.validate({...a,placement_scale:4}),/四队/);assert.throws(()=>api.validate({...a,game:'tft'}),/国服/);
assert.throws(()=>api.validate({...a,board:[...a.board,a.board[0]]}),/重复/);
assert.throws(()=>api.validate({...a,played_at:'2026-01-01'}),/时间/);
assert.throws(()=>api.validate({...a,played_at:'2999-01-01T00:00:00Z'}),/未来/);
let four={...a,board:[{unit:'fixture-unit',items:['A','B','C','D']}]};assert.equal(api.aggregate([four]).items.length,0);assert.equal(api.aggregate([four]).comps.length,1);
let ci=api.interval(1,1);assert.ok(ci[0]<0.3&&ci[1]<=1);assert.equal(api.interval(0,0),null);
console.log('PASS: real-observation aggregation, deduplication, conflict detection, season/patch/mode/rank isolation, four-item exclusion, team-rank rejection and uncertainty');
