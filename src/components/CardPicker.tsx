import { useState } from 'react';
import type { Card, Rank, Suit } from '@/engine/cards';
import {
  RANKS,
  SUITS,
  RANK_LABELS,
  SUIT_LABELS,
  SUIT_IS_RED,
  cardId,
} from '@/engine/cards';
import './CardPicker.css';

interface Props {
  /** 已被占用的牌（含正在编辑的槽位之外的其它牌） */
  disabled: Card[];
  onPick: (card: Card) => void;
  onClose: () => void;
  title?: string;
}

/** 从 52 张牌池中选择一张，已用牌禁用。 */
export function CardPicker({ disabled, onPick, onClose, title }: Props) {
  const [suit, setSuit] = useState<Suit>('s');
  const usedIds = new Set(disabled.map(cardId));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <strong>{title ?? '选择一张牌'}</strong>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="picker-suits">
          {SUITS.map((s) => (
            <button
              key={s}
              className={`picker-suit ${suit === s ? 'active' : ''} ${
                SUIT_IS_RED[s] ? 'red' : 'black'
              }`}
              onClick={() => setSuit(s)}
            >
              {SUIT_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="picker-grid">
          {RANKS.slice()
            .reverse()
            .map((r) => {
              const card: Card = { rank: r as Rank, suit };
              const used = usedIds.has(cardId(card));
              return (
                <button
                  key={r}
                  className={`picker-cell ${SUIT_IS_RED[suit] ? 'red' : 'black'} ${
                    used ? 'used' : ''
                  }`}
                  disabled={used}
                  onClick={() => onPick(card)}
                >
                  <span>{RANK_LABELS[r as Rank]}</span>
                  <span className="picker-cell-suit">{SUIT_LABELS[suit]}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
