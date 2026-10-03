// ===== アイテムデータ（武器・矢・素材・料理・ショップ） =====
'use strict';
G.Items = {};

// 武器: type = sword(片手剣) / heavy(両手剣・斧) / spear(槍) / bow(弓) / rod(魔法ロッド)
G.Items.weapons = {
  // ---- 片手剣 ----
  stick:          { name: '木の棒', type: 'sword', atk: 2, dur: 8, price: 2, mk: 'stick', c1: 0x9c6b3c, desc: '森で拾える木の棒。すぐ折れる。' },
  goblin_club:    { name: 'ゴブリンこん棒', type: 'sword', atk: 4, dur: 12, price: 5, mk: 'club', c1: 0x7a5230, desc: 'ゴブリンが使う粗末なこん棒。' },
  trav_sword:     { name: '旅人の剣', type: 'sword', atk: 5, dur: 20, price: 30, metal: true, mk: 'sword', c1: 0xcfd8dc, c2: 0x6d4c41, desc: '旅人がよく使う標準的な剣。' },
  spiked_club:    { name: 'トゲこん棒', type: 'sword', atk: 10, dur: 18, price: 18, mk: 'club', c1: 0x5d4037, spikes: true, desc: '鋭いトゲが打ち込まれたこん棒。' },
  soldier_sword:  { name: '兵士の剣', type: 'sword', atk: 9, dur: 25, price: 70, metal: true, mk: 'sword', c1: 0xe0e6ea, c2: 0x1e4f8a, desc: '王国の兵士に支給された剣。' },
  lizal_blade:    { name: 'トカゲの曲刀', type: 'sword', atk: 12, dur: 22, price: 60, metal: true, mk: 'scimitar', c1: 0xb0bec5, c2: 0x33691e, desc: 'トカゲ戦士の三日月形の刃。' },
  knight_sword:   { name: '騎士の剣', type: 'sword', atk: 15, dur: 30, price: 180, metal: true, mk: 'sword', c1: 0xf5f5f5, c2: 0xb8913a, desc: '騎士のための美しい剣。' },
  flame_sword:    { name: '炎の剣', type: 'sword', atk: 14, dur: 30, price: 260, metal: true, elem: 'fire', mk: 'sword', c1: 0xff7043, c2: 0x4e342e, glow: 0xff5722, desc: '斬った相手を燃やす炎の剣。' },
  frost_sword:    { name: '氷の剣', type: 'sword', atk: 13, dur: 30, price: 260, metal: true, elem: 'ice', mk: 'sword', c1: 0x81d4fa, c2: 0x283593, glow: 0x4fc3f7, desc: '斬った相手を凍らせる氷の剣。' },
  thunder_sword:  { name: '雷の剣', type: 'sword', atk: 13, dur: 30, price: 260, metal: true, elem: 'elec', mk: 'sword', c1: 0xfff176, c2: 0x4a148c, glow: 0xffee58, desc: '斬った相手をしびれさせる雷の剣。' },
  dragonbone_club:{ name: '竜骨こん棒', type: 'sword', atk: 22, dur: 22, price: 90, mk: 'club', c1: 0xeeeeee, spikes: true, desc: '竜の骨で作った重いこん棒。' },
  royal_sword:    { name: '王家の剣', type: 'sword', atk: 24, dur: 32, price: 420, metal: true, mk: 'sword', c1: 0xfafafa, c2: 0x6a1b9a, desc: '王家に仕える者だけが持つ剣。' },
  ancient_sword:  { name: '古代兵装・剣', type: 'sword', atk: 32, dur: 40, price: 600, ancient: true, mk: 'sword', c1: 0x5ce1e6, c2: 0x6d6250, glow: 0x40e0ff, desc: '古代技術の剣。古代兵器に大ダメージ。' },
  savage_sword:   { name: '獣王の剣', type: 'sword', atk: 40, dur: 28, price: 500, metal: true, mk: 'scimitar', c1: 0xbcaaa4, c2: 0x3e2723, desc: '獣王ライガの剛剣。' },
  seal_sword:     { name: '封印の剣', type: 'sword', atk: 34, dur: 40, price: 0, legendary: true, ancient: true, metal: true, mk: 'sword', c1: 0xc5e3ff, c2: 0x3d5afe, glow: 0x82b1ff, desc: '古代機兵を封じた伝説の剣。壊れず、力を使い切ると眠って回復する。古代兵器に2倍のダメージ。' },
  // ---- 両手剣・斧 ----
  woodcutter_axe: { name: '木こりの斧', type: 'heavy', atk: 6, dur: 25, price: 25, metal: true, mk: 'axe', c1: 0x9e9e9e, desc: '木を切るための斧。戦いにも使える。' },
  trav_claymore:  { name: '旅人の大剣', type: 'heavy', atk: 10, dur: 22, price: 50, metal: true, mk: 'claymore', c1: 0xcfd8dc, c2: 0x5d4037, desc: '両手で振るう大きな剣。' },
  soldier_claymore:{ name: '兵士の大剣', type: 'heavy', atk: 16, dur: 28, price: 120, metal: true, mk: 'claymore', c1: 0xe0e6ea, c2: 0x1e4f8a, desc: '兵士の両手剣。' },
  golem_hammer:   { name: '岩砕きのハンマー', type: 'heavy', atk: 20, dur: 40, price: 200, metal: true, mk: 'hammer', c1: 0x8d6e63, desc: '鉱石を一撃で砕く大槌。' },
  knight_claymore:{ name: '騎士の大剣', type: 'heavy', atk: 26, dur: 32, price: 300, metal: true, mk: 'claymore', c1: 0xf5f5f5, c2: 0xb8913a, desc: '騎士の両手剣。' },
  flame_claymore: { name: '炎の大剣', type: 'heavy', atk: 24, dur: 30, price: 380, metal: true, elem: 'fire', mk: 'claymore', c1: 0xff7043, c2: 0x3e2723, glow: 0xff5722, desc: '炎をまとう大剣。' },
  giant_axe:      { name: '巨人の斧', type: 'heavy', atk: 34, dur: 26, price: 260, metal: true, mk: 'axe', c1: 0x757575, big: true, desc: 'ひとつ目巨人が振るっていた巨大な斧。' },
  ancient_claymore:{ name: '古代兵装・大剣', type: 'heavy', atk: 44, dur: 40, price: 800, ancient: true, mk: 'claymore', c1: 0x5ce1e6, c2: 0x6d6250, glow: 0x40e0ff, desc: '古代技術の大剣。古代兵器に大ダメージ。' },
  savage_claymore:{ name: '獣王の大剣', type: 'heavy', atk: 52, dur: 30, price: 700, metal: true, mk: 'claymore', c1: 0xbcaaa4, c2: 0x3e2723, desc: '獣王ライガの大剣。' },
  // ---- 槍 ----
  wood_spear:     { name: '木の槍', type: 'spear', atk: 3, dur: 15, price: 8, mk: 'spear', c1: 0x9c6b3c, desc: '先を尖らせた木の槍。' },
  goblin_spear:   { name: 'ゴブリンの槍', type: 'spear', atk: 4, dur: 14, price: 6, mk: 'spear', c1: 0x7a5230, desc: 'ゴブリンの粗末な槍。' },
  trav_spear:     { name: '旅人の槍', type: 'spear', atk: 6, dur: 22, price: 30, metal: true, mk: 'spear', c1: 0xcfd8dc, desc: '扱いやすい旅人の槍。' },
  soldier_spear:  { name: '兵士の槍', type: 'spear', atk: 10, dur: 26, price: 90, metal: true, mk: 'spear', c1: 0xe0e6ea, desc: '兵士の槍。' },
  lizal_trident:  { name: 'トカゲの三又槍', type: 'spear', atk: 14, dur: 24, price: 80, metal: true, mk: 'trident', c1: 0xb0bec5, desc: 'トカゲ戦士の三又槍。' },
  frost_spear:    { name: '氷の槍', type: 'spear', atk: 15, dur: 30, price: 280, metal: true, elem: 'ice', mk: 'spear', c1: 0x81d4fa, glow: 0x4fc3f7, desc: '突いた相手を凍らせる。' },
  knight_spear:   { name: '騎士の槍', type: 'spear', atk: 17, dur: 30, price: 220, metal: true, mk: 'spear', c1: 0xf5f5f5, desc: '騎士の槍。' },
  ancient_spear:  { name: '古代兵装・槍', type: 'spear', atk: 30, dur: 40, price: 650, ancient: true, mk: 'spear', c1: 0x5ce1e6, glow: 0x40e0ff, desc: '古代技術の槍。古代兵器に大ダメージ。' },
  savage_spear:   { name: '獣王の槍', type: 'spear', atk: 36, dur: 28, price: 520, metal: true, mk: 'trident', c1: 0xbcaaa4, desc: '獣王ライガの槍。' },
  // ---- 弓 ----
  goblin_bow:     { name: 'ゴブリンの弓', type: 'bow', atk: 4, dur: 14, price: 6, mk: 'bow', c1: 0x7a5230, desc: 'ゴブリンの粗末な弓。' },
  trav_bow:       { name: '旅人の弓', type: 'bow', atk: 4, dur: 20, price: 35, mk: 'bow', c1: 0x8d6e63, desc: '軽くて扱いやすい弓。' },
  soldier_bow:    { name: '兵士の弓', type: 'bow', atk: 8, dur: 30, price: 90, mk: 'bow', c1: 0x1e4f8a, desc: '兵士の弓。' },
  falcon_bow:     { name: '隼の弓', type: 'bow', atk: 12, dur: 30, price: 200, mk: 'bow', c1: 0x26a69a, fast: true, desc: '素早く引ける弓。' },
  triple_bow:     { name: '三連の弓', type: 'bow', atk: 7, dur: 30, price: 330, mk: 'bow', c1: 0x5d4037, multi: 3, desc: '一度に3本の矢を放つ。' },
  knight_bow:     { name: '騎士の弓', type: 'bow', atk: 14, dur: 36, price: 260, mk: 'bow', c1: 0xb8913a, desc: '騎士の強弓。' },
  lizal_bow:      { name: 'トカゲの弓', type: 'bow', atk: 10, dur: 30, price: 120, mk: 'bow', c1: 0x33691e, multi: 3, desc: '3本同時に放てるトカゲ族の弓。' },
  ancient_bow:    { name: '古代兵装・弓', type: 'bow', atk: 30, dur: 50, price: 700, ancient: true, mk: 'bow', c1: 0x6d6250, glow: 0x40e0ff, desc: '矢がまっすぐ遠くまで飛ぶ古代の弓。' },
  savage_bow:     { name: '獣王の弓', type: 'bow', atk: 30, dur: 30, price: 600, mk: 'bow', c1: 0x3e2723, multi: 3, desc: '獣王の3連弓。' },
  // ---- 魔法ロッド ----
  fire_rod:       { name: '炎のロッド', type: 'rod', atk: 12, dur: 30, price: 160, magic: 'fire', mp: 8, mk: 'rod', c1: 0x6d4c41, glow: 0xff5722, desc: 'MPを使って火球を放つ。' },
  ice_rod:        { name: '氷のロッド', type: 'rod', atk: 10, dur: 30, price: 170, magic: 'ice', mp: 10, mk: 'rod', c1: 0x5d4037, glow: 0x4fc3f7, desc: 'MPを使って氷の結晶を放つ。凍らせる。' },
  thunder_rod:    { name: '雷のロッド', type: 'rod', atk: 14, dur: 30, price: 190, magic: 'elec', mp: 12, mk: 'rod', c1: 0x4a148c, glow: 0xffee58, desc: 'MPを使って雷を放つ。近くの敵に連鎖。' },
  meteor_rod:     { name: '流星のロッド', type: 'rod', atk: 24, dur: 30, price: 480, magic: 'fire', mp: 18, triple: true, mk: 'rod', c1: 0x3e2723, glow: 0xff3d00, desc: '3つの火球を同時に放つ。' },
  blizzard_rod:   { name: '吹雪のロッド', type: 'rod', atk: 22, dur: 30, price: 480, magic: 'ice', mp: 18, triple: true, mk: 'rod', c1: 0x1a237e, glow: 0x80d8ff, desc: '3つの氷塊を同時に放つ。' },
  storm_rod:      { name: '嵐のロッド', type: 'rod', atk: 26, dur: 30, price: 500, magic: 'elec', mp: 20, triple: true, mk: 'rod', c1: 0x311b92, glow: 0xffff00, desc: '強力な連鎖雷を放つ。' },
  ancient_rod:    { name: '古代の杖', type: 'rod', atk: 36, dur: 40, price: 900, magic: 'beam', mp: 16, ancient: true, mk: 'rod', c1: 0x6d6250, glow: 0x40e0ff, desc: '古代のビームを放つ杖。古代兵器に大ダメージ。' },
};

// 矢
G.Items.arrows = {
  normal:  { name: '矢', mul: 1, color: 0xd7ccc8, price: 2 },
  fire:    { name: '炎の矢', mul: 1, elem: 'fire', bonus: 10, color: 0xff7043, price: 12 },
  ice:     { name: '氷の矢', mul: 1, elem: 'ice', bonus: 10, color: 0x4fc3f7, price: 12 },
  elec:    { name: '雷の矢', mul: 1, elem: 'elec', bonus: 12, color: 0xffee58, price: 14 },
  bomb:    { name: 'バクダン矢', mul: 1, bomb: true, bonus: 24, color: 0x424242, price: 20 },
  ancient: { name: '古代の矢', mul: 3, ancientArrow: true, bonus: 20, color: 0x40e0ff, price: 80 },
};
G.Items.arrowOrder = ['normal', 'fire', 'ice', 'elec', 'bomb', 'ancient'];

// 素材: heal は 1/4ハート単位
G.Items.mats = {
  apple:       { name: 'りんご', ic: '🍎', cat: 'fruit', heal: 2, price: 3, desc: 'どこにでもある果物。' },
  berry:       { name: 'ヤマイチゴ', ic: '🍓', cat: 'fruit', heal: 2, price: 3, desc: '甘酸っぱい野いちご。' },
  shroom:      { name: 'ヤマタケ', ic: '🍄', cat: 'mushroom', heal: 2, price: 3, desc: '森でよく見るキノコ。' },
  herb:        { name: 'やくそう', ic: '🌿', cat: 'herb', heal: 4, price: 5, desc: '傷に効く薬草。' },
  spicy:       { name: 'ポカポカの実', ic: '🌶️', cat: 'fruit', heal: 2, eff: 'warm', pow: 1, price: 6, desc: '料理すると寒さに強くなる。' },
  chill:       { name: 'ヒンヤリメロン', ic: '🍈', cat: 'fruit', heal: 2, eff: 'cool', pow: 1, price: 6, desc: '料理すると暑さに強くなる。' },
  fireweed:    { name: 'ほのお草', ic: '🔥', cat: 'herb', heal: 1, eff: 'fireproof', pow: 1, price: 10, desc: '料理すると炎に強くなる（耐火）。' },
  mighty:      { name: 'チカラダケ', ic: '🍄', cat: 'mushroom', heal: 2, eff: 'attack', pow: 1, price: 8, desc: '料理すると攻撃力が上がる。' },
  tough:       { name: 'カタイダケ', ic: '🍄', cat: 'mushroom', heal: 2, eff: 'defense', pow: 1, price: 8, desc: '料理すると防御力が上がる。' },
  swift:       { name: 'ハヤアシ草', ic: '🌱', cat: 'herb', heal: 1, eff: 'speed', pow: 1, price: 8, desc: '料理すると足が速くなる。' },
  honey:       { name: 'ガンバリハチミツ', ic: '🍯', cat: 'honey', heal: 4, eff: 'stamina', pow: 1, price: 15, desc: '料理するとがんばりが回復する。' },
  mpflower:    { name: 'マリョクの花', ic: '🌸', cat: 'herb', heal: 1, eff: 'mp', pow: 1, price: 10, desc: '料理するとMPが回復する。' },
  meat:        { name: 'ケモノ肉', ic: '🍖', cat: 'meat', heal: 4, price: 8, desc: '動物の肉。' },
  prime_meat:  { name: '上ケモノ肉', ic: '🥩', cat: 'meat', heal: 8, price: 15, desc: '上質な肉。' },
  fish:        { name: 'ヤマメ', ic: '🐟', cat: 'fish', heal: 3, price: 6, desc: '川魚。' },
  big_fish:    { name: '大マス', ic: '🐠', cat: 'fish', heal: 6, price: 12, desc: '大きなマス。' },
  // モンスター素材
  goblin_horn: { name: 'ゴブリンのツノ', ic: '🦴', cat: 'monster', price: 5, desc: '売るとお金になる。' },
  goblin_fang: { name: 'ゴブリンのキバ', ic: '🦷', cat: 'monster', price: 12, desc: '売るとお金になる。' },
  jelly:       { name: 'スライムゼリー', ic: '🟢', cat: 'monster', price: 4, desc: '売るとお金になる。' },
  fire_jelly:  { name: '炎のゼリー', ic: '🔴', cat: 'monster', price: 10, desc: '売るとお金になる。' },
  ice_jelly:   { name: '氷のゼリー', ic: '🔵', cat: 'monster', price: 10, desc: '売るとお金になる。' },
  elec_jelly:  { name: '雷のゼリー', ic: '🟡', cat: 'monster', price: 10, desc: '売るとお金になる。' },
  lizal_tail:  { name: 'トカゲの尾', ic: '🦎', cat: 'monster', price: 15, desc: '売るとお金になる。' },
  wolf_fang:   { name: '魔狼の牙', ic: '🐺', cat: 'monster', price: 10, desc: '売るとお金になる。' },
  bat_wing:    { name: 'コウモリの羽', ic: '🦇', cat: 'monster', price: 3, desc: '売るとお金になる。' },
  bone:        { name: '古びた骨', ic: '💀', cat: 'monster', price: 6, desc: '売るとお金になる。' },
  giant_eye:   { name: '巨人の目玉', ic: '👁️', cat: 'monster', price: 150, desc: '高く売れる。' },
  talus_heart: { name: '岩の心臓', ic: '🪨', cat: 'monster', price: 200, desc: '高く売れる。' },
  lizal_crown: { name: '沼の王冠', ic: '👑', cat: 'monster', price: 250, desc: '高く売れる。' },
  lynel_horn:  { name: '獣王のツノ', ic: '🐂', cat: 'monster', price: 300, desc: '高く売れる。' },
  // 古代素材
  ancient_screw:{ name: '古代のネジ', ic: '🔩', cat: 'ancient', price: 10, desc: '古代研究所で武器や矢と交換できる。' },
  ancient_gear: { name: '古代の歯車', ic: '⚙️', cat: 'ancient', price: 30, desc: '古代研究所で武器や矢と交換できる。' },
  ancient_core: { name: '古代のコア', ic: '💠', cat: 'ancient', price: 200, desc: '古代研究所で武器と交換できる貴重な部品。' },
  // 鉱石
  amber:       { name: '琥珀', ic: '🟠', cat: 'gem', price: 30, desc: '売るとお金になる。' },
  opal:        { name: 'オパール', ic: '⚪', cat: 'gem', price: 60, desc: '売るとお金になる。' },
  topaz:       { name: 'トパーズ', ic: '🟡', cat: 'gem', price: 150, desc: '売るとお金になる。' },
  ruby:        { name: 'ルビー', ic: '🔴', cat: 'gem', price: 210, desc: '売るとお金になる。' },
  sapphire:    { name: 'サファイア', ic: '🔷', cat: 'gem', price: 260, desc: '売るとお金になる。' },
  diamond:     { name: 'ダイヤモンド', ic: '💎', cat: 'gem', price: 500, desc: 'とても高く売れる。' },
};
G.Items.edible = (id) => { const m = G.Items.mats[id]; return m && m.heal > 0 && !['monster', 'ancient', 'gem'].includes(m.cat); };

G.Items.effectNames = {
  warm: 'ポカポカ', cool: 'ヒンヤリ', fireproof: '耐火', attack: 'チカラ', defense: 'カタイ', speed: 'ハヤアシ', stamina: 'ガンバリ', mp: 'マリョク',
};
G.Items.effectDesc = {
  warm: '寒さに強くなる', cool: '暑さに強くなる', fireproof: '燃えなくなる', attack: '攻撃力アップ', defense: '防御力アップ', speed: '移動速度アップ', stamina: 'がんばり回復', mp: 'MP回復',
};
G.Items.effectIcon = { warm: '🌡️', cool: '❄️', fireproof: '🔥', attack: '⚔️', defense: '🛡️', speed: '👟' };

// 料理
G.Items.cook = function (ids) {
  const mats = ids.map(id => G.Items.mats[id]).filter(Boolean);
  if (!mats.length) return null;
  const edible = mats.filter(m => !['monster', 'ancient', 'gem'].includes(m.cat));
  if (!edible.length) return { name: 'よくわからない料理', heal: 1, eff: null, pow: 0, dur: 0, ic: '🍲' };
  let heal = 0; const effs = {}; let powSum = 0;
  for (const m of edible) { heal += m.heal; if (m.eff) { effs[m.eff] = (effs[m.eff] || 0) + m.pow; powSum += m.pow; } }
  heal = heal * 2;
  const effKeys = Object.keys(effs);
  let eff = null, pow = 0;
  if (effKeys.length === 1) { eff = effKeys[0]; pow = effs[eff] >= 4 ? 3 : effs[eff] >= 2 ? 2 : 1; }
  const cats = new Set(edible.map(m => m.cat));
  let base = '野菜炒め', ic = '🥗';
  if (cats.has('meat') && cats.has('mushroom')) { base = 'キノコ肉串'; ic = '🍢'; }
  else if (cats.has('meat') && cats.has('fish')) { base = '山海焼き'; ic = '🍱'; }
  else if (cats.has('meat') && cats.has('fruit')) { base = 'フルーツ肉煮込み'; ic = '🍲'; }
  else if (cats.has('meat')) { base = '焼き肉'; ic = '🍖'; }
  else if (cats.has('fish') && cats.has('mushroom')) { base = 'キノコ焼き魚'; ic = '🐟'; }
  else if (cats.has('fish')) { base = '焼き魚'; ic = '🐟'; }
  else if (cats.has('mushroom') && cats.has('fruit')) { base = 'キノコと果実のソテー'; ic = '🍳'; }
  else if (cats.has('mushroom')) { base = 'キノコ焼き'; ic = '🍄'; }
  else if (cats.has('honey')) { base = 'ハチミツアメ'; ic = '🍯'; }
  else if (cats.has('fruit')) { base = '焼きフルーツ'; ic = '🍎'; }
  else if (cats.has('herb')) { base = '薬草スープ'; ic = '🍵'; }
  const name = (eff ? G.Items.effectNames[eff] + ' ' : '') + base;
  const dur = eff && eff !== 'stamina' && eff !== 'mp' ? 60 + 40 * edible.length : 0;
  return { name, heal, eff, pow, dur, ic };
};

// 調合済みの薬（ショップ販売用）
G.Items.potions = {
  warm_potion:  { name: 'ポカポカ薬', heal: 0, eff: 'warm', pow: 2, dur: 300, ic: '🧪' },
  cool_potion:  { name: 'ヒンヤリ薬', heal: 0, eff: 'cool', pow: 2, dur: 300, ic: '🧪' },
  fire_potion:  { name: '耐火の薬', heal: 0, eff: 'fireproof', pow: 2, dur: 300, ic: '🧪' },
  heal_potion:  { name: '回復の薬', heal: 20, eff: null, pow: 0, dur: 0, ic: '🧪' },
  power_potion: { name: 'チカラの薬', heal: 0, eff: 'attack', pow: 2, dur: 180, ic: '🧪' },
};

// ショップ在庫
G.Items.shops = {
  hajimari: [
    { k: 'w', id: 'trav_sword', p: 60 }, { k: 'w', id: 'trav_spear', p: 60 }, { k: 'w', id: 'woodcutter_axe', p: 50 }, { k: 'w', id: 'trav_bow', p: 70 },
    { k: 'a', id: 'normal', n: 10, p: 20 }, { k: 'm', id: 'apple', p: 5 }, { k: 'm', id: 'meat', p: 12 }, { k: 'm', id: 'spicy', p: 15 },
    { k: 'f', id: 'heal_potion', p: 40 },
  ],
  stable: [
    { k: 'w', id: 'soldier_sword', p: 150 }, { k: 'w', id: 'trav_claymore', p: 110 }, { k: 'w', id: 'soldier_bow', p: 180 }, { k: 'w', id: 'fire_rod', p: 300 },
    { k: 'a', id: 'normal', n: 10, p: 20 }, { k: 'a', id: 'fire', n: 5, p: 60 }, { k: 'a', id: 'ice', n: 5, p: 60 },
    { k: 'm', id: 'honey', p: 25 }, { k: 'm', id: 'swift', p: 20 }, { k: 'f', id: 'heal_potion', p: 40 },
  ],
  snow: [
    { k: 'w', id: 'soldier_claymore', p: 240 }, { k: 'w', id: 'soldier_spear', p: 180 }, { k: 'w', id: 'frost_sword', p: 520 }, { k: 'w', id: 'ice_rod', p: 340 },
    { k: 'a', id: 'normal', n: 10, p: 20 }, { k: 'a', id: 'fire', n: 5, p: 60 }, { k: 'm', id: 'spicy', p: 12 }, { k: 'm', id: 'tough', p: 25 },
    { k: 'f', id: 'warm_potion', p: 60 }, { k: 'f', id: 'heal_potion', p: 40 },
  ],
  fire: [
    { k: 'w', id: 'knight_sword', p: 400 }, { k: 'w', id: 'knight_claymore', p: 560 }, { k: 'w', id: 'golem_hammer', p: 380 }, { k: 'w', id: 'flame_claymore', p: 720 },
    { k: 'w', id: 'meteor_rod', p: 950 }, { k: 'a', id: 'bomb', n: 5, p: 100 }, { k: 'a', id: 'ice', n: 5, p: 60 },
    { k: 'f', id: 'fire_potion', p: 80 }, { k: 'f', id: 'cool_potion', p: 50 }, { k: 'm', id: 'chill', p: 15 }, { k: 'f', id: 'power_potion', p: 120 },
  ],
  lake: [
    { k: 'w', id: 'knight_spear', p: 450 }, { k: 'w', id: 'knight_bow', p: 500 }, { k: 'w', id: 'triple_bow', p: 680 }, { k: 'w', id: 'thunder_rod', p: 380 },
    { k: 'w', id: 'frost_spear', p: 560 }, { k: 'a', id: 'elec', n: 5, p: 70 }, { k: 'a', id: 'normal', n: 20, p: 38 },
    { k: 'm', id: 'big_fish', p: 20 }, { k: 'm', id: 'mpflower', p: 25 }, { k: 'f', id: 'heal_potion', p: 40 },
  ],
};

// 古代研究所での交換
G.Items.lab = [
  { give: { k: 'a', id: 'ancient', n: 3 }, money: 150, mats: { ancient_screw: 2, ancient_gear: 1 } },
  { give: { k: 'w', id: 'ancient_bow' }, money: 800, mats: { ancient_screw: 5, ancient_gear: 3 } },
  { give: { k: 'w', id: 'ancient_spear' }, money: 900, mats: { ancient_screw: 5, ancient_gear: 3, ancient_core: 1 } },
  { give: { k: 'w', id: 'ancient_sword' }, money: 1000, mats: { ancient_screw: 6, ancient_gear: 3, ancient_core: 1 } },
  { give: { k: 'w', id: 'ancient_claymore' }, money: 1200, mats: { ancient_screw: 8, ancient_gear: 4, ancient_core: 2 } },
  { give: { k: 'w', id: 'ancient_rod' }, money: 1200, mats: { ancient_gear: 5, ancient_core: 2 } },
];
