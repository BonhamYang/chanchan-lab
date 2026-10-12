# 铲铲实验室 (Chanchan Lab)

在现有项目上开发的金铲铲国服阵容与装备统计助手，支持自然之力及画之灵的数据结构。

网站：https://chanchan-lab.onrender.com

## 已实现

阵容统计排序与赛季/版本/模式/段位筛选、三件套查询、CSV 名次计数聚合、浏览器本地导入、图鉴与阵容编辑器、授权快照更新校验及只读 HTTP 服务。

**两个赛季公开图鉴和国服真实胜率仍未接入**。图鉴/编辑器需要合法的本地导入资料；统计工具需要合法取得的样本。没有凭空生成数据，页面及工具可用不等于已提供真实榜单。

## 运行与验证

```sh
python server.py
python -m unittest discover -v
python -m unittest discover -s tests -v
node test_import_stats.js
node --check catalog.js
node --check item-analyzer.js
node --check import-stats.js
```

默认端口 8765，Render 使用环境变量 PORT。

## 数据接入

查看 DATA_SOURCES.md、DATA_PIPELINE.md、STATIC_CATALOG_IMPORT.md 和 CSV_IMPORT_GUIDE.md。

公开统计只能接入独立核实且允许存储与展示的金铲铲国服数据。TFT 国际服及历史返场前版本不能替代目标数据。不要提交密钥、个人信息或未经许可的数据。
