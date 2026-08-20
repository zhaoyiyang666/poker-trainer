import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  computeGameStats,
  computeQuizStats,
  type Period,
} from '@/storage/stats';
import { getGameRecords, getQuizRecords } from '@/storage/store';
import './StatsPage.css';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '近 7 日' },
  { key: 'all', label: '全部' },
];

const RESULT_LABELS: Record<string, string> = {
  win: '胜',
  lose: '负',
  tie: '平',
  fold: '弃',
};

export function StatsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('all');
  const [tab, setTab] = useState<'game' | 'quiz' | 'records'>('game');

  const g = computeGameStats(period);
  const q = computeQuizStats(period);
  const gameRecords = getGameRecords().slice(0, 30);
  const quizRecords = getQuizRecords().slice(0, 30);

  return (
    <div className="page fade-in">
      <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
          ‹ 返回
        </button>
      </div>
      <div className="page-title">数据统计</div>
      <div className="page-sub">复盘练习表现，定位策略短板</div>

      <div className="period-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`period-tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="stat-tabs">
        <button className={`stat-tab ${tab === 'game' ? 'active' : ''}`} onClick={() => setTab('game')}>
          对局数据
        </button>
        <button className={`stat-tab ${tab === 'quiz' ? 'active' : ''}`} onClick={() => setTab('quiz')}>
          刷题数据
        </button>
        <button className={`stat-tab ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>
          记录
        </button>
      </div>

      {tab === 'game' && (
        <div className="fade-in">
          <div className="grid-2">
            <StatCard label="总对局数" value={String(g.totalHands)} />
            <StatCard
              label="摊牌胜率"
              value={g.showdownHands ? `${Math.round(g.showdownWinRate * 100)}%` : '—'}
              hint={`${g.showdownWins}/${g.showdownHands} 次摊牌`}
              accent
            />
            <StatCard label="入池率 VPIP" value={`${Math.round(g.vpipRate * 100)}%`} hint="主动投入底池的比例" />
            <StatCard label="加注率" value={`${Math.round(g.raiseRate * 100)}%`} />
            <StatCard label="弃牌率" value={`${Math.round(g.foldRate * 100)}%`} />
            <StatCard
              label="净筹码"
              value={`${g.netChips >= 0 ? '+' : ''}${g.netChips}`}
              cls={g.netChips >= 0 ? 'text-accent' : 'text-danger'}
            />
          </div>
          {g.totalHands === 0 && <EmptyHint text="还没有对局记录，先去练习几手吧" />}
          <StatTip vpip={g.vpipRate} raise={g.raiseRate} />
        </div>
      )}

      {tab === 'quiz' && (
        <div className="fade-in">
          <div className="grid-2">
            <StatCard label="总答题量" value={String(q.total)} />
            <StatCard label="正确率" value={q.total ? `${Math.round(q.accuracy * 100)}%` : '—'} accent />
            <StatCard label="正确题数" value={String(q.correct)} />
            <StatCard label="错题数" value={String(q.wrong)} cls={q.wrong > 0 ? 'text-danger' : ''} />
          </div>
          {q.topWrongScenarios.length > 0 && (
            <div className="card">
              <div className="section-label" style={{ margin: '0 0 8px' }}>
                高频错题场景 TOP
              </div>
              {q.topWrongScenarios.map((s) => (
                <div className="wrong-row" key={s.category}>
                  <span>{s.category}</span>
                  <span className="badge badge-danger">错 {s.count} 次</span>
                </div>
              ))}
            </div>
          )}
          {q.total === 0 && <EmptyHint text="还没有刷题记录，去练习决策场景吧" />}
        </div>
      )}

      {tab === 'records' && (
        <div className="fade-in">
          <div className="section-label">最近对局</div>
          {gameRecords.length === 0 ? (
            <EmptyHint text="暂无对局记录" />
          ) : (
            <div className="card card-tight">
              {gameRecords.map((r) => (
                <div className="record-row" key={r.id}>
                  <span className={`record-result r-${r.result}`}>
                    {RESULT_LABELS[r.result]}
                  </span>
                  <span className="record-hole">{formatHole(r.heroHole)}</span>
                  <span className="record-net">
                    <span className={r.heroNet >= 0 ? 'text-accent' : 'text-danger'}>
                      {r.heroNet >= 0 ? '+' : ''}
                      {r.heroNet}
                    </span>
                  </span>
                  <span className="record-time">{formatTime(r.timestamp)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="section-label">最近刷题</div>
          {quizRecords.length === 0 ? (
            <EmptyHint text="暂无刷题记录" />
          ) : (
            <div className="card card-tight">
              {quizRecords.map((r) => (
                <div className="record-row" key={r.id}>
                  <span className={`record-result ${r.isCorrect ? 'r-win' : 'r-lose'}`}>
                    {r.isCorrect ? '✓' : '✕'}
                  </span>
                  <span className="record-hole" style={{ flex: 1 }}>{r.category}</span>
                  <span className="record-time">{formatTime(r.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  cls,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  cls?: string;
}) {
  return (
    <div className={`card stat-card ${accent ? 'accent' : ''}`}>
      <div className={`stat-value ${cls ?? (accent ? 'text-accent' : '')}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function StatTip({ vpip, raise }: { vpip: number; raise: number }) {
  if (vpip === 0) return null;
  let tip = '';
  if (vpip > 0.45) tip = '入池率偏高，说明起手牌范围较松，建议收紧弱牌，重点玩强牌与好位置。';
  else if (vpip < 0.15) tip = '入池率偏低，打法较紧，可在有利位置适当放宽范围，增加进攻性。';
  else tip = '入池率处于合理区间，继续保持起手牌纪律。';
  if (raise < 0.1) tip += ' 加注率较低，偏被动，可尝试用强牌更多主动加注争取价值。';
  return (
    <div className="card card-tight" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
      💡 {tip}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="card text-center text-mute">{text}</div>;
}

function formatHole(raw: string): string {
  return raw || '—';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
