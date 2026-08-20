import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSettings,
  saveSettings,
  clearAllData,
  type AppSettings,
} from '@/storage/store';
import './SettingsPage.css';

const COMPLIANCE_TEXT =
  '本应用仅供德州扑克策略学习与练习，无任何赌博功能，所有虚拟筹码无任何现金价值，禁止用户将本工具用于非法博弈活动。';

const PRIVACY_TEXT =
  '本应用全程本地运行，不联网、不上传任何数据。所有练习记录、错题、统计数据仅保存在本设备本地存储中，不会被收集或传输。你可随时清空全部本地数据。';

export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [modal, setModal] = useState<'privacy' | 'agreement' | 'clear' | null>(null);

  function update(patch: Partial<AppSettings>) {
    setSettings(saveSettings(patch));
  }

  function doClear() {
    clearAllData();
    setSettings(getSettings());
    setModal(null);
  }

  return (
    <div className="page fade-in">
      <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/')}>
          ‹ 返回
        </button>
      </div>
      <div className="page-title">设置</div>
      <div className="page-sub">隐私 · 合规 · 数据管理</div>

      <div className="section-label">练习偏好</div>
      <div className="card card-tight">
        <div className="set-row">
          <div>
            <div className="set-label">默认牌桌人数</div>
            <div className="set-hint">对局默认座位数</div>
          </div>
          <select
            value={settings.defaultSeats}
            onChange={(e) => update({ defaultSeats: Number(e.target.value) as 6 | 9 })}
          >
            <option value={6}>6 人桌</option>
            <option value={9}>9 人桌</option>
          </select>
        </div>
        <div className="set-row">
          <div>
            <div className="set-label">离线模式</div>
            <div className="set-hint">默认开启，全程无需联网</div>
          </div>
          <Toggle
            on={settings.offlineMode}
            onChange={(v) => update({ offlineMode: v })}
          />
        </div>
      </div>

      <div className="section-label">合规与隐私</div>
      <div className="card card-tight">
        <button className="set-link" onClick={() => setModal('privacy')}>
          隐私政策 <span className="arr">›</span>
        </button>
        <button className="set-link" onClick={() => setModal('agreement')}>
          用户协议 <span className="arr">›</span>
        </button>
      </div>

      <div className="compliance-box">
        <div className="compliance-box-title">🛡️ 合规免责声明</div>
        {COMPLIANCE_TEXT}
      </div>

      <div className="section-label">数据管理</div>
      <div className="card card-tight">
        <button className="set-link danger" onClick={() => setModal('clear')}>
          清空本地数据 <span className="arr">›</span>
        </button>
      </div>

      <div className="section-label">关于</div>
      <div className="card card-tight">
        <div className="set-row">
          <div className="set-label">应用名称</div>
          <div className="text-dim">德扑训练大师</div>
        </div>
        <div className="set-row">
          <div className="set-label">版本</div>
          <div className="text-dim">V1.0.0 (MVP)</div>
        </div>
        <div className="set-row">
          <div className="set-label">类型</div>
          <div className="text-dim">学习工具</div>
        </div>
      </div>

      <div className="app-footer">科学练德扑，只学不博弈</div>

      {modal === 'privacy' && (
        <InfoModal title="隐私政策" body={PRIVACY_TEXT} onClose={() => setModal(null)} />
      )}
      {modal === 'agreement' && (
        <InfoModal
          title="用户协议"
          body={`欢迎使用德扑训练大师。使用本应用即表示你同意：\n\n1. 本应用为纯学习练习工具，不提供任何真实货币博弈、充值或变现功能。\n2. 应用内所有筹码均为无现金价值的练习道具。\n3. 你不得将本工具用于任何非法博弈活动。\n4. 本应用的策略建议仅供学习参考。\n\n${COMPLIANCE_TEXT}`}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'clear' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-lg">清空本地数据</div>
            <div className="text-dim" style={{ lineHeight: 1.6, marginBottom: 18 }}>
              将永久删除全部对局记录、错题收藏与练习统计数据，此操作不可恢复。确定继续吗？
            </div>
            <div className="row">
              <button className="btn btn-ghost btn-block" onClick={() => setModal(null)}>
                取消
              </button>
              <button className="btn btn-danger btn-block" onClick={doClear}>
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="toggle-knob" />
    </button>
  );
}

function InfoModal({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title-lg">{title}</div>
        <div className="modal-body-text">{body}</div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={onClose}>
          我已了解
        </button>
      </div>
    </div>
  );
}
