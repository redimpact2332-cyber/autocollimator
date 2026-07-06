# autocollimator v7.2 SAFE

このZIPは `autocollimator_v7_1_darkmode` を土台にした復旧・最新版です。

## 変更内容
- ボタンが反応しなくなる問題を避けるため、app.js / graph.js / calc.js を整理
- グラフ横軸を 0 スタート表示に変更
- グラフ表示のみの「＋−上下反転」「左右反転」ボタンを追加
- 測定1〜4の計算結果を独立化
  - 現在選択中の測定番号だけで平均・補正・累計・グラフを計算
  - 他の測定列は計算に干渉しない
- Service Workerを network-first に変更し、古いJSキャッシュを掴みにくく修正

## アップロード方法
1. ZIPを解凍
2. `autocollimator` フォルダ内のファイルをGitHubリポジトリのrootへ上書き
3. Commit
4. GitHub Actionsが緑になるまで待つ
5. Safariで `?v=72` を付けて確認

例:
https://redimpact2332-cyber.github.io/autocollimator/?v=72

## 注意
GitHub Pagesの黄色い古い実行は無視してOK。最新の緑チェックだけ確認してください。
