// canvas設定
const Canvas = document.getElementById("canvas");
const Context = Canvas.getContext("2d");

// 画像読み込み
const Sun = new Image(); Sun.src = "./images/sun.png";
const Pencil = new Image(); Pencil.src = "./images/pencil.jpg";
const Normal = new Image(); Normal.src = "./images/normal.png";
const Jump = new Image(); Jump.src = "./images/jump.png";
const Fall = new Image(); Fall.src = "./images/fall.png";
const Up = new Image(); Up.src = "./images/up.png";
const Down = new Image(); Down.src = "./images/down.png";
const Explosions = []; for (let i = 0; i < 20; i++) { Explosions[i] = new Image(); Explosions[i].src = `./images/explosion/${i}.png` }
const VolumeUrl = "./images/speakerN.png";

// 音楽
const Audios = [];

const BGM = new Audio(); BGM.onloadeddata = BGMLoaded; BGM.onended = StartBGM; Audios.push(BGM);
const BgmUrl = "./audios/bgmN.mp3";
const BgmLength = 4;
let bgmNum = -1;

// 効果音
let JumpAudio = new Audio(); JumpAudio.src = "./audios/jump.mp3"; Audios.push(JumpAudio);
const DeathAudio = new Audio(); DeathAudio.src = "./audios/death.mp3"; Audios.push(DeathAudio);

// 定数設定
const BlockNum = 50;
const BikePosition = 14;
const RotationThreshold = 0.25;

const MaxJump = 3;
const MoveSpeed = 30;

const JumpPower = 70;
const Gravity = 250;

const ScoreRatio = 50;

const ExplosionInterval = 0.1;
const ExplosionSize = 100;

const MaxDif = 10;
const MaxSlope = 0.5;
const MaxDistance = 30;

const MaxHoleRatio = 3;

// プレイヤーの状態
const PlayerState = {
    Normal: 0,
    Jump: 1,
    Fall: 2,
    Up: 3,
    Down: 4
}

let field = [];
let gameover = false;

async function Start() {
    let tmpVolume = localStorage.getItem("Volume");
    if (tmpVolume != undefined) {
        volume = Number(tmpVolume);
    }
    else {
        volume = 0;
    }
    SetVolume();

    await SetRanking();  // ランキング表示
    SetUsername();  // ユーザー名表示

    // 盤面初期化
    for (let i = 0; i < BlockNum * 3; i++) field.push(0);
    playerPosition = { x: 0, y: 0 };
    playerState = PlayerState.Normal;
    score = 0;
}

function Update(time) {
    let deltaTime = (time - latestTime) / 1000;

    // 左右移動計算
    playerPosition.x += deltaTime * MoveSpeed;
    while (playerPosition.x >= 1) {
        if (field[BikePosition + 1] > playerPosition.y + MaxSlope) {  // 死亡判定
            gameover = true;
            break;
        }
        playerPosition.x -= 1;
        field.shift();

        // 上下の再計算
        if (field[BikePosition] < playerPosition.y - MaxSlope) {  // 落ちる
            if (playerState != PlayerState.Jump && playerState != PlayerState.Fall) {
                acceleration = 0;
                playerState = PlayerState.Fall;
            }
        }
        else {
            playerPosition.y = field[BikePosition];
        }

        while (field.length < BlockNum * 2) {
            GenerateField();
        }
    }

    if (gameover) {
        Death();
        return;
    }

    // 上下移動計算
    if (playerState == PlayerState.Jump || playerState == PlayerState.Fall) {
        acceleration -= Gravity * deltaTime;
        playerPosition.y += acceleration * deltaTime;

        // 下に落ちているかどうか
        if (acceleration < 0) playerState = PlayerState.Fall;

        // 着地判定
        if (playerPosition.y <= field[BikePosition]) {
            playerPosition.y = field[BikePosition];
            playerState = PlayerState.Normal;
        }
    }

    // 表示計算
    if (playerState != PlayerState.Jump && playerState != PlayerState.Fall) {
        jumpNum = MaxJump;

        let dif = playerPosition.x > 1 / 2 ? field[BikePosition + 1] - field[BikePosition] : field[BikePosition] - field[BikePosition - 1];
        if (dif > RotationThreshold) {
            playerState = PlayerState.Up;
        }
        else if (dif < -RotationThreshold) {
            playerState = PlayerState.Down;
        }
        else {
            playerState = PlayerState.Normal;
        }
    }

    // 画面描画
    DrawScreen(field, playerPosition, time - startTime);

    latestTime = time;
    requestAnimationFrame(Update);
}

function GenerateField() {
    // 地面を生成
    let tmpField = [];
    let startPosition = field[field.length - 1];
    while (tmpField.length < BlockNum) {  // 一面完成するまで実行
        // スタート位置
        if (Math.random() > 0.9) {  // 1/10で段差がずれる
            let tmpStartPosition = startPosition;
            startPosition += RandomRange(0, MaxDif);

            if (startPosition >= BlockNum) startPosition = tmpStartPosition - RandomRange(0, MaxDif);
        }

        // 傾き設置
        let distance = RandomRange(0, MaxDistance);
        let slope = RandomRange(-MaxSlope, MaxSlope);
        for (let i = 0; i < distance; i++) {
            let position = startPosition + slope;
            if (position < 0 || position >= BlockNum) break;
            tmpField.push(position);
            startPosition = position;
        }
    }

    // 穴を空ける
    let level = Math.log10(score + 10);  // レベル
    let hole = Math.ceil(Math.random() * level);  // 穴の数を設定
    console.log(hole)
    for (let i = 0; i < hole; i++) {
        let holeLength = Math.random() * level * MaxHoleRatio;  // 穴の長さを設定
        let startPosition = Math.floor(Math.random() * tmpField.length);  // 穴の位置を設定
        for (let x = startPosition; x < startPosition + holeLength; x++) {
            if (x >= tmpField.length) {  // 領域外の場合は終了
                break;
            }
            tmpField[x] = -1;
        }
    }

    field = field.concat(tmpField);
}

function JumpPressed() {
    if (gameover) return;
    if (jumpNum <= 0) return;

    acceleration = JumpPower;
    playerState = PlayerState.Jump;
    jumpNum--;

    if (volume != 0) {
        JumpAudio.currentTime = 0;
        JumpAudio.play();
    }
}

function DrawScreen(array, playerPosition, time) {
    // 画面クリア
    Context.clearRect(0, 0, Canvas.width, Canvas.height);

    // 鉛筆描画
    //Context.drawImage(Pencil, -0.5, -0.5, Canvas.width + 1, Canvas.height + 1);

    // 境界線描画
    let data = array[0];
    Context.beginPath();
    Context.moveTo(XToCanvasPosition(-playerPosition.x), YToCanvasPosition(data));

    for (let i = 0; i < BlockNum + 1; i++) {
        let xPosition = XToCanvasPosition(-playerPosition.x + i + 1);
        Context.lineTo(xPosition, YToCanvasPosition(data));
        data = array[i + 1];
        Context.lineTo(xPosition, YToCanvasPosition(data));
    }

    // 不必要な部分をクリア
    Context.lineTo(XToCanvasPosition(-playerPosition.x + BlockNum + 1), Canvas.height + 10);
    Context.lineTo(XToCanvasPosition(-playerPosition.x), Canvas.height + 10);
    Context.closePath();
    Context.fill();

    // プレイヤー表示
    const playerSize = Canvas.width * 3 / 50;
    let playerImage = Normal;
    switch (playerState) {
        case PlayerState.Jump:
            playerImage = Jump;
            break;
        case PlayerState.Fall:
            playerImage = Fall;
            break;
        case PlayerState.Up:
            playerImage = Up;
            break;
        case PlayerState.Down:
            playerImage = Down;
            break;
    }
    Context.drawImage(playerImage, XToCanvasPosition(BikePosition + 0.5) - playerSize / 2, YToCanvasPosition(playerPosition.y) - playerSize, playerSize, playerSize);

    // スコア表示
    score = Math.round(ScoreRatio * time / 1000);
    Context.font = "50px MyFont"
    Context.fillStyle = "black";
    Context.textAlign = "right";
    Context.fillText(score + "M", 150, 50, 100);

}

function XToCanvasPosition(value) {
    return value * Canvas.width / BlockNum;
}

function YToCanvasPosition(value) {
    if (value < 0) return Canvas.height + 10;
    return 12 * Canvas.height / 16 - value * Canvas.height / BlockNum * 10 / 16;
}

async function SetRanking() {
    let table = document.getElementsByTagName("table")[0];
    table.innerHTML = "";

    // ヘッダー追加
    let headerRow = document.createElement("tr");
    table.appendChild(headerRow);

    let weeklyHeader = document.createElement("th");
    weeklyHeader.appendChild(document.createTextNode("Weekly"));
    weeklyHeader.classList.add("pencilBorder");
    headerRow.appendChild(weeklyHeader);

    let totalHeader = document.createElement("th");
    totalHeader.appendChild(document.createTextNode("Total"));
    totalHeader.classList.add("pencilBorder");
    headerRow.appendChild(totalHeader);

    //ランキング取得
    let response = await fetch(location.origin + "/ranking");
    let ranking = await response.json();

    // ランキング表示    
    for (let i = 0; i < Math.max(ranking.total.length, ranking.week.length); i++) {
        // 行追加
        let row = document.createElement("tr");
        table.appendChild(row);

        // Weekly追加
        let weekly = document.createElement("td");
        weekly.classList.add("pencilBorder");
        row.appendChild(weekly);
        // スコア追加
        if (ranking.week.length > i) {
            let data = ranking.week[i];
            let name = document.createElement("div");
            name.append(document.createTextNode(`${i + 1}. ${data.name}`));
            weekly.appendChild(name);

            let distance = document.createElement("div");
            distance.classList.add("distance");
            distance.append(document.createTextNode(data.distance + "M"));
            weekly.appendChild(distance);

            // メダル追加
            if (i == 0) distance.classList.add("first", "medal");
            if (i == 1) distance.classList.add("second", "medal");
            if (i == 2) distance.classList.add("third", "medal");
        }

        // Total追加
        let total = document.createElement("td");
        total.classList.add("pencilBorder");
        row.appendChild(total);
        if (ranking.total.length > i) {
            let data = ranking.total[i];
            let name = document.createElement("div");
            name.append(document.createTextNode(`${i + 1}. ${data.name}`));
            total.appendChild(name);

            let distance = document.createElement("div");
            distance.classList.add("distance");
            distance.append(document.createTextNode(data.distance + "M"));
            total.appendChild(distance);

            // メダル追加
            if (i == 0) distance.classList.add("first", "medal");
            if (i == 1) distance.classList.add("second", "medal");
            if (i == 2) distance.classList.add("third", "medal");
        }
    }
}

async function SendRanking() {
    while (true) {
        try {
            //ランキング送信
            let response = await fetch(location.origin + "/ranking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "name": username, "distance": score })
            });
            if (!response.ok) throw new Error(response.statusText);
            break;
        } catch (e) {
            if (!confirm("An error occured during sending score. Would you line to retry?\nランキング反映中にエラーが発生しました。リトライしますか？")) break;
        }
    }

    // リロード
    location.reload();
}

function SetUsername() {
    username = localStorage.getItem("username");

    if (username != undefined)
        document.getElementById("nameInput").value = username;
}

function GameStart() {
    username = document.getElementById("nameInput").value;
    if (username == "") {
        alert("Enter your name.\nユーザー名を入力してください。");
        return;
    }
    if (!username.match(/^[A-Za-z0-9]*$/)) {
        alert("ユーザー名は英数字のみで入力してください。")
        return;
    }

    localStorage.setItem("username", username);

    // Fade Out
    document.getElementById("startButton").disabled = true;

    document.getElementById("wrapper").classList.add("fadeout");
    setTimeout(() => {
        document.getElementById("wrapper").style.display = "none";


        // Canvas設定
        window.addEventListener("resize", Resize);
        Resize();
        Canvas.classList.add("fadein");
        Canvas.style.display = "block";

        // body設定
        document.body.classList.add("center");

        // キー・タップ設定
        window.addEventListener("keydown", (e) => {
            if (e.key == " ") JumpPressed();
        });
        window.addEventListener("pointerdown", JumpPressed);
        document.addEventListener("dblclick", function (e) { e.preventDefault(); }, { passive: false });

        // ゲーム開始
        requestAnimationFrame(Update);
        latestTime = performance.now();
        startTime = performance.now();
        StartBGM();

    }, 1000);
}

function Resize() {
    if (gameover) return;

    let width = window.innerWidth * 0.9;
    let height = window.innerHeight * 0.9;

    if (width / height > 9 / 16) {  // 横長なので高さを合わせる
        Canvas.height = height * 2;
        Canvas.width = height * 9 / 16 * 2;

        Canvas.style.height = height + "px";
        Canvas.style.width = (height * 9 / 16) + "px";
    }
    else {
        Canvas.width = width * 2;
        Canvas.height = width * 16 / 9 * 2;

        Canvas.style.width = width + "px";
        Canvas.style.height = (width * 16 / 9) + "px";
    }
}

function RandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function BGMLoaded() {
    if (volume != 0) BGM.play();
}

function StartBGM() {
    while (true) {
        let num = Math.floor(RandomRange(0, BgmLength));
        if (num != bgmNum) {
            bgmNum = num;
            BGM.src = BgmUrl.replace("N", num);
            break;
        }
    }
}

function ChangeVolume() {
    if (navigator.userAgent.match(/iPhone|Android.+Mobile/)) {
        volume = volume == 0 ? 3 : 0;
        if (volume == 3) alert("Enabling audio on smartphones may slow down the display speed.\nスマートフォンでは音声を有効にすることで表示速度が低下する可能性があります。");
    }
    else {
        volume = (volume + 3) % 4;
    }

    localStorage.setItem("Volume", volume);
    SetVolume();
}

function SetVolume() {
    let volumeNumber = volume;
    if (volumeNumber == 2) {
        volumeNumber = 0.0464;
    }
    else if (volumeNumber == 1) {
        volumeNumber = 0.0215;
    }
    else {
        volumeNumber = Number(volume) / 3;
    }

    Audios.forEach(ad => {
        ad.volume = volumeNumber;
    })

    document.getElementById("volumeImage").src = VolumeUrl.replace("N", volume);
}

function Death() {
    BGM.pause();
    if (volume != 0) DeathAudio.play();

    // 爆発表示
    for (let i = 0; i < Explosions.length; i++) {
        setTimeout(() => {
            Context.drawImage(Explosions[i], XToCanvasPosition(BikePosition) - ExplosionSize / 2, YToCanvasPosition(playerPosition.y) - ExplosionSize / 2, ExplosionSize, ExplosionSize);
        }, i * ExplosionInterval * 1000);
    }

    // フェードアウト
    setTimeout(() => {
        Canvas.classList.remove("fadein");
        Canvas.classList.add("fadeout");
    }, 1000);

    setTimeout(() => {
        SendRanking();
    }, 2000);
}

Start();