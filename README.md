# embate

給評審用的 Debate Flow 工具。左邊是計時器與筆記，右邊依發言順序排出各欄位，可以一邊聽一邊快速記下論點，並用箭頭把回應連到它回應的論點。

支援 Public Forum、Lincoln–Douglas、Policy、British Parliamentary、World Schools、Asian Parliamentary 與新式奧瑞岡，切換賽制會一併換上對應的欄位、快速計時與準備時間。

所有內容都會自動存在瀏覽器的 localStorage，也可以下載成 JSON 備份、再上傳開啟。

## 使用方式

- 在欄位空白處點一下就新增論點；`Enter` 新增下一點、`Shift Enter` 換行、`Tab` 新增子論點（在剛新增的空白點上按 `Tab` 則會縮排到上一點底下）。
- 按住論點上下拖曳可以移動位置（子論點會一起移動），左右拖曳可以調整縮排。
- 滑到論點或它右側，會出現箭頭：點一下延伸到下一個發言，拖曳則可以連到任何後面的欄位或論點。`⌘ Enter` 也可以直接延伸。點擊連線即可刪除。
- 論點支援 Markdown 與 `⌘B`、`⌘I`、`⌘⇧X` 等快捷鍵；右鍵可以標顏色、取消連結或刪除。
- 點欄位標題可以改名；標題下方的賽制名稱可以切換賽制。
- 計時器下方是正反方的準備時間，數字可以直接點擊修改，`⌥[`、`⌥]` 分別開始或暫停。
- 欄位預設填滿畫面寬度，觸控板捏合可以調整欄寬。
- `⌘/` 打開完整的快捷鍵列表。

## 開發

需要 Node.js 與 pnpm（版本見 `package.json` 的 `packageManager`）。

```sh
pnpm install
pnpm dev          # 開發伺服器
pnpm build        # 型別檢查並建置到 dist/
pnpm format       # Prettier
```

技術：React、React Router、Zustand、React Query、Milkdown、Base UI、Motion、Phosphor Icons。顏色採用 Catppuccin（Latte / Mocha，依系統自動切換），樣式使用 CSS Modules。

部署設定在 `wrangler.jsonc`，以 Cloudflare Workers 靜態資源搭配 SPA fallback 提供 `dist/`。

## 授權條款

本專案採用 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) 授權，詳情請參閱 [LICENSE](./LICENSE) 檔案。
