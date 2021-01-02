/**
 * PIXI.jsのバージョンを v.5.3.2 から v5.3.7 に上げると、サンプルコードが
 * 動かなくなり、どうやら Breaking Change が起こっている様子…。
 * というわけで、「画像、音声動画のアセットファイル化」の実験も兼ねて
 * 現時点 (2021/01/02) で動作するようにしてみました。
 */
import PIXI_SOUND from 'pixi-sound'; // node_modulesから PIXI_SOUNDをインポート
import * as PIXI from 'pixi.js'; // node_modulesから PIXI.jsをインポート

import { SceneManager } from './scene_manager'; // シーン管理を行うクラスをインポート
import { createButton } from './create_button'; // ボタン生成関数をインポート

// アセットファイル（実行時ではなく、コンパイル時に評価するファイル）
// ゲームで使用する画像や音声を、外部から読みたくない場合、
// ファイルそのものをimportする。
import ballImg from '/image/ball.png';
import hitSound from '/sound/hit.mp3';

// PIXI.JSアプリケーションを呼び出す (この数字はゲーム内の画面サイズ)
const app = new PIXI.Application({
  autoStart: true,
  backgroundColor: 0x333333,
  width: 400,
  height: 600,
});

// index.htmlのbodyにapp.viewを追加する (app.viewはcanvasのdom要素)
document.body.appendChild(app.view);

// canvasの周りを点線枠で囲う (canvasの位置がわかりやすいので入れている)
app.renderer.view.style.border = '2px dashed black';

// ゲーム内で使用する画像を、「テクスチャ」として読み込む
const ballTexture = PIXI.Texture.from(ballImg);

// 音声ファイルを識別子付きで読み込む
PIXI_SOUND.add('hit', hitSound);

// 自在に動かせる「スプライト」オブジェクトに、ボール画像のテクスチャを貼り付ける
// PIXI.js で画像を動かす手法は、これが主なものとなる。
const ball = new PIXI.Sprite(ballTexture); //引数には、アセットのテクスチャを指定

const sceneManager = new SceneManager(app);

// プリロード処理が終わったら呼び出されるイベント
PIXI.Loader.shared.load((loader, resources) => {
  /**
   * 状態が変化する変数一覧
   */

  let score = 0; // スコア
  let ballVx = 5; // ボールの毎フレーム動くx方向
  let ballVy = 0; // ボールの毎フレーム動くy方向

  // このあたりに書いていた、ボタン生成関数やシーン移行関数は別ファイルにまとめてモジュール化しました
  // このファイル先頭でimportしてファイルを引っ張ってきています。便利！

  /**
   * ゲームのメインシーンを生成する関数
   */
  function createGameScene() {
    // 他に表示しているシーンがあれば削除
    sceneManager.removeAllScene();
    // 毎フレームイベントを削除
    sceneManager.removeAllGameLoops();

    // スコアを初期化する
    score = 0;

    // ゲーム用のシーンを生成
    const gameScene = new PIXI.Container();
    // ゲームシーンを画面に追加
    app.stage.addChild(gameScene);

    ball.x = 200; // x座標
    ball.y = 500; // y座標
    ball.interactive = true; // クリック可能にする
    ball.on('pointerdown', () =>
      // クリック時に発動する関数
      {
        score++; // スコアを１増やす
        ballVy = -8; // ボールのＹ速度を-8にする(上に飛ぶようにしている)
        PIXI_SOUND.play('hit'); // クリックで音が鳴る
      }
    );
    gameScene.addChild(ball); // ボールをシーンに追加

    // テキストに関するパラメータを定義する(ここで定義した意外にもたくさんパラメータがある)
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial', // フォント
      fontSize: 20, // フォントサイズ
      fill: 0xffffff, // 色(16進数で定義するので#ffffffと書かずに0xffffffと書く)
      dropShadow: true, // ドロップシャドウを有効にする（右下に影をつける）
      dropShadowDistance: 2, // ドロップシャドウの影の距離
    });

    const text = new PIXI.Text('SCORE:0', textStyle); //スコア表示テキスト
    gameScene.addChild(text); // スコア表示テキストを画面に追加する

    function gameLoop() {
      // 毎フレームごとに処理するゲームループ
      // スコアテキストを毎フレームアップデートする
      text.text = `SCORE:${score}`;

      if (score === 0) return; // スコアが０の時(球に触っていないとき)はここで終了させる

      ball.x += ballVx; // ボールに速度を加算
      ball.y += ballVy; // ボールに速度を加算
      if (ball.x > 340) {
        // ボールが右端に到達したら(画面横幅400,球横幅60、アンカーは左上なので400-60=340の位置で球が右端に触れる)
        ball.x = 340; // xの値を340にする(次のフレームで反射処理させないために必要)
        ballVx = -ballVx; // 速度を反転して反射の挙動にする
      }
      if (ball.x < 0) {
        // ボールが左端に到達したら(アンカーは左上なので、0の位置で球が左端に触れる)
        ball.x = 0; // xの値を0にする(次のフレームで反射処理させないために必要)
        ballVx = -ballVx; // 速度を反転して反射の挙動にする
      }
      ballVy += 0.1; // yの速度に0.1を足していくと、重力みたいな挙動になる
      if (ball.y >= 600) {
        // 球が画面下に消えたら
        createEndScene(); // 結果画面を表示する
      }
    }

    // ゲームループ関数を毎フレーム処理の関数として追加
    sceneManager.addGameLoop(gameLoop);
  }

  /**
   * ゲームの結果画面シーンを生成する関数
   */
  function createEndScene() {
    // 他に表示しているシーンがあれば削除
    sceneManager.removeAllScene();
    // 毎フレームイベントを削除
    sceneManager.removeAllGameLoops();

    // ゲーム用のシーン表示
    const endScene = new PIXI.Container();
    // シーンを画面に追加する
    app.stage.addChild(endScene);

    // テキストに関するパラメータを定義する(ここで定義した意外にもたくさんパラメータがある)
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial', // フォント
      fontSize: 32, // フォントサイズ
      fill: 0xfcbb08, // 色(16進数で定義する これはオレンジ色)
      dropShadow: true, // ドロップシャドウを有効にする（右下に影をつける）
      dropShadowDistance: 2, // ドロップシャドウの影の距離
    });

    // テキストオブジェクトの定義
    const text = new PIXI.Text(`SCORE:${score}で力尽きた`, textStyle); // 結果画面のテキスト
    text.anchor.x = 0.5; // アンカーのxを中央に指定
    text.x = 200; // 座標指定 (xのアンカーが0.5で中央指定なので、テキストのx値を画面中央にすると真ん中にテキストが表示される)
    text.y = 200; // 座標指定 (yのアンカーはデフォルトの0なので、画面上から200の位置にテキスト表示)
    endScene.addChild(text); // 結果画面シーンにテキスト追加

    /**
     * 自作のボタン生成関数を使って、もう一度ボタンを生成
     * 引数の内容はcreateButton関数を参考に
     */
    const retryButton = createButton('もう一度', 100, 60, 0xff0000, () => {
      // クリックした時の処理
      createGameScene(); // ゲームシーンを生成する
    });
    retryButton.x = 50; // ボタンの座標指定
    retryButton.y = 500; // ボタンの座標指定
    endScene.addChild(retryButton); // ボタンを結果画面シーンに追加
    /**
     * 自作のボタン生成関数を使って、ツイートボタンを生成
     * 引数の内容はcreateButton関数を参考に
     */
    const tweetButton = createButton('ツイート', 100, 60, 0x0000ff, () => {
      //ツイートＡＰＩに送信
      //結果ツイート時にURLを貼るため、このゲームのURLをここに記入してURLがツイート画面に反映されるようにエンコードする
      const url = encodeURI('https://hothukurou.com'); // ツイートに載せるURLを指定(文字はエンコードする必要がある)
      window.open(
        `http://twitter.com/intent/tweet?text=SCORE:${score}点で力尽きた&hashtags=sample&url=${url}`
      ); //ハッシュタグをsampleにする
    });
    tweetButton.x = 250; // ボタンの座標指定
    tweetButton.y = 500; // ボタンの座標指定
    endScene.addChild(tweetButton); // ボタンを結果画面シーンに追加
  }

  // 起動直後はゲームシーンを追加する
  createGameScene();
});
