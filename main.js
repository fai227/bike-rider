// 定数定義
const fs = require("fs");
const express = require("express");
const app = new express();
const port = process.env.PORT || 8080;
const RANKING_NUM = 10;

// ランキング
let ranking = JSON.parse(fs.readFileSync("ranking.json"));

// 初期設定
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ランキング更新POST
app.post("/ranking", (req, res) => {
    if (req.body.name == undefined) throw new Error("The name is undefined.");
    if (req.body.distance == undefined) throw new Error("The distance is undefined.");

    UpdateWeek(req.body);
    UpdateTotal(req.body);

    res.send(ranking);
});

// ランキング取得GET
app.get("/ranking", (req, res) => {
    res.send(ranking);
});

// ランキング削除関数
app.get("/delete", (req, res) => {
    DeleteWeek();
    res.send("Ranking reset");
});

// 週間ランキング更新関数
function UpdateWeek(data) {
    if (ranking.week.length >= RANKING_NUM)  // ランキングが最大を超えるとき
        if (Number(ranking.week[RANKING_NUM - 1].distance) >= Number(data.distance))  // ランキングの最後の数値のほうが大きいとき
            return;  // ランキングには入らない

    ranking.week.push(data);  // ランキングに入れる

    // ランキングソート
    ranking.week = ranking.week.sort((a, b) => {
        return Number(b.distance) - Number(a.distance);
    });

    // 切り出し
    ranking.week = ranking.week.slice(0, RANKING_NUM);

    // 書き込み
    fs.writeFileSync("ranking.json", JSON.stringify(ranking, null, 3));
}

// 週間ランキング削除関数
function DeleteWeek() {
    ranking.week = [];
    fs.writeFileSync("ranking.json", JSON.stringify(ranking, null, 3));
}

// 全体ランキング更新関数
function UpdateTotal(data) {
    if (ranking.total.length >= RANKING_NUM)  // ランキングが最大を超えるとき
        if (Number(ranking.total[RANKING_NUM - 1].distance) >= Number(data.distance))  // ランキングの最後の数値のほうが大きいとき
            return;  // ランキングには入らない

    ranking.total.push(data);  // ランキングに入れる

    // ランキングソート
    ranking.total = ranking.total.sort((a, b) => {
        return Number(b.distance) - Number(a.distance);
    });

    // 切り出し
    ranking.total = ranking.total.slice(0, RANKING_NUM);

    // 書き込み
    fs.writeFileSync("ranking.json", JSON.stringify(ranking, null, 3));
}

// アプリケーションスタート
app.listen(port, () => {
    console.log(`App started with port ${port}.`);
});