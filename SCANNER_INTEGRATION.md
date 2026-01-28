# Scanner App Integration Guide

> **給掃描器 App 開發者的技術文件**
>
> 本文件說明 FRC 6998 Scouting PASS 產生的 QR Code 格式、壓縮方式、解碼流程，以及資料欄位定義。

---

## 目錄

1. [概述](#概述)
2. [QR Code 類型](#qr-code-類型)
3. [壓縮與解壓縮](#壓縮與解壓縮)
4. [資料格式（TSV）](#資料格式tsv)
5. [欄位定義](#欄位定義)
6. [縮寫對照表](#縮寫對照表)
7. [解碼範例程式](#解碼範例程式)
8. [常見問題](#常見問題)

---

## 概述

Scouting PASS 在每場比賽結束後會產生 **兩個 QR Code**：

| QR Code | 顏色 | 內容 | 用途 |
|---------|------|------|------|
| **Match Data QR** | 青色 (Cyan) | 比賽數據（不含路徑） | 主要資料 |
| **Auto Path QR** | 琥珀色 (Amber) | 自動階段路徑軌跡 | 補充資料 |

兩個 QR Code 都使用 **LZ-String 壓縮**，掃描後需要解壓縮才能取得原始 TSV 資料。

---

## QR Code 類型

### 1. Match Data QR（主要資料）

包含所有比賽數據，但**不包含 autoPath**（路徑資料太長會超出 QR 容量）。

**識別方式**：
- 顏色：青色背景白色前景
- 欄位數量：21 個欄位（Match 模式）

### 2. Auto Path QR（路徑資料）

僅包含比賽識別資訊和自動階段路徑。

**識別方式**：
- 顏色：琥珀色背景白色前景
- 欄位數量：4 個欄位
- 只有在使用者有繪製路徑時才會產生

---

## 壓縮與解壓縮

### 壓縮演算法

使用 [LZ-String](https://github.com/pieroxy/lz-string) 函式庫的 `compressToBase64` 方法。

**編碼端（Scouting PASS）**：
```javascript
import LZString from 'lz-string';

const tsvData = "John\t2026MSLR\tQM\t15\tR1\t6998\t...";
const compressed = LZString.compressToBase64(tsvData);
// compressed 就是 QR Code 的內容
```

### 解壓縮方法

**解碼端（Scanner App）**：
```javascript
import LZString from 'lz-string';

const scannedQRContent = "N4IgJg..."; // 掃描得到的字串
const tsvData = LZString.decompressFromBase64(scannedQRContent);
// tsvData = "John\t2026MSLR\tQM\t15\tR1\t6998\t..."
```

### LZ-String 函式庫

| 語言 | 套件/函式庫 |
|------|-------------|
| JavaScript/TypeScript | `npm install lz-string` |
| Python | `pip install lzstring` |
| Java | [lz-string-java](https://github.com/nicferrier/lz-string-java) |
| Swift | [LZString-Swift](https://github.com/pirkla/LZString-Swift) |
| Kotlin | [lzstring-kotlin](https://github.com/nicferrier/lz-string-java) |
| C# | [lz-string-csharp](https://github.com/nicferrier/lz-string-csharp) |

**重要**：務必使用 `decompressFromBase64`，不是普通的 `decompress`。

---

## 資料格式（TSV）

解壓縮後的資料是 **Tab-Separated Values (TSV)** 格式，以 `\t` (Tab) 分隔各欄位。

### 解析 TSV

```javascript
const tsvData = LZString.decompressFromBase64(qrContent);
const values = tsvData.split('\t');
// values[0] = scouterName
// values[1] = eventCode
// ...
```

### 資料類型轉換規則

| 原始類型 | TSV 輸出格式 | 範例 |
|----------|--------------|------|
| `boolean` | `1` 或 `0` | `true` → `1` |
| `number` | 數字字串 | `15` → `"15"` |
| `string` | 原始字串（Tab/換行轉空格） | `"Hello"` → `"Hello"` |
| `string[]` (陣列) | 逗號分隔 | `["A","B"]` → `"A,B"` |
| 空值/undefined | `None` | `""` → `"None"` |
| PathPoint[] | `x1,y1\|x2,y2\|...` | 見下方說明 |

### Path 格式說明

autoPath 是一個座標點陣列，轉換為字串格式：

```
x1,y1|x2,y2|x3,y3|...
```

- 每個點用 `|` 分隔
- 每個點的 x,y 用 `,` 分隔
- 座標為百分比 (0-100)，保留一位小數
- 空路徑輸出 `None`

**範例**：
```
40.5,50.0|42.3,48.2|45.0,45.5|50.0,40.0
```

---

## 欄位定義

### Match Data QR（TSV_SCHEMA_MATCH）

共 21 個欄位，按以下順序排列：

| 索引 | 欄位名稱 | 類型 | 說明 | 範例值 |
|------|----------|------|------|--------|
| 0 | `scouterName` | string | 偵察員姓名 | `"John"` |
| 1 | `eventCode` | string | 賽事代碼 | `"2026MSLR"` |
| 2 | `matchLevel` | string | 比賽等級（縮寫） | `"QM"` |
| 3 | `matchNumber` | number | 場次編號 | `15` |
| 4 | `alliance` | string | 聯盟位置 | `"R1"`, `"R2"`, `"R3"`, `"B1"`, `"B2"`, `"B3"` |
| 5 | `teamNumber` | string | 隊伍號碼 | `"6998"` |
| 6 | `autoClimbStatus` | string | 自動爬塔狀態 | `"None"`, `"Level1"`, `"Failed"` |
| 7 | `autoClimbTime` | number | 自動爬塔時間（秒） | `5.23` |
| 8 | `autoClimbSide` | string | 自動爬塔側 | `"None"`, `"Left"`, `"Center"`, `"Right"` |
| 9 | `teleClimbStatus` | string | 手動爬塔狀態 | `"None"`, `"Level1"`, `"Level2"`, `"Level3"`, `"Failed"` |
| 10 | `teleClimbTime` | number | 手動爬塔時間（秒） | `8.45` |
| 11 | `teleClimbSide` | string | 手動爬塔側 | `"None"`, `"Left"`, `"Center"`, `"Right"` |
| 12 | `bumpTrenchCount` | number | 跨越 Bump & Trench 次數 | `2` |
| 13 | `fuelDroppedOnBumpCount` | number | 穿越 Bump 時掉落 Fuel 次數 | `1` |
| 14 | `penaltyCount` | number | 犯規次數 | `1` |
| 15 | `minorPenalty` | boolean | 輕微犯規 | `1` 或 `0` |
| 16 | `majorPenalty` | boolean | 重大犯規 | `1` 或 `0` |
| 17 | `robotDied` | boolean | 機器人故障/倒下 | `1` 或 `0` |
| 18 | `almostTipped` | boolean | 差點傾倒 | `1` 或 `0` |
| 19 | `ridingOnBall` | boolean | 騎在球上 | `1` 或 `0` |
| 20 | `defenseRating` | number | 防守評分 (0-5) | `3` |
| 21 | `driverSkill` | number | 駕駛技術評分 (0-5) | `4` |
| 22 | `speedRating` | number | 速度評分 (0-5) | `4` |
| 23 | `comments` | string | 備註 | `"Very fast robot"` |

### Auto Path QR（TSV_SCHEMA_PATH）

共 4 個欄位：

| 索引 | 欄位名稱 | 類型 | 說明 | 範例值 |
|------|----------|------|------|--------|
| 0 | `eventCode` | string | 賽事代碼 | `"2026MSLR"` |
| 1 | `matchNumber` | number | 場次編號 | `15` |
| 2 | `teamNumber` | string | 隊伍號碼 | `"6998"` |
| 3 | `autoPath` | string | 路徑座標 | `"40.5,50.0\|42.3,48.2\|..."` |

### Pit Scouting QR（TSV_SCHEMA_PIT）

Pit 偵察使用不同的 schema，共 13 個欄位：

| 索引 | 欄位名稱 | 類型 | 說明 |
|------|----------|------|------|
| 0 | `scouterName` | string | 偵察員姓名 |
| 1 | `eventCode` | string | 賽事代碼 |
| 2 | `teamNumber` | string | 隊伍號碼 |
| 3 | `pitDriveTrain` | string | 底盤類型 |
| 4 | `pitMotorType` | string | 馬達類型 |
| 5 | `pitLength` | number | 機器人長度 |
| 6 | `pitWidth` | number | 機器人寬度 |
| 7 | `pitWeight` | number | 機器人重量 |
| 8 | `pitCanFuel` | boolean | 能否得 Fuel |
| 9 | `pitCanTowerL1` | boolean | 能否爬 L1 |
| 10 | `pitCanTowerL2` | boolean | 能否爬 L2 |
| 11 | `pitCanTowerL3` | boolean | 能否爬 L3 |
| 12 | `pitAutoNotes` | string | 自動階段備註 |

---

## 縮寫對照表

### matchLevel 縮寫

| 完整值 | 縮寫 |
|--------|------|
| `Practice` | `P` |
| `Quals` | `QM` |
| `Playoffs` | `PO` |
| `Test` | `X` |

### alliance 值

2026 賽季使用位置編號：
- 紅方：`R1`, `R2`, `R3`
- 藍方：`B1`, `B2`, `B3`

### climbSide 值

攀爬側選項：
- `None` - 未攀爬/無選擇
- `Left` - 左側
- `Center` - 中間
- `Right` - 右側

---

## 解碼範例程式

### JavaScript / TypeScript

```typescript
import LZString from 'lz-string';

// TSV Schema 定義（必須與 Scouting PASS 一致）
const TSV_SCHEMA_MATCH = [
  'scouterName', 'eventCode', 'matchLevel', 'matchNumber', 'alliance', 'teamNumber',
  'autoClimbStatus', 'autoClimbTime', 'autoClimbSide',
  'teleClimbStatus', 'teleClimbTime', 'teleClimbSide', 'bumpTrenchCount', 'fuelDroppedOnBumpCount',
  'penaltyCount', 'minorPenalty', 'majorPenalty',
  'robotDied', 'almostTipped', 'ridingOnBall',
  'defenseRating', 'driverSkill', 'speedRating',
  'comments'
];

const TSV_SCHEMA_PATH = ['eventCode', 'matchNumber', 'teamNumber', 'autoPath'];

function decodeMatchQR(qrContent: string): Record<string, string> {
  // 1. 解壓縮
  const tsvData = LZString.decompressFromBase64(qrContent);
  if (!tsvData) {
    throw new Error('Failed to decompress QR data');
  }

  // 2. 分割 TSV
  const values = tsvData.split('\t');

  // 3. 建立物件
  const result: Record<string, string> = {};
  TSV_SCHEMA_MATCH.forEach((key, index) => {
    result[key] = values[index] ?? 'None';
  });

  return result;
}

function decodePathQR(qrContent: string): Record<string, string> {
  const tsvData = LZString.decompressFromBase64(qrContent);
  if (!tsvData) {
    throw new Error('Failed to decompress QR data');
  }

  const values = tsvData.split('\t');
  const result: Record<string, string> = {};
  TSV_SCHEMA_PATH.forEach((key, index) => {
    result[key] = values[index] ?? 'None';
  });

  return result;
}

// 解析 Path 字串為座標陣列
function parsePath(pathString: string): Array<{x: number, y: number}> {
  if (pathString === 'None' || !pathString) {
    return [];
  }

  return pathString.split('|').map(point => {
    const [x, y] = point.split(',').map(Number);
    return { x, y };
  });
}

// 使用範例
const matchData = decodeMatchQR(scannedQRContent);
console.log(matchData.teamNumber);       // "6998"
console.log(matchData.alliance);         // "R1"
console.log(matchData.autoClimbSide);    // "Left"
console.log(matchData.teleClimbSide);    // "Center"

const pathData = decodePathQR(scannedPathQRContent);
const pathPoints = parsePath(pathData.autoPath);
console.log(pathPoints);  // [{x: 40.5, y: 50.0}, {x: 42.3, y: 48.2}, ...]
```

### Python

```python
import lzstring

TSV_SCHEMA_MATCH = [
    'scouterName', 'eventCode', 'matchLevel', 'matchNumber', 'alliance', 'teamNumber',
    'autoClimbStatus', 'autoClimbTime', 'autoClimbSide',
    'teleClimbStatus', 'teleClimbTime', 'teleClimbSide', 'bumpTrenchCount', 'fuelDroppedOnBumpCount',
    'penaltyCount', 'minorPenalty', 'majorPenalty',
    'robotDied', 'almostTipped', 'ridingOnBall',
    'defenseRating', 'driverSkill', 'speedRating',
    'comments'
]

TSV_SCHEMA_PATH = ['eventCode', 'matchNumber', 'teamNumber', 'autoPath']

def decode_match_qr(qr_content: str) -> dict:
    """解碼 Match Data QR Code"""
    lz = lzstring.LZString()
    tsv_data = lz.decompressFromBase64(qr_content)

    if not tsv_data:
        raise ValueError("Failed to decompress QR data")

    values = tsv_data.split('\t')
    return {key: values[i] if i < len(values) else 'None'
            for i, key in enumerate(TSV_SCHEMA_MATCH)}

def decode_path_qr(qr_content: str) -> dict:
    """解碼 Auto Path QR Code"""
    lz = lzstring.LZString()
    tsv_data = lz.decompressFromBase64(qr_content)

    if not tsv_data:
        raise ValueError("Failed to decompress QR data")

    values = tsv_data.split('\t')
    return {key: values[i] if i < len(values) else 'None'
            for i, key in enumerate(TSV_SCHEMA_PATH)}

def parse_path(path_string: str) -> list:
    """解析 Path 字串為座標列表"""
    if path_string == 'None' or not path_string:
        return []

    points = []
    for point in path_string.split('|'):
        x, y = map(float, point.split(','))
        points.append({'x': x, 'y': y})
    return points

# 使用範例
match_data = decode_match_qr(scanned_qr_content)
print(match_data['teamNumber'])       # "6998"
print(match_data['alliance'])         # "R1"
print(match_data['autoClimbSide'])    # "Left"
print(match_data['teleClimbSide'])    # "Center"

path_data = decode_path_qr(scanned_path_qr_content)
path_points = parse_path(path_data['autoPath'])
print(path_points)  # [{'x': 40.5, 'y': 50.0}, {'x': 42.3, 'y': 48.2}, ...]
```

### Swift (iOS)

```swift
import LZString

let TSV_SCHEMA_MATCH = [
    "scouterName", "eventCode", "matchLevel", "matchNumber", "alliance", "teamNumber",
    "autoClimbStatus", "autoClimbTime", "autoClimbSide",
    "teleClimbStatus", "teleClimbTime", "teleClimbSide", "bumpTrenchCount", "fuelDroppedOnBumpCount",
    "penaltyCount", "minorPenalty", "majorPenalty",
    "robotDied", "almostTipped", "ridingOnBall",
    "defenseRating", "driverSkill", "speedRating",
    "comments"
]

let TSV_SCHEMA_PATH = ["eventCode", "matchNumber", "teamNumber", "autoPath"]

func decodeMatchQR(_ qrContent: String) -> [String: String]? {
    guard let tsvData = LZString.decompressFromBase64(qrContent) else {
        return nil
    }

    let values = tsvData.components(separatedBy: "\t")
    var result: [String: String] = [:]

    for (index, key) in TSV_SCHEMA_MATCH.enumerated() {
        result[key] = index < values.count ? values[index] : "None"
    }

    return result
}

struct PathPoint {
    let x: Double
    let y: Double
}

func parsePath(_ pathString: String) -> [PathPoint] {
    if pathString == "None" || pathString.isEmpty {
        return []
    }

    return pathString.components(separatedBy: "|").compactMap { point in
        let coords = point.components(separatedBy: ",")
        guard coords.count == 2,
              let x = Double(coords[0]),
              let y = Double(coords[1]) else {
            return nil
        }
        return PathPoint(x: x, y: y)
    }
}
```

---

## 常見問題

### Q1: 為什麼有兩個 QR Code？

A: 因為 autoPath 資料可能很長（幾百個座標點），如果包含在主 QR Code 中會超出 QR Code 的容量限制。分成兩個 QR Code 可以確保資料完整傳輸。

### Q2: 如何判斷 QR Code 類型？

A: 解壓縮後計算欄位數量：
- 4 個欄位 → Auto Path QR
- 13 個欄位 → Pit Scouting QR
- 21+ 個欄位 → Match Data QR

或者檢查第一個欄位：
- 如果第一個欄位是 `eventCode` 開頭的賽事代碼（如 `2026MSLR`）→ 可能是 Path QR
- 如果第一個欄位是人名 → 可能是 Match/Pit QR

### Q3: 壓縮後的字串長度大約多少？

A: 一般來說：
- Match Data QR: 100-300 字元
- Auto Path QR: 50-500 字元（取決於路徑複雜度）
- Pit Scouting QR: 80-150 字元

### Q4: 如何處理中文字元？

A: TSV 中的中文字元（如 comments、scouterName）會保持原樣。LZ-String 會正確處理 Unicode 字元，解壓縮後直接就是原始中文。

### Q5: 空值如何表示？

A: 所有空值（空字串、null、undefined）都會轉換為字串 `"None"`。布林值 false 會轉換為 `"0"`，不會是 `"None"`。

### Q6: 路徑座標系統是什麼？

A: 路徑座標是**百分比座標**（0-100），相對於場地圖片的寬高。
- X: 0 = 左邊, 100 = 右邊
- Y: 0 = 上方, 100 = 下方

這樣可以確保在不同解析度的螢幕上都能正確顯示。

### Q7: alliance 欄位的格式是什麼？

A: 2026 賽季使用位置編號格式：
- 紅方位置：`R1`, `R2`, `R3`
- 藍方位置：`B1`, `B2`, `B3`

### Q8: climbSide 欄位是什麼意思？

A: 攀爬側記錄機器人攀爬時的位置（左/中/右），用於分析攀爬策略：
- `None` - 未攀爬或未記錄
- `Left` - 左側攀爬
- `Center` - 中間攀爬
- `Right` - 右側攀爬

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|----------|
| 1.1.0 | 2026-01-28 | **重大變更**：移除 autoFuel/teleFuel 欄位、alliance 改為 R1-R3/B1-B3 格式、新增 autoClimbSide/teleClimbSide 欄位、fuelDroppedOnBump 改為 fuelDroppedOnBumpCount (次數)、yellowCard/redCard 改為 minorPenalty/majorPenalty、移除 subjectiveNotes 欄位、Climb Time 改為持續計時 |
| 1.0.0 | 2026-01-26 | 初始版本，支援 Match/Pit/Path 三種 QR Code |

---

## 聯絡方式

如有問題，請聯絡 FRC 6998 團隊或在 GitHub 提出 Issue：
- GitHub: https://github.com/0908869905/FRC
