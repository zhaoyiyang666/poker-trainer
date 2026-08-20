import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard, CardSlot } from '@/components/PlayingCard';
import { CardPicker } from '@/components/CardPicker';
import { ComplianceBanner } from '@/components/ComplianceBanner';
import type { Card } from '@/engine/cards';
import { calcEquityAsync } from '@/engine/equityClient';
import type { EquityResult } from '@/engine/equity';
import { pct } from '@/engine/potOdds';
import './CalculatorPage.css';

type SlotKind = { area: 'hole' | 'board'; index: number };

export function CalculatorPage() {
  const navigate = useNavigate();
  const [hole, setHole] = useState<(Card | null)[]>([null, null]);
  const [board, setBoard] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [opponents, setOpponents] = useState(1);
  const [picking, setPicking] = useState<SlotKind | null>(null);
  const [result, setResult] = useState<EquityResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const usedCards = [...hole, ...board].filter(Boolean) as Card[];
  const holeCards = hole.filter(Boolean) as Card[];
  const boardCards = board.filter(Boolean) as Card[];
  const ready = holeCards.length === 2;

  // 手牌齐全后自动计算（防抖）
  useEffect(() => {
    if (!ready) {
      setResult(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setCalculating(true);
    debounceRef.current = window.setTimeout(() => {
      calcEquityAsync(holeCards, boardCards, opponents, 4000)
        .then((r) => {
          setResult(r);
          setCalculating(false);
        })
        .catch(() => setCalculating(false));
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hole.map((c) => (c ? `${c.rank}${c.suit}` : '_')).join(''),
    board.map((c) => (c ? `${c.rank}${c.suit}` : '_')).join(''),
    opponents,
  ]);

  function handlePick(card: Card) {
    if (!picking) return;
    if (picking.area === 'hole') {
      const next = [...hole];
      next[picking.index] = card;
      setHole(next);
    } else {
      const next = [...board];
      next[picking.index] = card;
      setBoard(next);
    }
    setPicking(null);
  }

  function clearSlot(kind: SlotKind) {
    if (kind.area === 'hole') {
      const next = [...hole];
      next[kind.index] = null;
      setHole(next);
    } else {
      const next = [...board];
      next[kind.index] = null;
      setBoard(next);
    }
  }

  function reset() {
    setHole([null, null]);
    setBoard([null, null, null, null, null]);
    setResult(null);
  }

  // 当前正在编辑的槽位不算已用牌
  const disabledForPicker = usedCards.filter((c) => {
    if (!picking) return true;
    const editing =
      picking.area === 'hole' ? hole[picking.index] : board[picking.index];
    return !(editing && editing.rank === c.rank && editing.suit === c.suit);
  });

  return (
    <div className="page fade-in">
      <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
          ‹ 返回
        </button>
      </div>
      <div className="page-title">胜率计算器</div>
      <div className="page-sub">蒙特卡洛模拟 · 理解牌力与底池赔率</div>

      {/* 手牌 */}
      <div className="section-label">我的手牌（2 张）</div>
      <div className="calc-cards">
        {hole.map((c, i) =>
          c ? (
            <PlayingCard
              key={i}
              card={c}
              size="lg"
              onClick={() => clearSlot({ area: 'hole', index: i })}
            />
          ) : (
            <CardSlot key={i} size="lg" onClick={() => setPicking({ area: 'hole', index: i })} />
          )
        )}
      </div>

      {/* 公共牌 */}
      <div className="section-label">公共牌（0-5 张，点击添加）</div>
      <div className="calc-cards">
        {board.map((c, i) =>
          c ? (
            <PlayingCard
              key={i}
              card={c}
              size="md"
              onClick={() => clearSlot({ area: 'board', index: i })}
            />
          ) : (
            <CardSlot key={i} size="md" onClick={() => setPicking({ area: 'board', index: i })} />
          )
        )}
      </div>

      {/* 对手数量 */}
      <div className="section-label">对手数量</div>
      <div className="opp-selector">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <button
            key={n}
            className={`opp-cell ${opponents === n ? 'active' : ''}`}
            onClick={() => setOpponents(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {/* 结果 */}
      <div className="section-label">胜率结果</div>
      {!ready ? (
        <div className="card text-center text-dim">请先选择 2 张手牌</div>
      ) : (
        <div className="card result-card">
          {calculating && !result ? (
            <div className="text-center text-dim">计算中…</div>
          ) : result ? (
            <>
              <div className="equity-bar">
                <div
                  className="equity-seg win"
                  style={{ width: `${result.win * 100}%` }}
                />
                <div
                  className="equity-seg tie"
                  style={{ width: `${result.tie * 100}%` }}
                />
                <div
                  className="equity-seg lose"
                  style={{ width: `${result.lose * 100}%` }}
                />
              </div>
              <div className="equity-legend">
                <ResultStat label="获胜" value={pct(result.win)} cls="win" />
                <ResultStat label="平分" value={pct(result.tie)} cls="tie" />
                <ResultStat label="落败" value={pct(result.lose)} cls="lose" />
              </div>
              <div className="divider" />
              <div className="interpret">{interpret(result)}</div>
              {calculating && (
                <div className="text-mute text-center" style={{ fontSize: 11, marginTop: 6 }}>
                  更新中…
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      <button className="btn btn-ghost btn-block" onClick={reset} style={{ marginTop: 4 }}>
        清空重选
      </button>

      <div style={{ marginTop: 16 }}>
        <ComplianceBanner />
      </div>

      {picking && (
        <CardPicker
          disabled={disabledForPicker}
          onPick={handlePick}
          onClose={() => setPicking(null)}
          title={picking.area === 'hole' ? '选择手牌' : '选择公共牌'}
        />
      )}
    </div>
  );
}

function ResultStat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="result-stat">
      <span className={`result-dot ${cls}`} />
      <div>
        <div className={`result-value ${cls}`}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function interpret(r: EquityResult): string {
  const w = r.win;
  const stage =
    r.iterations > 0 ? `（基于 ${r.iterations} 次模拟，对手 ${r.opponents} 名）` : '';
  let judge: string;
  if (w >= 0.75) judge = '牌力极强，处于明显领先，通常应主动下注争取价值。';
  else if (w >= 0.55) judge = '牌力占优，可考虑价值下注，但需留意牌面变化。';
  else if (w >= 0.4) judge = '胜负接近，应结合位置与底池赔率谨慎决策。';
  else if (w >= 0.25) judge = '牌力偏弱，多数情况下宜控制底池或择机放弃。';
  else judge = '牌力明显落后，除非有足够听牌与赔率，一般应弃牌。';
  return `综合胜率约 ${pct(r.equity)}${stage}。${judge}`;
}
