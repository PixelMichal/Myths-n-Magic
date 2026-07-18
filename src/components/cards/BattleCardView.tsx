import type { BattleCard, Owner } from "../../game/types";
import { AbilityText } from "./AbilityText";

type BattleCardViewProps = {
  card: BattleCard;
  disabled?: boolean;
  onClick?: () => void;
  field?: boolean;
  damage?: number;
  displayedStrength?: number;
  displayedHealth?: number;
  owner?: Owner;
  targetable?: boolean;
  invalidTarget?: boolean;
};

export function BattleCardView({
  card,
  disabled = true,
  onClick,
  field = false,
  damage,
  displayedStrength,
  displayedHealth,
  owner,
  targetable = false,
  invalidTarget = false,
}: BattleCardViewProps) {
  return (
    <button
      className={`battle-card${field ? " battle-card--field" : ""}${owner ? ` battle-card--${owner}` : ""}${damage !== undefined ? " battle-card--damaged" : ""}${displayedStrength !== undefined && displayedStrength < card.currentStrength ? " battle-card--weakened" : ""}${targetable ? " battle-card--targetable" : ""}${invalidTarget ? " battle-card--invalid-target" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${card.name}. Strength ${displayedStrength ?? card.currentStrength}. Health ${card.currentHealth}.${card.ability !== "None" ? ` Special Ability: ${card.ability}.` : ""}`}
    >
      <img src={card.image} alt="" />
      <span className="battle-card__shade" />
      <span className="battle-card__name">{card.name}</span>
      <span className="battle-card__stats" aria-hidden="true">
        <span>STR <strong>{displayedStrength ?? card.currentStrength}</strong></span>
        <span>HP <strong>{displayedHealth ?? card.currentHealth}</strong></span>
      </span>
      <span className="battle-card__ability" aria-hidden="true">
        <span className="battle-card__hover-name">{card.name}</span>
        <span className="battle-card__hover-divider" />
        <span className="battle-card__hover-stats">
          <span>Strength <strong>{displayedStrength ?? card.currentStrength}</strong></span>
          <span>Health <strong>{displayedHealth ?? card.currentHealth}</strong></span>
        </span>
        {card.ability !== "None" && (
          <span className="battle-card__hover-ability">
            <small>Special Ability</small>
            <strong>
              <AbilityText ability={card.ability} />
            </strong>
          </span>
        )}
      </span>
    </button>
  );
}
