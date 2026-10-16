# GitHub 同类项目第二轮源码核验

核验日期：2026-10-16。检索几十个候选，拉取并静态检查 9 个仓库；未执行其安装脚本、爬虫或自动操作代码。未复制第三方数据进入公开站点。

## 最重要的发现

最接近本项目的是 [hy123666/Jcc-coach](https://github.com/hy123666/Jcc-coach)。它将腾讯官方静态资料、官方大数据 Ranking、阵容推荐组成信息分别管理，更新失败不激活候选快照。核心文件：

- `tools/sync-jcc-live-rankings.mjs`：官方统计调用、日期绑定、覆盖率和组合装备字段。
- `tools/jcc_official_source_dictionary.mjs`：官网版本、棋子和羁绊来源字典。
- `tools/jcc_live_rankings_generation_store.mjs`：不可变快照与发布切换。
- `NOTICE.md`：第三方游戏数据不在代码许可授权范围内。

## 本次独立验证（不是只读 README）

1. 官网排行榜页面 `https://jcc.qq.com/zmjkzone/page/datarank/` GET 成功。读取页面直接引用的 `datarank.81142f81.js`，确认它包含官方装备统计域名及 `equip_rank` / `get_hero_strength_trend` 调用。
2. 官网版本索引 `https://game.gtimg.cn/images/lol/act/jkzlk/js/config/versiondataconfig.js` GET 成功。按中文赛季名称和 `is_newest_version` 筛选，获得如下内部版本映射；这些是本次观察，不是未来版本常量：

| 本地赛季 | 官方 mode | 官方 season | 最新静态版本 | 启用日期 |
|---|---|---|---|---|
| 自然之力 | 18 | S19 | 18.18.3 | 2026-09-28 |
| 画之灵返场 | 11 | S100030 | 18.11.1 | 2026-09-29 |

历史画之灵是 S12，不能取代 S100030 返场；mode、season、统计 set_id、battle_type 含义不同，不按字符串相似性映射。

3. 无登录、无 Cookie、无伪造 Origin/Referer，仅以项目审计 User-Agent 发出一次 `POST https://mlol.qt.qq.com/go/jgame/equip_rank`（tier_part=0，battle_type=31）。业务 result=0；返回 `data.dtstatdate` 与 `data.list`。装备行含 `equip_id/use_rate/use_count/top4_rate/top1_rate/hero_rank/top_3_hero`。本次不复制统计值，只记录字段和响应状态。
4. 发出一次 `POST https://mlol.qt.qq.com/go/jgame/get_hero_equip_ranking`（heroid=1500，tier_part=0，set_id=18，time_type=1）。业务 result=0，统计日期 **20261015**；`combine_itemid_details` 返回 10 条组合，装备数含 2 与 3。字段为 `equips/playrate/top4_rate/top1_rate/avg_rank`，**没有组合样本量或名次计数**。不能从该结果推导每个组合的真实分母。

请求成功不证明：当前英雄必然属于目标赛季、set_id 一定生效、battle_type 可自由映射两种玩法、接口保证长期开放、允许镜像或商业转载。需要以官方静态棋子映射、不同赛季对照及条款继续验证；此次没有遍历英雄或批量拉取榜单。

## 九个仓库的判断

| 项目 | 实现与来源 | 对本项目的判断 |
|---|---|---|
| [hy123666/Jcc-coach](https://github.com/hy123666/Jcc-coach) | 官方静态索引 + mlol.qt.qq.com Ranking + 阵容配方；快照、日期绑定、来源审计 | 最高优先级技术参考；代码为 PolyForm Noncommercial，游戏资料另行保留权利 |
| [2300969-star/jcc-s18-research-lab](https://github.com/2300969-star/jcc-s18-research-lab) | 官方资料 + 确定性战斗模拟，研究的是怪兽入侵/星神 | MIT 代码可研究；虚拟战斗结果不是国服排位胜率，S18 名称不能直接匹配自然之力 |
| [sanji0114/jcc-agent](https://github.com/sanji0114/jcc-agent) | S16 官方原始 JSON + DataTFT 统计 + 游侠攻略，RAG/知识图谱 | 历史赛季；DataTFT 映射混用风险，不能直接导入目标赛季 |
| [haoooowa/jcc-assistant](https://github.com/haoooowa/jcc-assistant) | OCR + Data Dragon/CommunityDragon + 攻略站抓取 | 静态资料主要是 TFT；不作为国服图鉴来源 |
| [SevenGuns/jinchanchan-helper](https://github.com/SevenGuns/jinchanchan-helper) | 旧 Vue 项目，README 默认工程说明和 2021 年截图 | 未找到当前目标赛季和可靠统计证据 |
| [geekaboo93/golden_spatula_ai_skill](https://github.com/geekaboo93/golden_spatula_ai_skill) | MIT 的指令包和来源核对规则 | 不是数据库或战绩 API |
| [Go0seTL/leshen-jcc-data](https://github.com/Go0seTL/leshen-jcc-data) | 只有阵容 JSON/图片；updatedAt=2026-10-15 20:57 | 近期更新是线索，但缺少完整来源链和许可证，不能据时间判定可复用 |
| [SmileKl/jjc-junshi-feed](https://github.com/SmileKl/jjc-junshi-feed) | 阵容骨架/棋子/羁绊/强化 JSON；元数据指向 jcc.np5.top，含 dataj 来源字段 | 版本为18.18.1c；不是当前18.18.3，也未核实许可；阵容骨架不等于实战统计 |
| [yadangadam2021-lab/jcc-report](https://github.com/yadangadam2021-lab/jcc-report) | 单个 index.html | 未在该文件查到 fetch/API/样本字段等可复用实时数据管线证据 |

## 下一步落地顺序

1. 静态资料从官方版本索引精确发现两个赛季的 chess/trait/equip URL，采用独立编写的解析器；不搬旧赛季或 TFT 资料。先核实具体内容、条款和展示范围。
2. 官方 Ranking 与棋子装备接口优先验证，先做少量有界请求，核实目标赛季、日期和模式参数确实生效；不直接运行第三方的并发遍历脚本。
3. 数据模型支持“来源只提供百分比，样本量未提供”的记录。不得将百分比反算成 win_count/top4_count/sample_count，或假装能与自有名次直方图合并。
4. 两件装备组合不显示为三件套；三件套只使用完整三装备组合。组合百分比与单件装备推荐分开。
5. 全服公开统计、个人实战、模拟输出分开。保持已完成的失败回退、日期及版本隔离。
6. 技术可访问与使用许可分别核实。邮件不是验证接口的前置条件，但接口可读也不自动授予公开镜像权。

## 本次检查的提交

- [2300969-star/jcc-s18-research-lab@1bd8cb76a6fc](https://github.com/2300969-star/jcc-s18-research-lab/tree/1bd8cb76a6fcd72f164142b712da2783ba926565)
- [Go0seTL/leshen-jcc-data@8bb9db9bc3ca](https://github.com/Go0seTL/leshen-jcc-data/tree/8bb9db9bc3cac07528af216f36d6e260185c64a6)
- [SevenGuns/jinchanchan-helper@cf708bbb56c4](https://github.com/SevenGuns/jinchanchan-helper/tree/cf708bbb56c4d3168ec9fdb3df4d4bdf5d70b8c7)
- [SmileKl/jjc-junshi-feed@7539a944e09a](https://github.com/SmileKl/jjc-junshi-feed/tree/7539a944e09a8f0c0b2dbb24f7a1c70acb4593c2)
- [geekaboo93/golden_spatula_ai_skill@897967e93240](https://github.com/geekaboo93/golden_spatula_ai_skill/tree/897967e93240030ab2c8fefa8a6e0047f6050de0)
- [haoooowa/jcc-assistant@d8dd8c5d1dcb](https://github.com/haoooowa/jcc-assistant/tree/d8dd8c5d1dcb658b14bf49cc08ac04f460b1f9a5)
- [hy123666/Jcc-coach@31c95315843a](https://github.com/hy123666/Jcc-coach/tree/31c95315843ae7999f12fd0866b4723d0b48e1c7)
- [sanji0114/jcc-agent@fa81eb86301f](https://github.com/sanji0114/jcc-agent/tree/fa81eb86301fd30f6c857e6ade6ab4484c7924d4)
- [yadangadam2021-lab/jcc-report@68bc17020417](https://github.com/yadangadam2021-lab/jcc-report/tree/68bc170204174267da2a0cc361d22d3445531e72)
