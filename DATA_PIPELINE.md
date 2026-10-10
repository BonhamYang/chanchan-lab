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
- 每条阵容／三件套包含 `season`, `patch`, `name`, `sample_count`, `top4_count`, `win_count`, `rank_sum`；三件套还须有 `unit` 和长度为 3 的 `items` 数组。
- 不混合赛季、游戏版本、模式、分段；需要数据源提供足够维度才能统计。
- GitHub Actions 写入仓库后，Render 自动部署需要 webhook 正常；当前该连接尚未稳定，可能需手动部署。
- 当前不会探测来源站点的隐藏 API、绕过访问控制、执行批量网页抓取。

## 安全

仅接受显式批准域名的 HTTPS 链接，禁止跳转，最大 5 MB，下载超时 20 秒，校验失败不更新数据文件。不要把私有 API token 放在公开仓库的任何源文件中。
