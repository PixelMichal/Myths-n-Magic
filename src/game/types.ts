export type AbilityEffect = "none" | "health" | "strength" | "random-health";

export type CardDefinition = {
  name: string;
  image: string;
  strength: number;
  health: number;
  ability: string;
  effect: AbilityEffect;
};

export type BattleCard = CardDefinition & {
  id: string;
  currentStrength: number;
  currentHealth: number;
  temporaryStrengthBonus: number;
  nextBattleStrengthBonus: number;
};

export type Owner = "player" | "bot";
export type BattlePhase = "placing" | "combat" | "finished";
