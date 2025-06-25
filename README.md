# aimai-js

日本語対応のシンプルな曖昧検索ライブラリ。(をゆっくり作成中)

## インストール

```bash
yarn add aimaijs
# or
npm install aimaijs
```

## 使い方

### 🚀 推奨方法：事前インデックス化

```ts
import Aimai from 'aimaijs';

// データの準備
const data = [
  { name: '東京スカイツリー', location: '東京都' },
  { name: '東京タワー', location: '東京都' },
  { name: '大阪城', location: '大阪府' },
];

// 自動インデックス化（推奨）
const aimai = await Aimai.create(data, { 
  keys: ['name', 'location'] // 検索対象のキーを指定
});

const results = await aimai.search('とうきょう');
console.log(results);
```

### ⚡ 最高速度：事前処理済みデータ

```ts
// 1. インデックスデータを事前作成
const indexedData = await Aimai.createIndex(data, { keys: ['name', 'location'] });

// 2. 事前処理済みデータでインスタンス作成（超高速）
const aimai = new Aimai(indexedData);

// 3. ファイル保存/読み込み（本番環境推奨）
const originalAimai = await Aimai.create(data, { keys: ['name', 'location'] });
await originalAimai.saveToFile('search-index.json');

// 4. 高速読み込み
const fastAimai = await Aimai.loadFromFile('search-index.json');
const results = await fastAimai.search('とうきょう'); // 超高速！
```

### 📚 様々なデータ形式に対応

```ts
// 1. 文字列配列
const cities = ['東京', '大阪', '京都'];
const citySearch = await Aimai.create(cities);

// 2. オブジェクト配列（全フィールド検索）
const books = [
  { title: '走れメロス', author: '太宰治' },
  { title: 'こころ', author: '夏目漱石' }
];
const bookSearch = await Aimai.create(books);

// 3. オブジェクト配列（特定フィールドのみ検索）
const products = [
  { name: 'iPhone', category: 'スマートフォン', price: 100000 },
  { name: 'iPad', category: 'タブレット', price: 50000 }
];
const productSearch = await Aimai.create(products, { 
  keys: ['name', 'category'] // price は検索対象外
});
```

## 主なオプション

| オプション | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| `threshold` | number | 0.6 | 類似度の閾値（0-1） |
| `limit` | number | Infinity | 最大結果数 |
| `includeScore` | boolean | true | スコアを結果に含めるか |
| `useRomajiSearch` | boolean | true | ローマ字検索を有効にするか |
| `useKanaNormalization` | boolean | true | かな正規化を有効にするか |
| `keys` | string[] | [] | オブジェクト配列の検索対象キー |

## 検索例

```ts
// ローマ字検索
await aimai.search('tokyo');     // 'とうきょう', '東京' などがヒット

// ひらがな・カタカナ・漢字の揺れに対応
await aimai.search('トウキョウ'); // '東京', 'とうきょう' などがヒット

// 部分一致
await aimai.search('だざい');    // '太宰治' を含む項目がヒット

// 閾値を調整
const strictSearch = await Aimai.create(data, { threshold: 0.8 });
```

## パフォーマンス比較

| 方法 | 初期化時間 | 検索時間 | 用途 |
|------|-----------|----------|------|
| `Aimai.create()` | やや長い | **超高速** | 開発環境 |
| `Aimai.loadFromFile()` | **瞬時** | **超高速** | 本番環境 |
| `new Aimai(rawData)` | 瞬時 | 遅い | ⚠️ 非推奨 |

## ベストプラクティス

### 開発環境

```ts
const aimai = await Aimai.create(data, options);
```

### 本番環境

```ts
// ビルド時またはサーバー起動時に実行
const aimai = await Aimai.create(data, options);
await aimai.saveToFile('search-index.json');

// リクエスト処理時に使用
const aimai = await Aimai.loadFromFile('search-index.json');
```

## ライセンス

Apache License 2.0
