# GitHub 对标项目源码调研（2026-10-10）

## 1. JinChanChanTool

仓库：https://github.com/XJYdemons/JinChanChanTool

实际查看源码：
- `SourceCode/JinChanChanTool/Services/RecommendedEquipment/CrawlingService.cs`
- `SourceCode/JinChanChanTool/Services/LineupCrawling/LineupCrawlingService.cs`
- `Documents/第4章 自定义赛季信息.md`
- `LICENSE`

发现：
- 装备推荐流程读取 TFT 第三方统计站的 unit_detail，解析三件套 Builds、样本数与八名次计数，通过样本阈值和排名综合排序。
- 阵容流程分三个阶段：阵容聚类元信息、统计指标、标签和站位。阵容登顶率按 1 名样本 / 阵容样本计算，前四率按前四位样本之和 / 阵容样本计算，平均名次是名次加权和 / 样本数。
- 使用第三方 TFT 统计 API 的转发地址，并不能据此证明包含金铲铲国服手游数据。此接口的授权、稳定性、历史赛季覆盖、实际游戏数据均未核实；项目不会擅自接入。
- README 许可徽章和根目录 `LICENSE` 文件不一致：徽章标 MIT，实际 LICENSE 为 GNU GPL 3.0。出于合规性考虑，不复制该项目代码。

## 2. jcc-recommander

仓库：https://github.com/afzw/jcc-recommander

实际查看源码：
- `jcc-recommander-server/scripts/hero-data-scrape.py`
- `jcc-recommander-server/src/services/hero.ts`
- `jcc-recommander-web/src/services/hero.ts`

发现：
- 使用 Playwright 访问金铲铲官网英雄详情页面，脚本中硬编码了旧赛季 `editionUrl = '13,S14,14.4.24'` 和棋子 ID 范围。
- Python 输出英雄名称、羁绊、头像 URL，Node 服务解析并保存；没有在这些文件中发现三件套胜率统计模型。
- 旧赛季版本写死，所以不宜直接用于自然之力或画之灵。
- 未在仓库根目录找到 `LICENSE` 文件，不能默认允许代码复制或数据转载。

## 已独立落地

- `tools/aggregate_placements.py`：不联网，接收已授权统计的八名次聚合直方图，输出样本量、登顶数、前四数、名次总和。
- `test_aggregate_placements.py`：合法直方图、负值、缺失授权状态与零样本测试。
- 继续保持赛季隔离、字段验证与“无可靠数据不编造”的原则。

## 尚未解决

- 提供金铲铲国服自然之力／画之灵聚合战绩统计的明确授权数据来源。
- 赛季棋子、装备静态资料的准确映射及展示许可。
- 真实三件套组合数据的可信样本量、版本、模式、分段维度。

## 注

研究和参考开源实现，不等于公开数据使用许可；这里只是技术笔记，不会自动执行相关第三方站点请求。
