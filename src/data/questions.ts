// 策略刷题题库
// 覆盖：座位位置、盲注级别、手牌质量、底池大小、对手行动等高频新手场景。
// 每题含标准答案、错误原因、底层策略逻辑与赔率依据。

export type QuizChoice = 'fold' | 'call' | 'raise';

export interface QuizQuestion {
  id: string;
  category: string; // 场景分类，用于错题统计
  position: string; // 座位
  scenario: string; // 场景描述
  hole: string; // 手牌，如 "As Kd"
  board?: string; // 公共牌（翻后题）
  potInfo: string; // 底池/下注信息
  correct: QuizChoice;
  explanation: string; // 正确决策解析
  reasoning: string; // 底层逻辑 / 赔率依据
}

export const CHOICE_LABELS: Record<QuizChoice, string> = {
  fold: '弃牌',
  call: '跟注',
  raise: '加注',
};

export const QUESTION_BANK: QuizQuestion[] = [
  // —— 翻前 · 起手牌选择 ——
  {
    id: 'pf-01',
    category: '翻前起手牌',
    position: 'UTG（枪口位）',
    scenario: '9 人桌，你在最早行动的枪口位，前面无人行动。',
    hole: 'As Ah',
    potInfo: '盲注 10/20，你的筹码 2000',
    correct: 'raise',
    explanation: 'AA 是最强起手牌，任何位置都应加注开池。',
    reasoning:
      '顶级口袋对子在翻前领先所有随机手牌（对单一对手胜率约 85%）。加注既能建立底池、争取价值，又能减少多人入池稀释权益。',
  },
  {
    id: 'pf-02',
    category: '翻前起手牌',
    position: 'UTG（枪口位）',
    scenario: '9 人桌枪口位，前面无人行动。',
    hole: '7d 2c',
    potInfo: '盲注 10/20',
    correct: 'fold',
    explanation: '72o 是最差起手牌，枪口位应直接弃牌。',
    reasoning:
      '7-2 不同花，既无对子潜力也难成顺子/同花，且枪口位后面还有 8 个玩家会行动，位置极其不利。这类牌长期为负期望，果断弃牌。',
  },
  {
    id: 'pf-03',
    category: '翻前位置策略',
    position: 'BTN（按钮位）',
    scenario: '6 人桌，你在按钮位（最有利位置），前面全部弃牌。',
    hole: 'Kd Ts',
    potInfo: '盲注 10/20',
    correct: 'raise',
    explanation: '按钮位可放宽起手牌范围，KTo 适合加注偷盲。',
    reasoning:
      '按钮位翻后始终最后行动，信息优势最大。前面全弃后只需击败两个盲注，KTo 有足够牌力与位置优势，加注施压是标准打法。',
  },
  {
    id: 'pf-04',
    category: '翻前位置策略',
    position: 'UTG（枪口位）',
    scenario: '9 人桌枪口位，前面无人行动。',
    hole: 'Kd Ts',
    potInfo: '盲注 10/20',
    correct: 'fold',
    explanation: '同样是 KTo，枪口位则应弃牌。',
    reasoning:
      '位置决定起手牌范围。KTo 在按钮位可玩，但在枪口位面对 8 个后位玩家，容易被更强的 K 或 A 主导（kicker 问题），此处应放弃。',
  },
  {
    id: 'pf-05',
    category: '翻前面对加注',
    position: 'BB（大盲位）',
    scenario: '中位玩家加注到 3 倍大盲，其余弃牌，轮到你大盲。',
    hole: 'Qh Qs',
    potInfo: '底池 90，需再跟 40 或加注',
    correct: 'raise',
    explanation: 'QQ 面对单个开池加注，应 3-bet 再加注。',
    reasoning:
      'QQ 是顶级牌，仅次于 AA/KK。面对加注选择 3-bet 能建立更大底池、争取价值，并把对手较弱的牌挤出。只跟注会让底池过小、浪费牌力。',
  },
  {
    id: 'pf-06',
    category: '翻前面对加注',
    position: 'CO（关煞位）',
    scenario: '枪口位玩家加注到 3 倍，你在关煞位。',
    hole: '5c 5d',
    potInfo: '底池 90，需跟注 60',
    correct: 'call',
    explanation: '小对子面对加注可跟注博击中三条（set mining）。',
    reasoning:
      '小对子翻牌击中三条的概率约 1/8（11.8%）。当双方筹码足够深、隐含赔率好时，跟注去搏一个隐蔽的强牌是合理的。3-bet 则容易被更强牌反击。',
  },
  {
    id: 'pf-07',
    category: '翻前起手牌',
    position: 'MP（中位）',
    scenario: '9 人桌中位，前面无人行动。',
    hole: 'Ah Ks',
    potInfo: '盲注 10/20',
    correct: 'raise',
    explanation: 'AKs 是顶级不成对强牌，应加注。',
    reasoning:
      'AK 同花既有两张高牌、又有同花听牌潜力，翻前对多数对子接近五五开、对小牌大幅领先。主动加注掌握主动权，是标准的价值+施压打法。',
  },

  // —— 翻后 · 底池赔率 ——
  {
    id: 'po-01',
    category: '底池赔率决策',
    position: 'BB（大盲位）',
    scenario: '翻牌后你有同花听牌（4 张同花，还差 1 张）。对手下注。',
    hole: 'Ah 7h',
    board: 'Kh 9h 2c',
    potInfo: '底池 100，对手下注 30，需跟注 30',
    correct: 'call',
    explanation: '同花听牌配合有利底池赔率，应跟注追牌。',
    reasoning:
      '底池赔率：跟注 30 赢 130，所需胜率 = 30 ÷ 160 ≈ 19%。同花听牌下一张击中概率约 19%（9 张补牌），到河牌约 35%。赔率合适，跟注为正期望。',
  },
  {
    id: 'po-02',
    category: '底池赔率决策',
    position: 'CO（关煞位）',
    scenario: '你有卡顺听牌（只差中间一张），对手在河牌前大注施压。',
    hole: 'Js Tc',
    board: '8d 7c 2h',
    potInfo: '底池 100，对手下注 90，需跟注 90',
    correct: 'fold',
    explanation: '卡顺听牌补牌少，面对大注赔率不足，应弃牌。',
    reasoning:
      '卡顺只有 4 张补牌，单次击中约 8.5%。所需胜率 = 90 ÷ 280 ≈ 32%，远高于命中率。赔率严重不足，跟注长期亏损，应弃牌。',
  },
  {
    id: 'po-03',
    category: '底池赔率决策',
    position: 'BTN（按钮位）',
    scenario: '你有顶对顶踢脚，对手在湿润牌面小额下注。',
    hole: 'As Kd',
    board: 'Ah 8s 5c',
    potInfo: '底池 120，对手下注 40，需跟注 40',
    correct: 'raise',
    explanation: '顶对顶踢脚是强牌，面对小注应加注争取价值、保护牌力。',
    reasoning:
      '顶对配 K kicker 在此牌面大幅领先。小额下注可能是听牌或中等牌，加注既能向听牌收取价值，也能避免给对手便宜的追牌机会。被动跟注会放走价值。',
  },

  // —— 翻后 · 牌力评估 ——
  {
    id: 'ps-01',
    category: '翻后牌力评估',
    position: 'MP（中位）',
    scenario: '你翻牌击中顶对，但牌面出现三张同花且不含你的花色，对手大注。',
    hole: 'Kd Qc',
    board: 'Kh 9h 4h',
    potInfo: '底池 120，对手全下 200',
    correct: 'fold',
    explanation: '牌面已成同花可能，顶对面对全下应弃牌。',
    reasoning:
      '三张红桃使对手很可能已成同花或强听牌。你只有顶对、无红桃补牌，面对全下需要很高胜率。此时顶对沦为易受攻击的中等牌，弃牌止损。',
  },
  {
    id: 'ps-02',
    category: '翻后牌力评估',
    position: 'BTN（按钮位）',
    scenario: '你在干燥牌面击中暗三条（口袋对子成三条）。对手过牌给你。',
    hole: '8s 8d',
    board: '8h 3c 2d',
    potInfo: '底池 60，轮到你行动',
    correct: 'raise',
    explanation: '暗三条是强牌，干燥牌面应下注争取价值。',
    reasoning:
      '暗三条（set）极其隐蔽且强大。牌面干燥、少听牌威胁，此时应主动下注，向对手的顶对、听牌收取价值。过牌会浪费强牌的盈利机会。',
  },
  {
    id: 'ps-03',
    category: '翻后牌力评估',
    position: 'BB（大盲位）',
    scenario: '河牌发出，你只有底对，对手在河牌大额下注。',
    hole: '6c 5d',
    board: 'Ah Kd 6s Qc 2h',
    potInfo: '底池 150，对手下注 120',
    correct: 'fold',
    explanation: '底对面对河牌大注几乎必输，应弃牌。',
    reasoning:
      '牌面有 A、K、Q 三张高牌，对手的下注区间几乎都击败你的一对 6。所需胜率 = 120 ÷ 270 ≈ 44%，而底对能赢的组合极少。这是典型的应弃牌场景。',
  },
  {
    id: 'ps-04',
    category: '翻后持续下注',
    position: 'BTN（按钮位）',
    scenario: '你翻前加注被大盲跟注，翻牌你未击中但持有两张高牌，对手过牌。',
    hole: 'As Ks',
    board: '9d 6c 2h',
    potInfo: '底池 90，轮到你行动',
    correct: 'raise',
    explanation: '作为翻前加注者，在干燥牌面可进行持续下注（c-bet）。',
    reasoning:
      '干燥低牌面很少击中跟注者，你作为翻前加注者持续下注可代表强牌，常能直接拿下底池。即使被跟，AK 还有 6 张补牌成顶对。半诈唬性质的 c-bet 期望为正。',
  },
  {
    id: 'ps-05',
    category: '翻后牌力评估',
    position: 'CO（关煞位）',
    scenario:
      '河牌发出后公共牌为 Q-J-T-K-2，你手持 A-Q。对手大额下注。先看清自己的最终牌型再决策。',
    hole: 'Ad Qh',
    board: 'Qs Jc Th Kd 2s',
    potInfo: '底池 200，对手下注 180',
    correct: 'raise',
    explanation:
      '你手中的 A 与公共牌 K-Q-J-T 组成 A-K-Q-J-T 的坚果顺子，应加注争取最大价值。',
    reasoning:
      '本题考查“务必结合公共牌完整判牌”。很多新手只盯着一对 Q，却忽略了 A 补齐了 Broadway 顺子（AKQJT）——这是无人能超越的坚果。面对下注，加注（或至少跟注）榨取价值才正确，弃牌会丢掉必赢的底池。',
  },
];

export function getQuestionById(id: string): QuizQuestion | undefined {
  return QUESTION_BANK.find((q) => q.id === id);
}
