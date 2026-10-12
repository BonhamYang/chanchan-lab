# 授权数据自动更新（准备完成；尚未激活）

本项目提供每日定时的 JSON 数据接入管道。**现阶段未获取第三方数据接口许可，也没有配置任何数据提供方，运行时将明确 SKIP，不会生成虚假胜率。**

## 接通真实数据所需

1. 与数据提供方确认允许“获取、存储、公开展示和定期更新金铲铲国服统计”。
2. 获得提供方的 HTTPS JSON 下载地址，数据格式必须满足 `validate_snapshot.py`。
3. 仅在授权生效后，在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：
   - Secret: `AUTHORIZED_SNAPSHOT_URL` = 已授权的 HTTPS JSON 地址（可能带只读查询凭证）
   - Variable: `AUTHORIZED_DATA_HOST` = 该地址对应的域名（不含 https://、路径、端口）
4. GitHub Actions → `Refresh authorized game statistics` → Run workflow，可手动验证；定时每天 02:20 UTC（北京时间 10:20）检查。
5. 文件仅在结构和样本计数校验通过后写入 `data/snapshot.json`，发生错误时保留原快照、不提交。

## 业务规则

- `metadata.status` 应为 `authorized`，包括 `provider`、`license_reference`、`generated_at`；这些字段**不能替代人工确认许可**。
- 每条阵容／三件套包含 `season`, `patch`, `mode`（数据源给出的真实模式标识）, `rank`（数据源给出的真实分段标识）, `name`, `sample_count`, `top4_count`, `win_count`, `rank_sum`；三件套还须有 `unit` 和长度为 3 的 `items` 数组。
- 不混合赛季、游戏版本、模式、分段；公开快照必须逐条提供 `mode` 和 `rank`，不自行猜测模式标识。既有个人浏览器导入文件可省略，但前端必须明确显示“未标注”。
- GitHub Actions 写入仓库后，Render 自动部署需要 webhook 正常；当前该连接尚未稳定，可能需手动部署。
- 当前不会探测来源站点的隐藏 API、绕过访问控制、执行批量网页抓取。

## 安全

仅接受显式批准域名的 HTTPS 链接，禁止跳转，最大 5 MB，下载超时 20 秒，校验失败不更新数据文件。不要把私有 API token 放在公开仓库的任何源文件中。

## 2026-10-12 更新门槛与回退

每日 GitHub Actions 按 UTC 02:20（北京时间 10:20）检查授权快照。没有配置来源时跳过，不代表真实数据正在更新。

配置要求：
- Secret `AUTHORIZED_SNAPSHOT_URL`：经许可的 HTTPS JSON 地址。
- Variables `AUTHORIZED_DATA_HOST`、`AUTHORIZED_DATA_PROVIDER`、`AUTHORIZED_LICENSE_REFERENCE`：人工核实的主机、来源名称及许可引用。
- 快照 metadata 必须包含 `game: "jcc-cn"`、`status: "authorized"`、上述 provider/license_reference 及带时区 generated_at。

拒绝条件：重定向、超 5MB、超过 48 小时、未来时间、时间倒退、来源/许可不匹配、空快照、不完整模式/段位、重复三件套、统计计数不可能或超 JavaScript 安全整数。仅通过验证后原子替换；下载或校验失败保留已有快照，工作流报错。

胜率为登顶数/样本数，前四率为前四数/样本数，平均名次为名次总和/样本数。数据按赛季、补丁、模式、段位、棋子及规范化三件套分别存储，不跨维度求和。当前名次模型仅用于八名个人排名，双人模式必须由供应商明确提供个人排名口径；四队名次不得直接套用八名模型。样本指供应商聚合观察数，未宣称是去重对局数。

schema 校验不证明法律授权，也不证明上游统计无偏差。不得用 metadata 自我声明代替供应商许可。
