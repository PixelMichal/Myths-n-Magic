import type { BattleCard, CardDefinition, Owner } from "./types";

export type AbilityBuff = {
  targetId: string;
  type: "health" | "strength";
  amount: number;
};

type AbilityResult = {
  card: BattleCard;
  hand: BattleCard[];
  message: string;
  buff?: AbilityBuff;
};

const shuffle = <T,>(items: T[]) => {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
};

export const createHand = (deck: CardDefinition[], owner: Owner) =>
  shuffle(deck)
    .slice(0, 5)
    .map((card, index) => ({
      ...card,
      id: `${owner}-${card.name}-${index}`,
      currentStrength: card.strength,
      currentHealth: card.health,
      temporaryStrengthBonus: 0,
      nextBattleStrengthBonus: 0,
    }));

export const prepareCardForBattle = (card: BattleCard): BattleCard => ({
  ...card,
  currentStrength: card.currentStrength + card.nextBattleStrengthBonus,
  temporaryStrengthBonus:
    card.temporaryStrengthBonus + card.nextBattleStrengthBonus,
  nextBattleStrengthBonus: 0,
});

export const prepareSurvivor = (card: BattleCard): BattleCard => ({
  ...card,
  currentStrength: card.currentStrength - card.temporaryStrengthBonus,
  temporaryStrengthBonus: 0,
});

export function activateAbility(
  card: BattleCard,
  hand: BattleCard[],
): AbilityResult {
  const activeCard = { ...card };
  const activeHand = hand.map((handCard) => ({ ...handCard }));

  if (card.effect === "health") {
    if (activeHand.length > 0) {
      const targetIndex = Math.floor(Math.random() * activeHand.length);
      activeHand[targetIndex].currentHealth += 2;

      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} grants ${activeHand[targetIndex].name} +2 Health.`,
        buff: {
          targetId: activeHand[targetIndex].id,
          type: "health",
          amount: 2,
        },
      };
    }

    activeCard.currentHealth += 2;
  }

  if (card.effect === "strength") {
    if (activeHand.length > 0) {
      const targetIndex = Math.floor(Math.random() * activeHand.length);
      activeHand[targetIndex].currentStrength += 2;
      activeHand[targetIndex].temporaryStrengthBonus += 2;

      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} grants ${activeHand[targetIndex].name} +2 Strength for its next battle.`,
        buff: {
          targetId: activeHand[targetIndex].id,
          type: "strength",
          amount: 2,
        },
      };
    }

    activeCard.nextBattleStrengthBonus += 2;

    return {
      card: activeCard,
      hand: activeHand,
      message: `${card.name} gains +2 Strength for its next battle.`,
    };
  }

  if (card.effect === "random-health") {
    if (activeHand.length > 0) {
      const targetIndex = Math.floor(Math.random() * activeHand.length);
      activeHand[targetIndex].currentHealth += 3;

      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} grants ${activeHand[targetIndex].name} +3 Health.`,
        buff: {
          targetId: activeHand[targetIndex].id,
          type: "health",
          amount: 3,
        },
      };
    }

    activeCard.currentHealth += 3;
  }

  return {
    card: activeCard,
    hand: activeHand,
    message:
      card.effect === "none"
        ? `${card.name} has no special ability.`
        : `${card.name} activates: ${card.ability}.`,
  };
}
