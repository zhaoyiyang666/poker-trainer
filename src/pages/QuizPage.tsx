import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '@/components/PlayingCard';
import { parseCards } from '@/engine/cards';
import {
  QUESTION_BANK,
  CHOICE_LABELS,
  type QuizQuestion,
  type QuizChoice,
} from '@/data/questions';
import {
  addQuizRecord,
  addWrongId,
  toggleWrongId,
  getWrongIds,
  genId,
} from '@/storage/store';
import './QuizPage.css';

type Mode = 'all' | 'wrong';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('all');
  const [wrongIds, setWrongIds] = useState<string[]>(() => getWrongIds());
  const [started, setStarted] = useState(false);

  const questions = useMemo(() => {
    if (mode === 'wrong') {
      return QUESTION_BANK.filter((q) => wrongIds.includes(q.id));
    }
    return shuffleArray(QUESTION_BANK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, started]);

  if (!started) {
    return (
      <div className="page fade-in">
        <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
            ‹ 返回
          </button>
        </div>
        <div className="page-title">策略刷题</div>
        <div className="page-sub">高频决策场景 · 标准答案 · 错题复盘</div>

        <div className="card">
          <div className="quiz-modes">
            <button
              className={`opt-btn ${mode === 'all' ? 'active' : ''}`}
              onClick={() => setMode('all')}
            >
              全部题目
              <div className="opt-sub">{QUESTION_BANK.length} 题</div>
            </button>
            <button
              className={`opt-btn ${mode === 'wrong' ? 'active' : ''}`}
              onClick={() => setMode('wrong')}
            >
              错题重做
              <div className="opt-sub">{wrongIds.length} 题</div>
            </button>
          </div>
          <button
            className="btn btn-accent btn-block"
            style={{ marginTop: 14 }}
            disabled={mode === 'wrong' && wrongIds.length === 0}
            onClick={() => setStarted(true)}
          >
            {mode === 'wrong' && wrongIds.length === 0
              ? '暂无错题'
              : '开始刷题'}
          </button>
        </div>

        <div className="card card-tight text-dim" style={{ fontSize: 13, lineHeight: 1.6 }}>
          题库覆盖翻前起手牌、位置策略、面对加注、底池赔率、翻后牌力评估等新手高频场景，
          每题附带标准决策、错误原因、底层逻辑与赔率依据。
        </div>
      </div>
    );
  }

  return (
    <QuizRunner
      questions={questions}
      onWrongChange={() => setWrongIds(getWrongIds())}
      onExit={() => {
        setStarted(false);
        setWrongIds(getWrongIds());
      }}
    />
  );
}

function QuizRunner({
  questions,
  onWrongChange,
  onExit,
}: {
  questions: QuizQuestion[];
  onWrongChange: () => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<QuizChoice | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [collected, setCollected] = useState<string[]>(() => getWrongIds());

  const q = questions[idx];
  const answered = chosen !== null;
  const isCorrect = chosen === q.correct;
  const holeCards = parseCards(q.hole);
  const boardCards = q.board ? parseCards(q.board) : [];

  function choose(choice: QuizChoice) {
    if (answered) return;
    setChosen(choice);
    const ok = choice === q.correct;
    if (ok) setCorrectCount((c) => c + 1);
    else {
      addWrongId(q.id);
      setCollected(getWrongIds());
      onWrongChange();
    }
    addQuizRecord({
      id: genId(),
      timestamp: Date.now(),
      questionId: q.id,
      scenario: q.scenario,
      chosen: choice,
      correct: q.correct,
      isCorrect: ok,
      category: q.category,
    });
  }

  function next() {
    if (idx < questions.length - 1) {
      setIdx((i) => i + 1);
      setChosen(null);
    } else {
      onExit();
    }
  }

  const inCollection = collected.includes(q.id);

  return (
    <div className="page fade-in">
      <div className="quiz-top">
        <button className="btn btn-sm btn-ghost" onClick={onExit}>
          ‹ 退出
        </button>
        <div className="quiz-progress-text">
          {idx + 1} / {questions.length} · 正确 {correctCount}
        </div>
        <button
          className={`btn btn-sm ${inCollection ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            toggleWrongId(q.id);
            setCollected(getWrongIds());
            onWrongChange();
          }}
        >
          {inCollection ? '★ 已收藏' : '☆ 收藏'}
        </button>
      </div>

      <div className="progress" style={{ margin: '4px 0 16px' }}>
        <div
          className="progress-fill"
          style={{ width: `${((idx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="card">
        <div className="quiz-tags">
          <span className="badge badge-accent">{q.category}</span>
          <span className="badge">{q.position}</span>
        </div>
        <div className="quiz-scenario">{q.scenario}</div>

        <div className="quiz-cards-block">
          <div>
            <div className="quiz-cards-label">你的手牌</div>
            <div className="quiz-cards">
              {holeCards.map((c, i) => (
                <PlayingCard key={i} card={c} size="md" />
              ))}
            </div>
          </div>
          {boardCards.length > 0 && (
            <div>
              <div className="quiz-cards-label">公共牌</div>
              <div className="quiz-cards">
                {boardCards.map((c, i) => (
                  <PlayingCard key={i} card={c} size="md" />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="quiz-pot">{q.potInfo}</div>
      </div>

      <div className="section-label">你的决策</div>
      <div className="quiz-choices">
        {(['fold', 'call', 'raise'] as QuizChoice[]).map((c) => {
          let cls = 'quiz-choice';
          if (answered) {
            if (c === q.correct) cls += ' correct';
            else if (c === chosen) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button
              key={c}
              className={cls}
              onClick={() => choose(c)}
              disabled={answered}
            >
              {CHOICE_LABELS[c]}
              {answered && c === q.correct && <span className="mark">✓</span>}
              {answered && c === chosen && c !== q.correct && (
                <span className="mark">✕</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="fade-in">
          <div className={`quiz-verdict ${isCorrect ? 'ok' : 'no'}`}>
            {isCorrect ? '✓ 回答正确' : `✕ 正确答案：${CHOICE_LABELS[q.correct]}`}
          </div>
          <div className="card">
            <div className="review-note-label">决策解析</div>
            <div className="quiz-explain">{q.explanation}</div>
            <div className="divider" />
            <div className="review-note-label">底层逻辑 / 赔率依据</div>
            <div className="quiz-explain text-dim">{q.reasoning}</div>
          </div>
          <button className="btn btn-accent btn-block" onClick={next}>
            {idx < questions.length - 1 ? '下一题' : '完成刷题'}
          </button>
        </div>
      )}
    </div>
  );
}
