import type { Card } from '@/engine/cards';
import { RANK_LABELS, SUIT_LABELS, SUIT_IS_RED } from '@/engine/cards';
import './PlayingCard.css';

interface Props {
  card?: Card | null;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  dim?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export function PlayingCard({
  card,
  size = 'md',
  faceDown = false,
  dim = false,
  onClick,
  selected = false,
}: Props) {
  const classes = ['pcard', `pcard-${size}`];
  if (dim) classes.push('pcard-dim');
  if (selected) classes.push('pcard-selected');
  if (onClick) classes.push('pcard-clickable');

  if (!card || faceDown) {
    return (
      <div
        className={`${classes.join(' ')} pcard-back`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <div className="pcard-back-pattern" />
      </div>
    );
  }

  const red = SUIT_IS_RED[card.suit];
  return (
    <div
      className={`${classes.join(' ')} ${red ? 'pcard-red' : 'pcard-black'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="pcard-rank">{RANK_LABELS[card.rank]}</span>
      <span className="pcard-suit">{SUIT_LABELS[card.suit]}</span>
    </div>
  );
}

/** 空位占位（用于未选牌） */
export function CardSlot({
  label,
  onClick,
  size = 'md',
}: {
  label?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div
      className={`pcard pcard-${size} pcard-slot ${onClick ? 'pcard-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="pcard-slot-label">{label ?? '+'}</span>
    </div>
  );
}
