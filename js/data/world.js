// ===== ワールドデータ（地域・村・祠・塔・ボスなどの配置） =====
'use strict';
G.World = {};

// 地域（地形・色・敵の強さに使う）
G.World.regions = [
  { id: 'castle',  name: '古城跡',       x: 0,    z: 0,    r: 150, zone: 4 },
  { id: 'start',   name: 'はじまりの野', x: 0,    z: 470,  r: 230, zone: 1 },
  { id: 'forest',  name: '迷いの森',     x: -470, z: -30,  r: 270, zone: 3 },
  { id: 'snow',    name: '白嶺山脈',     x: -20,  z: -580, r: 340, zone: 3 },
  { id: 'volcano', name: 'ほむら火山',   x: 520,  z: -280, r: 270, zone: 3 },
  { id: 'lake',    name: 'ミナモ湖水地方', x: 430, z: 420, r: 250, zone: 2 },
  { id: 'plains',  name: 'かぜの平原',   x: -430, z: 420,  r: 250, zone: 2 },
  { id: 'canyon',  name: 'ゴウセキ峡谷', x: -560, z: -540, r: 230, zone: 3 },
];

// 川（北の泉から南東の湖へ）
G.World.river = [[70, -330], [95, -230], [140, -120], [190, -20], [240, 90], [300, 200], [360, 300], [420, 390]];

// 道（村と村を結ぶ）
G.World.roads = [
  [[0, 470], [-60, 380], [-160, 300], [-260, 270]],          // ハジマリ村→馬宿
  [[0, 470], [20, 360], [30, 240], [20, 150]],                // ハジマリ村→古城南
  [[0, 470], [130, 440], [230, 380], [300, 345]],             // ハジマリ村→湖畔の村
  [[-260, 270], [-330, 150], [-380, 40], [-420, -30]],        // 馬宿→迷いの森入口
  [[20, 150], [-60, 60], [-150, -80], [-150, -250], [-120, -400]], // 古城→雪の宿場
  [[20, 150], [130, 80], [250, 0], [360, -80]],               // 古城→ゴロゴ村
  [[-150, -250], [-300, -320], [-400, -380]],                 // →古代研究所
  [[300, 345], [380, 200], [380, 60], [360, -80]],            // 湖畔→ゴロゴ村
];

// 村・拠点（flat: 地形を平らにする半径）
G.World.villages = [
  { id: 'hajimari', name: 'ハジマリ村', x: 0, z: 470, flat: 45, shop: 'hajimari', inn: true, pot: true, statue: true, houses: 6, bgm: 'village' },
  { id: 'stable', name: 'かぜの馬宿', x: -260, z: 270, flat: 30, shop: 'stable', inn: true, pot: true, houses: 2, stable: true, bgm: 'village' },
  { id: 'snow', name: 'シロガネの宿場', x: -120, z: -400, flat: 34, shop: 'snow', inn: true, pot: true, statue: true, houses: 4, snow: true, bgm: 'village' },
  { id: 'fire', name: 'ゴロゴ村', x: 360, z: -80, flat: 36, shop: 'fire', inn: true, pot: true, statue: true, houses: 4, rocky: true, bgm: 'village' },
  { id: 'lake', name: 'ミナモの村', x: 300, z: 345, flat: 34, shop: 'lake', inn: true, pot: true, statue: true, houses: 4, bgm: 'village' },
  { id: 'lab', name: '古代研究所', x: -400, z: -380, flat: 26, lab: true, pot: true, houses: 1, bgm: 'village' },
];

// 観測塔（起動するとその地域の地図が見える）
G.World.towers = [
  { id: 't_start', name: 'はじまりの塔', x: 60, z: 360, region: 'start' },
  { id: 't_forest', name: '森の塔', x: -340, z: 110, region: 'forest' },
  { id: 't_snow', name: '雪嶺の塔', x: -60, z: -330, region: 'snow' },
  { id: 't_volcano', name: 'ほむらの塔', x: 330, z: -190, region: 'volcano' },
  { id: 't_lake', name: '湖の塔', x: 250, z: 470, region: 'lake' },
  { id: 't_plains', name: '平原の塔', x: -420, z: 320, region: 'plains' },
  { id: 't_canyon', name: '峡谷の塔', x: -460, z: -470, region: 'canyon' },
  { id: 't_castle', name: '古城の塔', x: -150, z: 120, region: 'castle' },
];

// 祈りの祠（trial: 試練の種類 / blessing: 辿り着くこと自体が試練）
G.World.shrines = [
  { id: 's01', name: '目覚めの祠', x: 30, z: 520, trial: 'tutorial', desc: 'はじまりの試練' },
  { id: 's02', name: 'ミヨンの祠', x: -110, z: 400, trial: 'combat1', desc: '力の試練・初' },
  { id: 's03', name: 'カダの祠', x: 140, z: 300, trial: 'archery', desc: '弓の試練' },
  { id: 's04', name: 'ソラハの祠', x: -300, z: 380, trial: 'glide', desc: '飛翔の試練' },
  { id: 's05', name: 'ホムラの祠', x: 420, z: -150, trial: 'fire', desc: '炎の試練' },
  { id: 's06', name: 'ユラギの祠', x: 290, z: 490, trial: 'platform', desc: '動く足場の試練' },
  { id: 's07', name: 'ツワモノの祠', x: -230, z: -120, trial: 'combat2', desc: '力の試練・中' },
  { id: 's08', name: 'オモイの祠', x: -560, z: 200, trial: 'memory', desc: '記憶の試練' },
  { id: 's09', name: 'トキの祠', x: 120, z: -360, trial: 'timed', desc: '時の試練' },
  { id: 's10', name: 'キワミの祠', x: 230, z: -60, trial: 'combat3', desc: '力の試練・極' },
  { id: 's11', name: 'イカヅチの祠', x: -320, z: -460, trial: 'thunder', desc: '雷の試練' },
  { id: 's12', name: 'メイロの祠', x: -620, z: -360, trial: 'maze', desc: '迷宮の試練' },
  { id: 's13', name: 'イタダキの祠', x: -10, z: -640, trial: 'blessing', desc: '白嶺の頂に辿り着いた者への祝福' },
  { id: 's14', name: 'カコウの祠', x: 520, z: -280, trial: 'blessing', desc: '火口に辿り着いた者への祝福' },
  { id: 's15', name: 'ミズベの祠', x: 470, z: 472, trial: 'blessing', desc: '湖の小島に辿り着いた者への祝福' },
  { id: 's16', name: 'コダマの祠', x: -545, z: -95, trial: 'blessing', desc: '迷いの森を抜けた者への祝福' },
];

// 中ボス（各地の主）
G.World.bosses = [
  { id: 'b_hinox', type: 'hinox', name: 'ひとつ目巨人 ギガロス', x: -250, z: 120, lv: 10 },
  { id: 'b_frost', type: 'talus_ice', name: '氷岩の巨人 フロストロック', x: 80, z: -520, lv: 15 },
  { id: 'b_igneo', type: 'talus_fire', name: '溶岩の巨人 イグニスロック', x: 470, z: -360, lv: 18 },
  { id: 'b_lizal', type: 'lizal_king', name: '沼の主 リザルドキング', x: 450, z: 438, lv: 14 },
  { id: 'b_lynel', type: 'lynel', name: '獣王 ライガ', x: -560, z: -600, lv: 26 },
];

// ラスボス
G.World.finalBoss = { id: 'omega', name: '暴走機神 オメガ', x: 0, z: -10 };

// 封印の剣・迷いの森
G.World.sealSword = { x: -520, z: -60, needHearts: 10 };
G.World.lostWoods = {
  // 森の中心部（ここに入ると霧の迷い判定）
  cx: -500, cz: -40, r: 150,
  path: [[-380, 40], [-420, 20], [-450, -10], [-470, -30], [-490, -45], [-520, -60]],
  entrance: [-370, 50],
};

// 上昇気流（パラセールで上昇できる場所）
G.World.updrafts = [
  { x: 470, z: -230, r: 8, top: 220 }, { x: -100, z: -470, r: 7, top: 190 },
  { x: 20, z: 180, r: 6, top: 90 }, { x: -470, z: -420, r: 7, top: 150 },
];

// 溶岩
G.World.lava = { x: 520, z: -280, r: 44, y: 150 };

// 敵キャンプ（zone で強さが決まる。配置はワールド生成で高さを補正）
G.World.camps = [
  { x: 120, z: 420, zone: 1, n: 3 }, { x: -60, z: 300, zone: 1, n: 3 }, { x: 170, z: 520, zone: 1, n: 2 },
  { x: -200, z: 480, zone: 1, n: 3 }, { x: -380, z: 470, zone: 2, n: 4, archer: true }, { x: -500, z: 330, zone: 2, n: 4 },
  { x: -330, z: 200, zone: 2, n: 3 }, { x: 250, z: 260, zone: 2, n: 4, lizal: true }, { x: 470, z: 330, zone: 2, n: 4, lizal: true },
  { x: 540, z: 560, zone: 2, n: 3, lizal: true }, { x: 100, z: 150, zone: 3, n: 4, archer: true }, { x: -120, z: 170, zone: 3, n: 4 },
  { x: 180, z: -160, zone: 3, n: 4 }, { x: -380, z: -150, zone: 3, n: 4, archer: true }, { x: -580, z: 60, zone: 3, n: 3 },
  { x: -300, z: -300, zone: 3, n: 4 }, { x: 60, z: -430, zone: 3, n: 4, archer: true }, { x: -250, z: -520, zone: 3, n: 4 },
  { x: 300, z: -300, zone: 3, n: 4 }, { x: 600, z: -120, zone: 3, n: 4, archer: true }, { x: 420, z: -460, zone: 4, n: 4 },
  { x: -620, z: -460, zone: 4, n: 4, archer: true }, { x: -500, z: -640, zone: 4, n: 3 }, { x: 80, z: -80, zone: 4, n: 4, archer: true },
  { x: -90, z: -90, zone: 4, n: 4 }, { x: 60, z: 80, zone: 4, n: 3 }, { x: 650, z: 250, zone: 3, n: 3 }, { x: 200, z: -560, zone: 4, n: 4 },
];

// 古代兵（ガーディアン）の配置（古城の周り）
G.World.guardians = [
  [90, 40], [-80, 50], [40, -100], [-60, -110], [140, -40], [-140, -20], [0, 130], [110, 110], [-120, 120], [180, 60], [-30, 200], [200, -100],
];

// 野生の馬の群れ
G.World.horseHerds = [[-420, 400], [-480, 260], [-300, 470], [150, 600], [-150, 560]];

// 地図の地名ラベル
G.World.labels = [
  { name: 'ハジマリ村', x: 0, z: 470 }, { name: 'かぜの馬宿', x: -260, z: 270 }, { name: 'シロガネの宿場', x: -120, z: -400 },
  { name: 'ゴロゴ村', x: 360, z: -80 }, { name: 'ミナモの村', x: 300, z: 345 }, { name: '古代研究所', x: -400, z: -380 },
  { name: '古城跡', x: 0, z: 0, big: true }, { name: '迷いの森', x: -480, z: -20, big: true }, { name: '白嶺山脈', x: 0, z: -600, big: true },
  { name: 'ほむら火山', x: 520, z: -300, big: true }, { name: 'ミナモ湖', x: 440, z: 440, big: true }, { name: 'かぜの平原', x: -440, z: 440, big: true },
  { name: 'ゴウセキ峡谷', x: -560, z: -540, big: true }, { name: 'はじまりの野', x: 40, z: 560, big: true },
];
