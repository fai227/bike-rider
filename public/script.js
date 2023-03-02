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

// 定数設定
const BlockNum = 50;
const BikePosition = 14;
const RotationThreshold = 0.25;
const MaxJump = 3;
const MoveSpeed = 30;
const JumpPower = 0.5;
const Gravity = 2;
const ScoreRatio = 50;

// プレイヤーの状態
const PlayerState = {
    Normal: 0,
    Jump: 1,
    Fall: 2,
    Up: 3,
    Down: 4
}

let field = [];

async function Start() {
    await SetRanking();
    SetUsername();

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
        playerPosition.x -= 1;
        field.shift();
        while (field.length < BlockNum * 2) {
            GenerateField();
        }
    }

    // 上下移動計算
    if (playerState == PlayerState.Jump || playerState == PlayerState.Fall) {
        acceleration -= Gravity * deltaTime;
        playerPosition.y += acceleration;

        // 下に落ちているかどうか
        if (acceleration < 0) playerState = PlayerState.Fall;

        // 着地判定
        if (playerPosition.y <= field[BikePosition]) {
            playerState = PlayerState.Normal;
        }
    }

    // 表示計算
    if (playerState != PlayerState.Jump && playerState != PlayerState.Fall) {
        playerPosition.y = field[BikePosition];  // 位置を設定
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

const MaxDif = 10;
function GenerateField() {
    let level = Math.log10(score + 1);  // 5ぐらいがめっちゃムズイ
    let latestHeight = field[field.length - 1];
    let tmpField = [];

    // フィールドの中からlevelの数だけ点を取る
    let points = [];
    while (points.length < level) {
        let point = Math.floor(Math.random() * BlockNum);
        if (!points.includes(point)) {
            points.push(point);
        }
    }
    points.sort((a, b) => { return a - b; });
    if (!points.includes(BlockNum - 1)) points.push(BlockNum - 1);

    // 高さ指定
    points.forEach(item => {
        while (true) {
            let tmpHeight = Math.random() * BlockNum;
            if (Math.abs(tmpHeight - latestHeight) < MaxDif) {
                latestHeight = tmpHeight;
                tmpField[item] = tmpHeight;
                break;
            }
        }
    });

    let pointIndex = 0;
    latestHeight = field[field.length - 1];
    let latestPoint = -1;
    let slope = (tmpField[points[pointIndex]] - latestHeight) / (points[pointIndex] + 1);
    for (let i = 0; i < BlockNum - 1; i++) {
        if (tmpField[i] != undefined) {
            latestPoint = points[pointIndex];
            latestHeight = tmpField[latestPoint];

            pointIndex++;

            let x2 = points[pointIndex];
            slope = (tmpField[x2] - latestHeight) / (x2 - latestPoint);
            continue;
        }

        tmpField[i] = latestHeight + slope * (i - latestPoint);
    }

    field = field.concat(tmpField);
}

function JumpPressed() {
    if (jumpNum <= 0) return;
    acceleration = JumpPower;
    playerState = PlayerState.Jump;
    jumpNum--;
}

function DrawScreen(array, playerPosition, time) {
    // 画面クリア
    Context.clearRect(0, 0, Canvas.width, Canvas.height);

    // 鉛筆描画
    Context.drawImage(Pencil, -0.5, -0.5, Canvas.width + 1, Canvas.height + 1);

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
    Context.lineTo(XToCanvasPosition(-playerPosition.x + BlockNum + 1), -10);
    Context.lineTo(XToCanvasPosition(-playerPosition.x), -10);
    Context.closePath();
    Context.globalCompositeOperation = "destination-out";
    Context.fill();
    Context.globalCompositeOperation = "source-over";
    Context.strokeStyle = "black";
    Context.lineWidth = 5;
    Context.stroke();

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

function SetUsername() {
    username = localStorage.getItem("username");

    if (username != undefined)
        document.getElementById("nameInput").value = username;
}

function GameStart() {
    username = document.getElementById("nameInput").value;
    if (username == undefined) {
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

        // ゲーム開始
        requestAnimationFrame(Update);
        latestTime = performance.now();
        startTime = performance.now();

    }, 1000);
}

function Resize() {
    let width = window.innerWidth * 0.9;
    let height = window.innerHeight * 0.9;

    if (width / height > 9 / 16) {  // 横長なので高さを合わせる
        Canvas.height = height;
        Canvas.width = height * 9 / 16;
    }
    else {
        Canvas.width = width;
        Canvas.height = width * 16 / 9;
    }
}

Start();