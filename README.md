# aimai-js

日本語対応のシンプルな曖昧検索ライブラリ。(をゆっくり作成中)

## インストール

```bash
yarn add aimaijs
# or
npm install aimaijs
```

## 使い方

```ts
import * as fs from 'fs';
import Aimai from 'aimaijs';

const data = JSON.parse(fs.readFileSync('index.json', 'utf-8'));
const aimai = new Aimai(data);
const results = await aimai.search('とうきょう');
console.log(results);
```

## 主なオプション

- threshold (0–1, default: 0.6)
- limit (default: Infinity)
- includeScore (default: true)
- useRomajiSearch (default: true)
- useKanaNormalization (default: true)

## ライセンス

Apache License 2.0
