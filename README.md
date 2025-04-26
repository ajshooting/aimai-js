# aimai-js

[![npm version](https://badge.fury.io/js/aimaijs.svg)](https://badge.fury.io/js/aimaijs) <!-- TODO: Replace 'aimaijs' with your actual npm package name -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Or Apache-2.0 -->
<!-- Add more badges if you like (e.g., build status, coverage) -->

**日本語テキストのための高機能な曖昧検索 (Fuzzy Search) モジュール**

`aimai.js` は、日本語の特性を考慮した曖昧検索機能を提供する Node.js ライブラリです。
[Fuse.js](https://fusejs.io/) のような既存のライブラリにインスパイアされつつ、以下の日本語特有の課題に対応します。

* **表記揺れ吸収:** ひらがな、カタカナ、半角カナ、全角/半角英数字記号を同一視して検索します。
* **読み仮名検索:** 漢字を含むテキストを、その読み仮名（ひらがな）でも検索できます (内部で [Kuromoji.js](https://github.com/takuyaa/kuromoji.js) を使用)。
* **高度なオプション:**
  * 検索結果のハイライト表示用情報の提供
  * ローマ字入力による検索
  * 単語単位での検索 (予定)
  * 異体字・旧字体の正規化 (予定)

## ✨ 特徴 (Features)

* **日本語に最適化:** ひらがな/カタカナ/半角カナの差異、読み仮名を吸収。
* **強力な曖昧検索:** [Levenshtein距離](https://ja.wikipedia.org/wiki/%E3%83%AC%E3%83%BC%E3%83%99%E3%83%B3%E3%82%B7%E3%83%A5%E3%82%BF%E3%82%A4%E3%83%B3%E8%B7%9D%E9%9B%A2) (`fastest-levenshtein` を利用) に基づくスコアリング。
* **事前インデックス化:** `kuromoji.js` を利用した読み仮名取得と正規化を事前に行い、軽量なJSONインデックスファイルを生成。これにより、検索時のパフォーマンスが大幅に向上し、ブラウザなどのリソースが限られた環境でも高速に動作します。
* **柔軟な検索対象:** 元のデータが文字列配列でもオブジェクト配列でも、生成されたインデックスファイルを使って検索可能。
* **軽量＆高速:** 検索処理自体は軽量なインデックスデータに対して行われます。
* **TypeScriptフレンドリー:** 完全な型定義を提供。

## ⚠️ 重要: 事前インデックス生成

このライブラリは、最高のパフォーマンスを得るために、検索対象データの **事前インデックス生成** を前提としています。`kuromoji.js` による日本語の解析（読み仮名取得）は時間がかかるため、検索時に毎回行うのではなく、ビルドプロセスやデータ準備段階で一度だけ実行します。

1. **インデックス生成スクリプトの実行:**
   * まず、プロジェクトをビルドして JavaScript ファイルを生成します (`yarn build` や `npm run build` など)。
   * 次に、提供されているインデックス生成スクリプトを実行します。

   ```bash
   # 例: data/my_list.json から data/my_index.json を生成
   # 文字列配列の場合
   yarn generate:index --input=./data/my_list.json --output=./data/my_index.json

   # オブジェクト配列で 'title' キーを対象とする場合
   yarn generate:index --input=./data/my_objects.json --output=./data/my_index.json --key=title
   ```

   * `--input`: 元のデータ (JSON配列) ファイルへのパス。
   * `--output`: 生成されるインデックスファイル (JSON) の出力パス。
   * `--key` (オプション): 入力がオブジェクト配列の場合、検索対象とするテキストが含まれるキー名。

2. **生成されたインデックスの使用:**
   生成された `my_index.json` ファイルをアプリケーションに読み込み、`Aimai` クラスのコンストラクタに渡します。

## 💿 インストール (Installation)

```bash
yarn add aimaijs
# or
npm install aimaijs

# kuromoji.js も必要です (インデックス生成時に使用)
yarn add kuromoji
# or
npm install kuromoji
```

## 🚀 使い方 (Usage)

### ステップ 1: インデックスファイルの準備

上記「事前インデックス生成」セクションに従って、検索対象データからインデックスファイル（例: `indexedData.json`）を生成します。

`indexedData.json` の例:

```json
[
  {
    "original": "東京都",
    "normalized": "とうきょうと", // normalize() 適用後
    "reading": "とうきょうと"     // getReading() -> normalize() 適用後
  },
  {
    "original": "とうきょうと",
    "normalized": "とうきょうと",
    "reading": "とうきょうと"
  },
  {
    "original": "トウキョウト",
    "normalized": "とうきょうと",
    "reading": "とうきょうと"
  },
  // ... more items
]
```

### ステップ 2: Aimai を使った検索

```typescript
import Aimai from 'aimaijs';
// import { IndexedItem } from 'aimaijs/dist/types'; // 型定義をインポートする場合

// 事前に生成したインデックスファイルを読み込む (Node.js の例)
import * as fs from 'fs';
const indexedData = JSON.parse(fs.readFileSync('./data/indexedData.json', 'utf-8'));
// ブラウザの場合は fetch などで読み込む

// 1. Aimaiインスタンスを作成 (インデックスデータを渡す)
const aimai = new Aimai(indexedData, { /* オプション */ });

// 2. 検索を実行
const results1 = await aimai.search('とうきょう'); // 検索クエリは内部で正規化される
console.log(results1);
/*
[
  // 結果は original の値を含む
  { item: '東京都', score: 1, refIndex: 0 },
  { item: 'とうきょうと', score: 1, refIndex: 1 },
  { item: 'トウキョウト', score: 1, refIndex: 2 },
  // ...
]
*/

const results2 = await aimai.search('kyoto'); // ローマ字検索も可能 (useRomajiSearch: true の場合)
console.log(results2);
/*
[
  // 京都関連の結果
]
*/

// --- オブジェクト配列から生成したインデックスの場合 ---
// indexedBooks.json の例:
// [
//   { "original": { "title": "走れメロス", "author": "太宰治" }, "normalized": "はしれめろす だざいおさむ", "reading": "はしれめろす だざいおさむ" },
//   { "original": { "title": "人間失格", "author": "太宰治" }, "normalized": "にんげんしっかく だざいおさむ", "reading": "にんげんしっかく だざいおさむ" },
//   ...
// ]
const indexedBooks = JSON.parse(fs.readFileSync('./data/indexedBooks.json', 'utf-8'));
const aimaiBooks = new Aimai(indexedBooks);

const results3 = await aimaiBooks.search('だざい'); // 読みで検索
console.log(results3);
/*
[
  { item: { title: '走れメロス', author: '太宰治' }, score: 0.xxx, refIndex: 0 },
  { item: { title: '人間失格', author: '太宰治' }, score: 0.yyy, refIndex: 1 }
]
*/
```

## ⚙️ オプション (Options)

`Aimai` コンストラクタの第二引数でオプションを指定できます。

* `threshold`: `number` (0から1, デフォルト: 0.6) - 検索の閾値。スコアがこれより低いものは結果に含まれない (1に近いほど厳密)。
* `limit`: `number` - 返す結果の最大数。
* `includeScore`: `boolean` (デフォルト: true) - 結果にスコアを含めるか。
* `includeMatches`: `boolean` (デフォルト: false) - 結果にマッチした箇所の情報（ハイライト用）を含めるか (現在プレースホルダー)。
* `useKanaNormalization`: `boolean` (デフォルト: true) - **検索クエリ** のひらがな/カタカナ/半角カナの正規化を行うか。インデックスデータは生成時に正規化済みです。
* `normalizationOptions`: `object` - **検索クエリ** の正規化に関する詳細オプション (`normalizeLongVowel`, `expandIterationMark`)。
* `useRomajiSearch`: `boolean` (デフォルト: true) - **検索クエリ** のローマ字入力をひらがなに変換するか。
* `tokenizer`: `object` - **検索クエリ** の読み仮名を取得するためのカスタム Kuromoji.js トークナイザーインスタンス (オプション)。指定しない場合は内部でデフォルトのトークナイザーが使用されます。

## 📚 API

* `Aimai(indexedData, options)`: コンストラクタ。第一引数には **事前に生成されたインデックスデータ** (`IndexedItem<T>[]`) を渡します。
* `search(query)`: 検索メソッド。検索クエリ文字列を引数に取ります。

## 🛠️ 開発 (Development)

```bash
# 依存関係のインストール
yarn install

# TypeScriptのコンパイル (distフォルダへ出力)
yarn build

# インデックスファイルの生成 (例)
# まず yarn build を実行しておくこと
yarn generate:index --input=./path/to/your/data.json --output=./path/to/your/index.json

# テストの実行 (テストコードの修正が必要です)
yarn test

# コード整形・チェックなど (必要に応じて追加)
# yarn format
# yarn lint
```

## 🤝 貢献 (Contributing)

Issue や Pull Request を歓迎します！

## 📜 ライセンス (License)

[MIT License](LICENSE)
