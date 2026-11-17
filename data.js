// ひとり親・寡婦控除いくら？の問題を作る（ブラウザと node の両方で使う）。
// 中身は、国税庁タックスアンサー No.1171「ひとり親控除」・No.1170「寡婦控除」に書いてあることだけ（［令和8年4月1日現在法令等］。2026-11-17 に読んだ。要点は共有フォルダ games/hitorioya-ikura-research.md）。
// 1問は、本人の結婚のようす・生計を一にする子・扶養親族・合計所得金額を読んで、ひとり親控除か寡婦控除の額を選ぶ。正解したら2段目「どの決まり？」を選ぶ。
// 答えはコードで計算する：
//   ひとり親 35万円：婚姻していない（または配偶者の生死が明らかでない）・事実上婚姻関係と同様の人がいない・生計を一にする子（総所得金額等が62万円以下〔令和8年分〕で、
//     ほかの人の同一生計配偶者や扶養親族でない）がいる・合計所得金額が500万円以下。
//   寡婦 27万円：ひとり親に当たらない・事実上婚姻関係と同様の人がいない・合計所得金額が500万円以下で、夫と離婚して婚姻しておらず扶養親族がいる、
//     または夫と死別して婚姻していない・夫の生死が明らかでない（この場合は扶養親族の要件はない）。
// 金額は令和8年分（ひとり親控除の38万円は令和9年分から。このゲームでは出さない）。税額・住民税・申告の手続きは扱わない（画面に書く）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。
// KINDS の並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const AS_OF = "令和8年4月1日現在法令等";

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    a: ["国税庁 タックスアンサー No.1171 ひとり親控除", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1171.htm"],
    b: ["国税庁 タックスアンサー No.1170 寡婦控除", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1170.htm"],
  };
  const MEDIA = { a: "12月31日の家族のようす（所得税）" };
  const MAN = 10000;
  const OYA = 350000, KAFU = 270000, KO_MAX = 620000, HON_MAX = 5000000;
  // at：m 結婚のようす（mikon 婚姻していない・rikon 離婚・shibetsu 死別・fumei 生死不明・kekkon 婚姻中）・sp 相手（otto 夫・tsuma 妻・haigusha 配偶者）
  //     jj 事実上の夫婦の人がいる・kid 生計を一にする子がいる・two 子が2人・ko 子がほかの人の扶養親族・fy 子のほかに扶養親族がいる
  function deductOf(at, S, C, D) {
    const single = ["mikon", "rikon", "shibetsu", "fumei"].includes(at.m);
    const kidOK = !!at.kid && !at.ko && (C <= KO_MAX || (!!at.two && D <= KO_MAX));
    if (single && !at.jj && kidOK && S <= HON_MAX) return OYA;
    const kafu = !at.jj && at.sp === "otto" && ((at.m === "rikon" && !!at.fy) || at.m === "shibetsu" || at.m === "fumei");
    if (kafu && S <= HON_MAX) return KAFU;
    return 0;
  }

  // 2段目「どの決まり？」
  const GROUPS = {
    oya: { name: "ひとり親", sub: "35万円", set: "all" },
    rikon: { name: "寡婦（離婚）", sub: "27万円・扶養親族が要る", set: "all" },
    shibetsu: { name: "寡婦（死別・生死不明）", sub: "27万円・扶養親族の要件なし", set: "all" },
    shotoku: { name: "所得が500万円を超える", sub: "どちらも受けられない", set: "all" },
    none: { name: "当たらない", sub: "子・結婚・事実婚の条件", set: "all" },
  };
  const GRP_WHY = {
    oya: "婚姻していない人で、生計を一にする子（総所得金額等62万円以下）がいて、合計所得金額が500万円以下なら、ひとり親控除35万円です。",
    rikon: "夫と離婚して婚姻しておらず、扶養親族がいる人は、ひとり親に当たらなくても寡婦控除27万円です（合計所得金額500万円以下）。",
    shibetsu: "夫と死別して婚姻していない人や、夫の生死が明らかでない人は、扶養親族がいなくても寡婦控除27万円です（合計所得金額500万円以下）。",
    shotoku: "ひとり親控除も寡婦控除も、本人の合計所得金額が500万円以下の人だけです。500万円を超えると受けられません。",
    none: "子の所得が62万円を超える・ほかの人の扶養親族・婚姻中・事実上の夫婦の人がいる・離婚で扶養親族がいない、などは当たりません。",
  };
  const KEY = {
    oya: "婚姻していない・子（所得62万円以下）がいる・500万円以下で35万円",
    rikon: "夫と離婚・扶養親族がいる・500万円以下で27万円",
    shibetsu: "夫と死別・生死不明は扶養親族がいなくても27万円",
    shotoku: "合計所得金額500万円超はどちらも0円",
    none: "条件に当たらなければ0円",
  };

  // 種類：[id, 難しさ, 2段目, 場面（＄S 本人の合計所得金額・＄C ＄D 子の総所得金額等）, {S, C, D}: [下限, 上限, 刻み], at, ヒント1]
  const ME = "本人の合計所得金額は＄S。";
  const KO = "生計を一にする子の総所得金額等は＄C。";
  const D = [
    ["o_mikon", 0, "oya", "結婚していない。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "mikon", kid: 1 }, "子がいて、婚姻していないなら？"],
    ["o_rikon", 0, "oya", "夫と離婚した。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "rikon", sp: "otto", kid: 1 }, "寡婦より先に、ひとり親を見る。"],
    ["o_shibetsu", 0, "oya", "配偶者と死別した。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "shibetsu", sp: "haigusha", kid: 1 }, "子がいれば？"],
    ["k_shibetsu", 0, "shibetsu", "夫と死別し、子も扶養親族もいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "shibetsu", sp: "otto" }, "死別なら扶養親族は要る？"],
    ["k_rikon", 0, "rikon", "夫と離婚し、子はいない。同居の母が扶養親族。" + ME, { S: [1000000, 4900000, 100000] }, { m: "rikon", sp: "otto", fy: 1 }, "離婚で扶養親族がいれば？"],
    ["s_over", 0, "shotoku", "結婚していない。" + KO + ME, { S: [5100000, 9000000, 100000], C: [0, 500000, 10000] }, { m: "mikon", kid: 1 }, "本人の所得の上限は？"],
    ["n_kekkon", 0, "none", "夫と結婚している。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "kekkon", sp: "otto", kid: 1 }, "婚姻中だと？"],
    ["n_rikon0", 0, "none", "夫と離婚し、子も扶養親族もいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "rikon", sp: "otto" }, "離婚なら扶養親族が要る。"],
    ["o_fumei", 0, "oya", "配偶者の生死が明らかでない。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "fumei", sp: "haigusha", kid: 1 }, "生死が明らかでないときは？"],
    ["k_dokuritsu", 0, "shibetsu", "夫と死別した。子は独立して別に暮らし、扶養親族はいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "shibetsu", sp: "otto" }, "死別なら扶養親族の要件は？"],
    ["w_c62", 1, "oya", "結婚していない。生計を一にする子の総所得金額等はちょうど＄C。" + ME, { S: [2000000, 4800000, 100000], C: [620000, 620000, 1] }, { m: "mikon", kid: 1 }, "62万円「以下」に入る？"],
    ["w_s500", 1, "oya", "夫と離婚した。" + KO + "本人の合計所得金額はちょうど＄S。", { S: [5000000, 5000000, 1], C: [0, 500000, 10000] }, { m: "rikon", sp: "otto", kid: 1 }, "500万円「以下」に入る？"],
    ["n_cover", 1, "none", "結婚していない。" + KO + ME, { S: [2000000, 4800000, 100000], C: [700000, 1500000, 10000] }, { m: "mikon", kid: 1 }, "子の所得の上限は？"],
    ["k_rikonC", 1, "rikon", "夫と離婚した。" + KO + "同居の父が扶養親族。" + ME, { S: [2000000, 4800000, 100000], C: [700000, 1500000, 10000] }, { m: "rikon", sp: "otto", kid: 1, fy: 1 }, "ひとり親に当たらないなら寡婦は？"],
    ["k_shibC", 1, "shibetsu", "夫と死別した。" + KO + ME, { S: [2000000, 4800000, 100000], C: [700000, 1500000, 10000] }, { m: "shibetsu", sp: "otto", kid: 1 }, "子の所得が多いと、ひとり親は？"],
    ["n_jijitsu", 1, "none", "結婚していないが、事実上の夫婦として暮らす人がいる。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "mikon", kid: 1, jj: 1 }, "事実上の夫婦の人がいると？"],
    ["n_moto", 1, "none", "夫と離婚した。子は元夫の扶養親族で、ほかに扶養親族はいない。" + ME, { S: [2000000, 4800000, 100000] }, { m: "rikon", sp: "otto", kid: 1, ko: 1 }, "子がほかの人の扶養親族だと？"],
    ["k_moto", 1, "rikon", "夫と離婚した。子は元夫の扶養親族。同居の母が扶養親族。" + ME, { S: [2000000, 4800000, 100000] }, { m: "rikon", sp: "otto", kid: 1, ko: 1, fy: 1 }, "ひとり親でなくても、扶養親族がいれば？"],
    ["s_kafu", 1, "shotoku", "夫と死別し、子も扶養親族もいない。" + ME, { S: [5100000, 8000000, 100000] }, { m: "shibetsu", sp: "otto" }, "寡婦にも所得の上限がある？"],
    ["n_jj_shib", 1, "none", "夫と死別した。いまは事実上の夫婦として暮らす人がいる。子はいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "shibetsu", sp: "otto", jj: 1 }, "事実上の夫婦の人がいると？"],
    ["o_tsuma", 1, "oya", "妻と死別した。" + KO + ME, { S: [2000000, 4800000, 100000], C: [0, 500000, 10000] }, { m: "shibetsu", sp: "tsuma", kid: 1 }, "ひとり親は男女を問わない？"],
    ["n_tsuma", 1, "none", "妻と死別し、子も扶養親族もいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "shibetsu", sp: "tsuma" }, "寡婦控除は「夫と」死別した人。"],
    ["w_c62_1", 2, "none", "結婚していない。" + KO + "ほかに扶養親族はいない。" + ME, { S: [2000000, 4800000, 100000], C: [620001, 620001, 1] }, { m: "mikon", kid: 1 }, "62万円を1円でも超えると？"],
    ["w_s500_1", 2, "shotoku", "夫と離婚した。" + KO + ME, { S: [5000001, 5000001, 1], C: [0, 500000, 10000] }, { m: "rikon", sp: "otto", kid: 1 }, "500万円を1円でも超えると？"],
    ["o_c58", 2, "oya", "結婚していない。" + KO + ME, { S: [2000000, 4800000, 100000], C: [590000, 620000, 10000] }, { m: "mikon", kid: 1 }, "令和8年分の子の所得の上限は？"],
    ["o_c58r", 2, "oya", "夫と離婚した。" + KO + ME, { S: [2000000, 4800000, 100000], C: [590000, 620000, 10000] }, { m: "rikon", sp: "otto", kid: 1 }, "寡婦より先に、ひとり親を見る。"],
    ["s_shib", 2, "shotoku", "夫と死別した。" + KO + ME, { S: [5100000, 7000000, 100000], C: [0, 500000, 10000] }, { m: "shibetsu", sp: "otto", kid: 1 }, "どちらにも所得の上限がある。"],
    ["n_fumeiT", 2, "none", "妻の生死が明らかでない。" + KO + ME, { S: [2000000, 4800000, 100000], C: [700000, 1500000, 10000] }, { m: "fumei", sp: "tsuma", kid: 1 }, "子の所得と、寡婦の「夫」。"],
    ["k_fumei", 2, "shibetsu", "夫の生死が明らかでない。子も扶養親族もいない。" + ME, { S: [1000000, 4900000, 100000] }, { m: "fumei", sp: "otto" }, "生死不明は死別と同じ扱い？"],
    ["o_shib500", 2, "oya", "夫と死別した。" + KO + "本人の合計所得金額はちょうど＄S。", { S: [5000000, 5000000, 1], C: [0, 600000, 10000] }, { m: "shibetsu", sp: "otto", kid: 1 }, "ひとり親と寡婦、先に見るのは？"],
    ["n_jj_rikon", 2, "none", "夫と離婚した。いまは事実上の夫婦として暮らす人がいる。同居の母が扶養親族。" + ME, { S: [1000000, 4900000, 100000] }, { m: "rikon", sp: "otto", jj: 1, fy: 1 }, "扶養親族がいても、事実上の夫婦の人がいると？"],
    ["o_two", 2, "oya", "結婚していない。生計を一にする子が2人いて、総所得金額等は＄Cと＄D。" + ME, { S: [2000000, 4800000, 100000], C: [700000, 1200000, 10000], D: [0, 400000, 10000] }, { m: "mikon", kid: 1, two: 1 }, "条件に合う子が1人いれば？"],
    ["n_mikonF", 2, "none", "結婚したことがなく、子はいない。同居の母が扶養親族。" + ME, { S: [1000000, 4900000, 100000] }, { m: "mikon", fy: 1 }, "寡婦は離婚・死別した人。"],
    ["s_rikon", 2, "shotoku", "夫と離婚し、子はいない。同居の父が扶養親族。" + ME, { S: [5100000, 9000000, 100000] }, { m: "rikon", sp: "otto", fy: 1 }, "寡婦にも所得の上限がある。"],
    ["n_twoC", 2, "none", "結婚していない。生計を一にする子が2人いて、総所得金額等は＄Cと＄D。" + ME, { S: [2000000, 4800000, 100000], C: [700000, 1200000, 10000], D: [630000, 1000000, 10000] }, { m: "mikon", kid: 1, two: 1 }, "2人とも所得が多いと？"],
  ];

  const yen = (n) => n.toLocaleString("ja-JP") + "円";
  const man = (n) => (n !== 0 && n % MAN === 0 ? `${(n / MAN).toLocaleString("ja-JP")}万円` : yen(n));
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pickAmt = (R, lo, hi, step) => lo + ri(R, 0, Math.floor((hi - lo) / step)) * step;
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }

  const label = (t) => (t === 0 ? "0円（受けられない）" : yen(t));
  function maker(sent, spec, at) {
    return (R) => {
      const v = {};
      for (const f of ["S", "C", "D"]) v[f] = spec[f] ? pickAmt(R, spec[f][0], spec[f][1], spec[f][2]) : 0;
      const { S, C } = v, D2 = v.D;
      const ans = deductOf(at, S, C, D2);
      const sentence = sent.replace("＄S", man(S)).replace("＄C", man(C)).replace("＄D", man(D2));
      // 選び肢：ひとり親と寡婦の取り違え・両方を足す・38万円（令和9年分から）・0円 から3つ
      const cand = [OYA, KAFU, OYA + KAFU, 380000, 0];
      const ok = (x) => x !== ans;
      const wrong = pickN(R, cand.filter(ok), 3).sort((x, y) => x - y);
      const opts = shuffle(R, [ans, ...wrong]).map(label);
      const how = ans === OYA ? "ひとり親控除" : ans === KAFU ? "寡婦控除" : "どちらにも当たらない";
      const full = `${sentence} → ${how}：${label(ans)}`;
      return { type: "act", q: `${sentence}　控除はいくら？`, opts, ans: label(ans), rev: false, full, S, C, D: D2, at, deduct: ans, v: `${S}/${C}/${D2}` };
    };
  }
  // 金額の組が6通りより少ない種類は lo=hi にする（QA の「6通り以上」から外す）
  const cnt = (spec) => Object.values(spec).reduce((n, sp) => n * (Math.floor((sp[1] - sp[0]) / sp[2]) + 1), 1);
  const KINDS = D.map(([id, lv, grp, sent, spec, at, look]) => ({ id, lv, grp, col: "a", sent, lo: 0, hi: cnt(spec) < 6 ? 0 : 1, look, src: grp === "oya" ? ["a"] : grp === "rikon" || grp === "shibetsu" ? ["b"] : ["a", "b"], name: GROUPS[grp].name + "：" + sent.replace(/＄./g, "○円").slice(0, 22) + "…", key: KEY[grp], why: GRP_WHY[grp], make: maker(sent, spec, at) }));
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  const GRP_OF = Object.fromEntries(KINDS.map((k) => [k.id, k.grp]));
  const groupsOf = (g) => Object.keys(GROUPS).filter((x) => GROUPS[x].set === GROUPS[g].set);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp, gwhy: GRP_WHY[k.grp], media: MEDIA[k.col], src: k.src.map((s) => SRC[s]), ...p };
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const HTO = { KINDS, BY, GROUPS, GRP_OF, GRP_WHY, LV, SRC, MEDIA, AS_OF, OYA, KAFU, deductOf, kindsOf, groupsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = HTO; else root.HTO = HTO;
})(typeof self !== "undefined" ? self : this);
