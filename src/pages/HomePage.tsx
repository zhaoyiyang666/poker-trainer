import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComplianceBanner } from '@/components/ComplianceBanner';
import { getSettings, saveSettings } from '@/storage/store';
import { computeGameStats, computeQuizStats } from '@/storage/stats';
import './HomePage.css';

const ENTRIES = [
  { to: '/game', icon: '🃏', title: 'AI 模拟对局', desc: '6/9 人桌 · 多难度 AI · 完整流程' },
  { to: '/calculator', icon: '📊', title: '胜率计算器', desc: '蒙特卡洛模拟 · 手牌公共牌胜率' },
  { to: '/quiz', icon: '📝', title: '策略刷题', desc: '高频决策场景 · 解析 · 错题复盘' },
  { to: '/stats', icon: '📈', title: '数据统计', desc: '入池率 · 加注率 · 答题正确率' },
  { to: '/manual', icon: '📖', title: '学习手册', desc: '牌型规则 · 位置策略 · 赔率基础' },
];

const ONBOARDING = [
  {
    icon: '🎓',
    title: '纯学习练习工具',
    body: '「德扑训练大师」是一款纯教学练习工具，专注德州扑克策略学习、概率训练与决策复盘。',
  },
  {
    icon: '🛡️',
    title: '合规无博弈',
    body: '无真钱、无充值、无真人对战、无变现。所有筹码均为无现金价值的练习道具，全程本地离线运行。',
  },
  {
    icon: '🚀',
    title: '开始训练',
    body: '通过 AI 对局熟悉流程、用计算器理解概率、靠刷题固化正确决策，再看数据查漏补缺。',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [step, setStep] = useState(0);

  const game = computeGameStats('today');
  const quiz = computeQuizStats('today');

  useEffect(() => {
    const s = getSettings();
    if (!s.onboardingSeen) setShowOnboarding(true);
  }, []);

  function finishOnboarding() {
    saveSettings({ onboardingSeen: true });
    setShowOnboarding(false);
  }

  return (
    <div className="page fade-in">
      <div className="home-header">
        <div className="home-brand-wrap">
          <span className="home-seal">🃏</span>
          <div>
            <div className="home-brand">德扑训练大师</div>
            <div className="home-slogan">科学练德扑，只学不博弈</div>
          </div>
        </div>
        <button className="home-set" onClick={() => navigate('/settings')}>
          ⚙️
        </button>
      </div>

      <div className="card home-stats">
        <div className="section-label" style={{ margin: '0 0 10px' }}>
          今日练习
        </div>
        <div className="grid-3">
          <div className="text-center">
            <div className="stat-value">{game.totalHands}</div>
            <div className="stat-label">对局数</div>
          </div>
          <div className="text-center">
            <div className="stat-value">{quiz.total}</div>
            <div className="stat-label">刷题数</div>
          </div>
          <div className="text-center">
            <div className="stat-value text-accent">
              {quiz.total ? `${Math.round(quiz.accuracy * 100)}%` : '—'}
            </div>
            <div className="stat-label">答题正确率</div>
          </div>
        </div>
      </div>

      <div className="section-label">核心功能</div>
      {ENTRIES.map((e) => (
        <button key={e.to} className="home-entry" onClick={() => navigate(e.to)}>
          <span className="home-entry-icon">{e.icon}</span>
          <span className="home-entry-text">
            <span className="home-entry-title">{e.title}</span>
            <span className="home-entry-desc">{e.desc}</span>
          </span>
          <span className="home-entry-arrow">›</span>
        </button>
      ))}

      <div style={{ marginTop: 18 }}>
        <ComplianceBanner />
      </div>

      {showOnboarding && (
        <div className="modal-backdrop">
          <div className="modal onboarding fade-in">
            <div className="onboarding-icon">{ONBOARDING[step].icon}</div>
            <div className="onboarding-title">{ONBOARDING[step].title}</div>
            <div className="onboarding-body">{ONBOARDING[step].body}</div>
            <div className="onboarding-dots">
              {ONBOARDING.map((_, i) => (
                <span key={i} className={`dot ${i === step ? 'on' : ''}`} />
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              {step > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => setStep((s) => s - 1)}
                >
                  上一步
                </button>
              )}
              <button
                className="btn btn-accent btn-block"
                onClick={() =>
                  step < ONBOARDING.length - 1
                    ? setStep((s) => s + 1)
                    : finishOnboarding()
                }
              >
                {step < ONBOARDING.length - 1 ? '下一步' : '开始练习'}
              </button>
            </div>
            <button className="onboarding-skip" onClick={finishOnboarding}>
              跳过引导
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
