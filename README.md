# ScratchLoginSystem

ホームページに「Scratchアカウントでログイン」できる仕組みを入れるためのツールです。

- 公式ページ： https://tr3131kami.github.io/ScratchLoginSystem/
- 認証コード受付プロジェクト： https://scratch.mit.edu/projects/1436331790/

## 使い方

1. `scratch-login.js` を読み込む
2. `ScratchLogin.init({ projectId: '1436331790' })` を呼ぶ
3. ボタンから `ScratchLogin.login()` を呼ぶ

ログインの流れ：認証コードが表示される → そのコードを認証用プロジェクトにコメントする → 「完了」を押すと自動でチェックしてログイン完了。

## 共同制作

[suzunokana](https://scratch.mit.edu/users/suzunokana/) × [とろろぉーーーー](https://youtube.com/@t-o-r-o-r-o-r-o-r-o)（tr3131kami）
