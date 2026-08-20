import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '@/components/PlayingCard';
import { useGame, type GameConfig } from './useGame';
import {
  DIFFICULTY_LABELS,
  type AiDifficulty,
} from '@/engine/ai';
import { CATEGORY_LABELS } from '@/engine/handEvaluator';
import { getSettings } from '@/storage/store';
import type { GameState, Player } from '@/engine/game';
import './GamePage.css';

const DIFFICULTIES: AiDifficulty[] = ['novice', 'balanced', 'aggressive', 'tight'];

const DIFFICULTY_DESC: Record<AiDifficulty, string> = {
  novice: '偏松被动，容易跟注，很少加注',
  balanced: '标准打法，价值与保护兼顾',
  aggressive: '宽入池、频繁加注施压',
  tight: '只玩强牌，纪律严明',
};

export function GamePage() {
  const navigate = useNavigate();
  const settings = getSettings();
  const [config, setConfig] = useState<GameConfig | null>(null);

  if (!config) {
    return (
      <SetupScreen
        defaults={settings}
        onStart={setConfig}
        onBack={() => navigate('/')}
      />
    );
  }
  return <Table config={config} onExit={() => setConfig(null)} />;
}

function SetupScreen({
  defaults,
  onStart,
  onBack,
}: {
  defaults: ReturnType<typeof getSettings>;
  onStart: (c: GameConfig) => void;
  onBack: () => void;
}) {
  const [seats, setSeats] = useState<6 | 9>(defaults.defaultSeats);
  const [difficulty, setDifficulty] = useState<AiDifficulty>(
    (defaults.defaultDifficulty as AiDifficulty) ?? 'balanced'
  );
  const [bb, setBb] = useState(defaults.bigBlind);
  const [stack, setStack] = useState(defaults.startingStack);

  return (
    <div className="page fade-in">
      <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          ‹ 返回
        </button>
      </div>
      <div className="page-title">AI 模拟对局</div>
      <div className="page-sub">单机练习 · 虚拟筹码 · 完整赛事流程</div>

      <div className="section-label">牌桌人数</div>
      <div className="grid-2">
        {([6, 9] as const).map((n) => (
          <button
            key={n}
            className={`opt-btn ${seats === n ? 'active' : ''}`}
            onClick={() => setSeats(n)}
          >
            {n} 人桌
          </button>
        ))}
      </div>

      <div className="section-label">AI 难度</div>
      {DIFFICULTIES.map((d) => (
        <button
          key={d}
          className={`opt-row ${difficulty === d ? 'active' : ''}`}
          onClick={() => setDifficulty(d)}
        >
          <span>
            <span className="opt-row-title">{DIFFICULTY_LABELS[d]}</span>
            <span className="opt-row-desc">{DIFFICULTY_DESC[d]}</span>
          </span>
          <span className="opt-check">{difficulty === d ? '✓' : ''}</span>
        </button>
      ))}

      <div className="section-label">盲注档位（大盲）</div>
      <div className="grid-3">
        {[20, 50, 100].map((v) => (
          <button
            key={v}
            className={`opt-btn ${bb === v ? 'active' : ''}`}
            onClick={() => setBb(v)}
          >
            {v / 2}/{v}
          </button>
        ))}
      </div>

      <div className="section-label">初始虚拟筹码</div>
      <div className="grid-3">
        {[1000, 2000, 5000].map((v) => (
          <button
            key={v}
            className={`opt-btn ${stack === v ? 'active' : ''}`}
            onClick={() => setStack(v)}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="compliance-banner" style={{ margin: '18px 0' }}>
        <span className="dot">●</span>
        <span>
          筹码为无现金价值的练习道具，耗尽后自动重置，无任何购买或充值渠道。
        </span>
      </div>

      <button
        className="btn btn-accent btn-block"
        style={{ padding: '15px' }}
        onClick={() =>
          onStart({
            seats,
            difficulty,
            smallBlind: Math.round(bb / 2),
            bigBlind: bb,
            startingStack: stack,
          })
        }
      >
        开始练习对局
      </button>
    </div>
  );
}

function Table({
  config,
  onExit,
}: {
  config: GameConfig;
  onExit: () => void;
}) {
  const game = useGame(config);
  const { state } = game;
  const hero = state.players.find((p) => p.isHero)!;
  const [raiseTo, setRaiseTo] = useState(0);
  const [showLog, setShowLog] = useState(false);

  const heroIdx = state.players.findIndex((p) => p.isHero);
  const others = state.players.filter((p) => !p.isHero);

  const nextHand = () => {
    const carry = state.players.map((p) => p.stack);
    game.startNext(carry);
    setRaiseTo(0);
  };

  return (
    <div className="game-wrap fade-in">
      {/* 顶栏 */}
      <div className="game-top">
        <button className="btn btn-sm btn-ghost" onClick={onExit}>
          ‹ 退出
        </button>
        <div className="game-top-info">
          <span className="badge badge-accent">
            {DIFFICULTY_LABELS[config.difficulty]}
          </span>
          <span className="badge">{config.seats}人桌</span>
          <span className="badge">第 {state.handNumber} 手</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setShowLog(true)}>
          记录
        </button>
      </div>

      {/* 牌桌 */}
      <div className="felt">
        <div className="felt-inner">
          {/* 对手座位 */}
          <div className="opponents">
            {others.map((p) => (
              <SeatView
                key={p.id}
                player={p}
                isActive={state.toActIndex === p.id && state.phase === 'betting'}
                showCards={state.phase === 'handComplete' && !p.folded}
                isButton={state.buttonIndex === p.id}
              />
            ))}
          </div>

          {/* 底池 + 公共牌 */}
          <div className="board-area">
            <div className="pot-chip">底池 {state.pot}</div>
            <div className="community">
              {[0, 1, 2, 3, 4].map((i) => (
                <PlayingCard
                  key={i}
                  card={state.board[i]}
                  faceDown={!state.board[i]}
                  size="md"
                />
              ))}
            </div>
            <div className="street-tag">{streetLabel(state.street)}</div>
          </div>

          {/* 英雄座位 */}
          <div className="hero-area">
            <HeroSeat
              player={hero}
              isActive={game.heroTurn}
              isButton={state.buttonIndex === heroIdx}
            />
          </div>
        </div>
      </div>

      {/* 操作区 / 结算区 */}
      <div className="action-zone">
        {state.phase === 'handComplete' ? (
          <div className="waiting">本手结束 · 查看结算</div>
        ) : game.heroTurn ? (
          <ActionBar
            game={game}
            raiseTo={raiseTo}
            setRaiseTo={setRaiseTo}
          />
        ) : (
          <div className="waiting">
            <span className="waiting-dot" /> 等待 AI 行动…
          </div>
        )}
      </div>

      {state.phase === 'handComplete' && (
        <ReviewPanel game={game} hero={hero} onNext={nextHand} />
      )}

      {showLog && (
        <LogModal state={state} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}

function SeatView({
  player,
  isActive,
  showCards,
  isButton,
}: {
  player: Player;
  isActive: boolean;
  showCards: boolean;
  isButton: boolean;
}) {
  return (
    <div className={`seat ${player.folded ? 'folded' : ''} ${isActive ? 'active' : ''}`}>
      <div className="seat-cards">
        <PlayingCard card={showCards ? player.hole[0] : undefined} faceDown={!showCards} size="sm" />
        <PlayingCard card={showCards ? player.hole[1] : undefined} faceDown={!showCards} size="sm" />
      </div>
      <div className="seat-info">
        <div className="seat-name">
          {player.name}
          {isButton && <span className="dealer-btn">D</span>}
        </div>
        <div className="seat-stack">{player.stack}</div>
      </div>
      {player.lastAction && !player.folded && (
        <div className="seat-action">{actionLabel(player.lastAction, player.lastAmount)}</div>
      )}
      {player.folded && <div className="seat-action folded-tag">已弃牌</div>}
      {player.allIn && <div className="seat-action allin-tag">All in</div>}
    </div>
  );
}

function HeroSeat({
  player,
  isActive,
  isButton,
}: {
  player: Player;
  isActive: boolean;
  isButton: boolean;
}) {
  return (
    <div className={`hero-seat ${isActive ? 'active' : ''} ${player.folded ? 'folded' : ''}`}>
      <div className="hero-cards">
        <PlayingCard card={player.hole[0]} size="lg" />
        <PlayingCard card={player.hole[1]} size="lg" />
      </div>
      <div className="hero-meta">
        <div className="seat-name">
          {player.name}
          {isButton && <span className="dealer-btn">D</span>}
        </div>
        <div className="hero-stack">{player.stack}</div>
        {player.lastAction && (
          <div className="badge">{actionLabel(player.lastAction, player.lastAmount)}</div>
        )}
      </div>
    </div>
  );
}

function ActionBar({
  game,
  raiseTo,
  setRaiseTo,
}: {
  game: ReturnType<typeof useGame>;
  raiseTo: number;
  setRaiseTo: (n: number) => void;
}) {
  const { actions, heroAction } = game;
  const min = actions.minRaiseTo;
  const max = actions.maxRaiseTo;
  const current = raiseTo >= min ? raiseTo : min;
  const [showRaise, setShowRaise] = useState(false);

  if (showRaise && actions.canRaise) {
    return (
      <div className="raise-panel">
        <div className="raise-head">
          <span>加注至</span>
          <span className="raise-amount">{current}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={Math.max(1, Math.round(game.state.bigBlind / 2))}
          value={current}
          onChange={(e) => setRaiseTo(Number(e.target.value))}
        />
        <div className="raise-quick">
          {[
            { label: '½ 底池', v: Math.round(game.state.pot * 0.5) + actions.callAmount },
            { label: '⅔ 底池', v: Math.round(game.state.pot * 0.66) + actions.callAmount },
            { label: '1 底池', v: game.state.pot + actions.callAmount },
            { label: 'All in', v: max },
          ].map((q) => (
            <button
              key={q.label}
              className="btn btn-sm btn-ghost"
              onClick={() => setRaiseTo(Math.min(max, Math.max(min, q.v)))}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setShowRaise(false)}>
            取消
          </button>
          <button
            className="btn btn-accent btn-block"
            onClick={() => {
              heroAction({ type: 'raise', amount: current });
              setShowRaise(false);
              setRaiseTo(0);
            }}
          >
            确认加注至 {current}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar">
      <button
        className="btn btn-danger action-btn"
        onClick={() => heroAction({ type: 'fold' })}
        disabled={!actions.canFold}
      >
        弃牌
      </button>
      {actions.canCheck ? (
        <button
          className="btn action-btn"
          onClick={() => heroAction({ type: 'check' })}
        >
          过牌
        </button>
      ) : (
        <button
          className="btn action-btn"
          onClick={() => heroAction({ type: 'call' })}
          disabled={!actions.canCall}
        >
          跟注 {actions.callAmount}
        </button>
      )}
      <button
        className="btn btn-accent action-btn"
        onClick={() => {
          setRaiseTo(actions.minRaiseTo);
          setShowRaise(true);
        }}
        disabled={!actions.canRaise}
      >
        加注
      </button>
    </div>
  );
}

function ReviewPanel({
  game,
  hero,
  onNext,
}: {
  game: ReturnType<typeof useGame>;
  hero: Player;
  onNext: () => void;
}) {
  const { state, review } = game;
  if (!review) return null;

  const resultLabel = {
    win: '本手获胜',
    lose: '本手落败',
    tie: '平分底池',
    fold: '本手弃牌',
  }[review.heroResult];

  const resultClass = {
    win: 'text-accent',
    lose: 'text-danger',
    tie: 'text-warn',
    fold: 'text-dim',
  }[review.heroResult];

  const shown = state.showdown?.filter((e) => e.hand) ?? [];

  return (
    <div className="modal-backdrop review-backdrop">
      <div className="modal review-modal fade-in">
        <div className="review-head">
          <span className={`review-result ${resultClass}`}>{resultLabel}</span>
          <span className={review.heroNet >= 0 ? 'text-accent' : 'text-danger'}>
            {review.heroNet >= 0 ? '+' : ''}
            {review.heroNet} 筹码
          </span>
        </div>

        {/* 我的牌：每局都展示，无论输赢/弃牌 */}
        <div className="review-myhand">
          <div className="review-myhand-block">
            <div className="review-myhand-label">我的手牌</div>
            <div className="review-myhand-cards">
              <PlayingCard card={hero.hole[0]} size="sm" />
              <PlayingCard card={hero.hole[1]} size="sm" />
            </div>
          </div>
          <div className="review-myhand-block">
            <div className="review-myhand-label">公共牌</div>
            <div className="review-myhand-cards">
              {[0, 1, 2, 3, 4].map((i) => (
                <PlayingCard
                  key={i}
                  card={state.board[i]}
                  faceDown={!state.board[i]}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>

        {shown.length > 0 && (
          <div className="review-hands">
            {shown.map((e) => (
              <div key={e.playerId} className="review-hand-row">
                <span className="review-hand-name">{e.name}</span>
                <span className="review-hand-cards">
                  {e.hole.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" />
                  ))}
                </span>
                <span className="review-hand-type">
                  {e.hand ? CATEGORY_LABELS[e.hand.category] : ''}
                  {e.won > 0 && <span className="badge badge-accent" style={{ marginLeft: 6 }}>赢 {e.won}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {review.potOddsNote && (
          <div className="review-note">
            <div className="review-note-label">📐 底池赔率</div>
            {review.potOddsNote}
          </div>
        )}

        <div className="review-note">
          <div className="review-note-label">🔍 决策点评</div>
          {review.feedback}
        </div>

        <div className="review-note accent">
          <div className="review-note-label">💡 策略建议</div>
          {review.suggestion}
        </div>

        <button className="btn btn-accent btn-block" onClick={onNext} style={{ marginTop: 4 }}>
          下一手
        </button>
      </div>
    </div>
  );
}

function LogModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof state.log>();
    for (const l of state.log) {
      const arr = map.get(l.street) ?? [];
      arr.push(l);
      map.set(l.street, arr);
    }
    return map;
  }, [state.log]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong>本手行动记录</strong>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>关闭</button>
        </div>
        {['preflop', 'flop', 'turn', 'river'].map((st) =>
          grouped.has(st) ? (
            <div key={st} style={{ marginBottom: 12 }}>
              <div className="section-label" style={{ margin: '4px 0' }}>
                {streetLabel(st)}
              </div>
              {grouped.get(st)!.map((l, i) => (
                <div key={i} className="log-row">
                  <span>{l.playerName}</span>
                  <span className="text-dim">
                    {actionLabel(l.action, l.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function streetLabel(street: string): string {
  return (
    {
      preflop: '翻前 Preflop',
      flop: '翻牌 Flop',
      turn: '转牌 Turn',
      river: '河牌 River',
    }[street] ?? street
  );
}

function actionLabel(action: string, amount?: number): string {
  switch (action) {
    case 'fold':
      return '弃牌';
    case 'check':
      return '过牌';
    case 'call':
      return `跟注 ${amount ?? ''}`;
    case 'raise':
      return `加注至 ${amount ?? ''}`;
    default:
      return action;
  }
}
