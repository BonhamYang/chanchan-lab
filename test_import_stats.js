// Offline behavioral tests for user-supplied, legally obtained CSV. No network calls.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const source=fs.readFileSync('import-stats.js','utf8');
const instrumented=source.replace('let converted=null;', 'return {convert,csvRows};\nlet converted=null;');
assert.notEqual(instrumented,source,'converter test hook not found');
const {convert,csvRows}=new Function('return '+instrumented)();
const head='season,patch,mode,tier,kind,name,unit,item1,item2,item3,placement,count';
const data=[
 head,
 'nature,18.3,standard,master,items,甲的装备,棋子甲,装备A,装备B,装备C,1,2',
 'nature,18.3,standard,master,items,甲的装备,棋子甲,装备C,装备A,装备B,5,3',
 'nature,18.3,alternate,master,items,甲的装备,棋子甲,装备C,装备A,装备B,1,6',
 'nature,18.3,standard,master,comps,测试阵容,,,,,1,1',
 'nature,18.3,standard,master,comps,测试阵容,,,,,8,3'
].join('\n');
const result=convert(data);
assert.equal(result.items.length,2,'combine gear permutations only within same mode');
assert.equal(result.comps.length,1);
assert.deepEqual([result.items[0].sample_count,result.items[0].win_count,result.items[0].top4_count,result.items[0].rank_sum],[5,2,2,17]);
assert.deepEqual([result.comps[0].sample_count,result.comps[0].top4_count,result.comps[0].rank_sum],[4,1,25]);
assert.deepEqual(csvRows('a,b\n"one,two","escaped ""quote"""\n')[1],['one,two','escaped "quote"']);
assert.throws(()=>convert(head+'\nnature,18.3,standard,master,comps,X,,,,,9,1'),/名次/);
assert.throws(()=>convert(head+'\nnature,18.3,standard,master,comps,X,,,,,1,-1'),/样本数/);
assert.throws(()=>convert(head+'\nnature,18.3,standard,master,items,X,,,,,1,1'),/缺少棋子或装备/);
assert.throws(()=>convert('season,season\nnature,nature'),/重复字段/);
console.log('PASS: CSV conversion, quote escaping, grouping by game mode, and invalid rows');
