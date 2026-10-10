# 静态赛季资料导入与核验

本项目 `tools/convert_cdragon.py` 是**离线候选转换工具**，用于参考 CommunityDragon 的 TFT 静态数据结构，不能自动认定为《金铲铲之战》自然之力或画之灵赛季。

官方 CommunityDragon 资料文档：https://github.com/CommunityDragon/Docs/blob/master/assets.md

## 使用说明

1. 手工核实目标数据的许可、版本、游戏模式和赛季映射，下载获得允许使用的 JSON。
2. JSON 可能包含 `setData` 多个赛季；**必须指定明确的 `--set-index`**，不能简单选择最新赛季。
3. 执行：

```bash
python tools/convert_cdragon.py --input source.json --set-index 0 --season nature --output candidates/nature.json
python -m unittest test_convert_cdragon.py
```

4. 结果标识 `candidate-unverified`，只含从该 `setData` 提取的棋子，`items` 为空。**不会覆盖线上 data/catalog/**。
5. 需要人工逐项比对金铲铲同名棋子、费用、羁绊、版本、特殊赛季英雄、授权条款后，才能整理为公开版图鉴数据。
6. 如需添加装备，必须对装备 ID、类别、合成路线、可使用模式、来源许可单独核验，不能把整个 TFT `items` 全量挂到一个金铲铲赛季。

## 状态

- 已完成：离线转换器、基础单元测试、双赛季空数据接口、阵容编辑器、费用及类别筛选、羁绊数量计数。
- 尚未完成：国服静态名单比对、允许转载的游戏图片、国服胜率样本、外部数据授权、全链路自动日更。
- 本文不承诺某个 TFT setData 与金铲铲赛季完全相同。
