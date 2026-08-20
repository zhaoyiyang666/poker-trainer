import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '@/components/PlayingCard';
import { parseCards } from '@/engine/cards';
import './ManualPage.css';

const HAND_RANKINGS = [
  { name: '皇家同花顺', en: 'Royal Flush', cards: 'As Ks Qs Js Ts', desc: '同花色的 A-K-Q-J-10，最大牌型，几乎不可战胜。' },
  { name: '同花顺', en: 'Straight Flush', cards: '9h 8h 7h 6h 5h', desc: '同一花色的五张连续牌。' },
  { name: '四条', en: 'Four of a Kind', cards: 'Qs Qh Qd Qc 3s', desc: '四张相同点数的牌，又称金刚。' },
  { name: '葫芦', en: 'Full House', cards: 'Ks Kh Kd 9s 9h', desc: '三条 + 一对，比大小先看三条。' },
  { name: '同花', en: 'Flush', cards: 'As Js 9s 6s 3s', desc: '五张同花色但不连续，比大小看最高牌。' },
  { name: '顺子', en: 'Straight', cards: 'Ts 9h 8d 7c 6s', desc: '五张连续但不同花色。A 可作最大或最小（A-5）。' },
  { name: '三条', en: 'Three of a Kind', cards: '8s 8h 8d Ks 2c', desc: '三张相同点数的牌。' },
  { name: '两对', en: 'Two Pair', cards: 'As Ah 7d 7c Ks', desc: '两个不同的对子，先比大对。' },
  { name: '一对', en: 'One Pair', cards: 'Js Jh 9d 5c 2s', desc: '两张相同点数的牌。' },
  { name: '高牌', en: 'High Card', cards: 'As Jh 9d 6c 3s', desc: '未组成任何牌型，比最大单张。' },
];

const RULES = [
  {
    title: '对局基本流程',
    body: '德州扑克每手牌分四条街：翻前(Preflop)、翻牌(Flop, 3 张公共牌)、转牌(Turn, 第 4 张)、河牌(River, 第 5 张)。每人 2 张底牌，与 5 张公共牌组成最大的 5 张牌比大小。',
  },
  {
    title: '大小盲注',
    body: '按钮(Dealer)左边第一位下小盲，第二位下大盲，构成初始底池。每手牌后按钮顺时针移动一位，保证盲注轮流承担。',
  },
  {
    title: '行动顺序',
    body: '翻前从大盲左边(UTG)开始行动；翻后从按钮左边第一位未弃牌者开始。可选择：弃牌(Fold)、过牌(Check，无人下注时)、跟注(Call)、加注(Raise)。',
  },
  {
    title: '摊牌与结算',
    body: '最后一条街下注结束后，仍在牌局中的玩家亮牌比大小，最大者赢得底池。若牌型完全相同则平分底池。',
  },
];

const STRATEGY = [
  {
    title: '位置优先级',
    body: '位置越靠后越有利，因为你能看到更多对手的行动后再决策。按钮位(BTN)最强，枪口位(UTG)最弱。靠后位置可玩更宽的起手牌范围。',
  },
  {
    title: '起手牌范围',
    body: '强牌（AA、KK、QQ、AK）任何位置都能玩；中等牌（中对子、AQ、AJ）适合中后位；弱牌和垃圾牌（如 72o、J3o）多数情况直接弃牌。位置越早，范围越紧。',
  },
  {
    title: '底池赔率基础',
    body: '底池赔率 = 当前底池 ÷ 需要跟注的额度。所需最低胜率 = 跟注额 ÷ (底池 + 跟注额)。当你的胜率高于这个阈值时，跟注长期是盈利（正期望）的。',
  },
  {
    title: '新手禁忌',
    body: '① 不要用弱牌盲目跟注到底；② 不要只因为已投入筹码就不肯弃牌（沉没成本谬误）；③ 不要忽略位置；④ 强牌要下注争取价值，不要一味过牌。',
  },
];

type Tab = 'rankings' | 'rules' | 'strategy';

export function ManualPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('rankings');

  return (
    <div className="page fade-in">
      <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
          ‹ 返回
        </button>
      </div>
      <div className="page-title">学习手册</div>
      <div className="page-sub">零基础入门 · 牌型规则 · 基础策略</div>

      <div className="stat-tabs">
        <button className={`stat-tab ${tab === 'rankings' ? 'active' : ''}`} onClick={() => setTab('rankings')}>
          牌型大全
        </button>
        <button className={`stat-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          对局规则
        </button>
        <button className={`stat-tab ${tab === 'strategy' ? 'active' : ''}`} onClick={() => setTab('strategy')}>
          基础策略
        </button>
      </div>

      {tab === 'rankings' && (
        <div className="fade-in">
          {HAND_RANKINGS.map((h, i) => (
            <div className="card rank-card" key={h.en}>
              <div className="rank-head">
                <span className="rank-index">{i + 1}</span>
                <div>
                  <div className="rank-name">{h.name}</div>
                  <div className="rank-en">{h.en}</div>
                </div>
              </div>
              <div className="rank-cards">
                {parseCards(h.cards).map((c, j) => (
                  <PlayingCard key={j} card={c} size="sm" />
                ))}
              </div>
              <div className="rank-desc">{h.desc}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <div className="fade-in">
          {RULES.map((r) => (
            <div className="card" key={r.title}>
              <div className="manual-title">{r.title}</div>
              <div className="manual-body">{r.body}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'strategy' && (
        <div className="fade-in">
          {STRATEGY.map((r) => (
            <div className="card" key={r.title}>
              <div className="manual-title">{r.title}</div>
              <div className="manual-body">{r.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
