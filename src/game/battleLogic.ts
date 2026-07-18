import type { BattleCard, CardDefinition, Owner } from "./types";

export const MAX_HEALTH_BONUS = 5;
export const MAX_ROUNDS = 20;
export const INITIAL_HAND_SIZE = 6;

export type AbilityBuff = {
  targetId: string;
  type: "health" | "strength";
  amount: number;
};

type AbilityResult = {
  card: BattleCard;
  hand: BattleCard[];
  opponentHand?: BattleCard[];
  opponentCard?: BattleCard;
  graveyard?: BattleCard[];
  defeatedAlliedCards?: BattleCard[];
  defeatedOpponentCards?: BattleCard[];
  abilityUsed?: boolean;
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

export const rollCardStrength = (
  card: CardDefinition | BattleCard,
  random: () => number = Math.random,
) => {
  if (!card.strengthRange) {
    return card.strength;
  }

  const [minimumStrength, maximumStrength] = card.strengthRange;
  return (
    minimumStrength +
    Math.floor(random() * (maximumStrength - minimumStrength + 1))
  );
};

export const createHand = (deck: CardDefinition[], owner: Owner) =>
  shuffle(deck)
    .slice(0, INITIAL_HAND_SIZE)
    .map((card, index) => ({
      ...card,
      id: `${owner}-${card.name}-${index}`,
      currentStrength: rollCardStrength(card),
      currentHealth: card.health,
      temporaryStrengthBonus: 0,
      temporaryStrengthPenalty: 0,
      nextBattleStrengthBonus: 0,
    }));

export const replaceDeckCard = (
  deck: CardDefinition[],
  replacementIndex: number,
  rewardCard: CardDefinition,
) =>
  deck.map((card, index) =>
    index === replacementIndex ? rewardCard : card,
  );

export const prepareCardForBattle = (
  card: BattleCard,
  random: () => number = Math.random,
): BattleCard => {
  const currentStrength = card.strengthRange
    ? rollCardStrength(card, random) +
      card.temporaryStrengthBonus +
      card.nextBattleStrengthBonus
    : card.currentStrength + card.nextBattleStrengthBonus;

  return {
    ...card,
    currentStrength,
    temporaryStrengthBonus:
      card.temporaryStrengthBonus + card.nextBattleStrengthBonus,
    nextBattleStrengthBonus: 0,
  };
};

export const prepareSurvivor = (card: BattleCard): BattleCard => ({
  ...card,
  currentStrength:
    card.currentStrength -
    card.temporaryStrengthBonus +
    card.temporaryStrengthPenalty,
  temporaryStrengthBonus: 0,
  temporaryStrengthPenalty: 0,
});

export const applyPermanentStrengthLoss = (
  card: BattleCard,
  amount = 1,
): BattleCard => ({
  ...card,
  strength: Math.max(1, card.strength - amount),
  strengthRange: card.strengthRange
    ? [
        Math.max(1, card.strengthRange[0] - amount),
        Math.max(1, card.strengthRange[1] - amount),
      ]
    : undefined,
  currentStrength: Math.max(1, card.currentStrength - amount),
});

export const prepareResurrectedCard = (card: BattleCard): BattleCard => ({
  ...prepareSurvivor(card),
  currentHealth: 1,
  nextBattleStrengthBonus: 0,
});

export const getMaximumHealth = (card: BattleCard) =>
  card.health + MAX_HEALTH_BONUS;

export const getHealthAfterBonus = (card: BattleCard, amount: number) =>
  Math.min(getMaximumHealth(card), card.currentHealth + amount);

export const getStrengthAfterWeaken = (strength: number) =>
  Math.max(1, strength - 2);

export const getStrengthDrainAmount = (strength: number) =>
  Math.min(1, Math.max(0, strength - 1));

export const getNormalCombatDamage = (
  attackingStrength: number,
  defendingCard: BattleCard,
  defenderAbilityBlocked = false,
) =>
  Math.max(
    0,
    attackingStrength -
      (defendingCard.effect === "damage-reduction" &&
      !defenderAbilityBlocked
        ? 1
        : 0),
  );

const grantHealth = (card: BattleCard, amount: number) => {
  const updatedHealth = getHealthAfterBonus(card, amount);

  return {
    card: { ...card, currentHealth: updatedHealth },
    amount: updatedHealth - card.currentHealth,
  };
};

const selectMostInjuredCard = (hand: BattleCard[]) => {
  const eligibleCards = hand.filter(
    (card) => card.currentHealth < getMaximumHealth(card),
  );
  const injuredCards = eligibleCards.filter(
    (card) => card.currentHealth < card.health,
  );
  const targetPool = injuredCards.length > 0 ? injuredCards : eligibleCards;

  return targetPool.reduce<BattleCard | undefined>((selected, card) => {
    if (!selected) {
      return card;
    }

    if (injuredCards.length === 0) {
      return card.currentStrength > selected.currentStrength ? card : selected;
    }

    const selectedHealthRatio = selected.currentHealth / selected.health;
    const cardHealthRatio = card.currentHealth / card.health;

    return cardHealthRatio < selectedHealthRatio ? card : selected;
  }, undefined);
};

const selectStrongestCard = (hand: BattleCard[]) =>
  hand.reduce<BattleCard | undefined>(
    (selected, card) =>
      !selected || card.currentStrength > selected.currentStrength
        ? card
        : selected,
    undefined,
  );

export const determineBattleResult = (
  playerHand: BattleCard[],
  botHand: BattleCard[],
) => {
  if (playerHand.length !== botHand.length) {
    return playerHand.length > botHand.length ? "Victory" : "Defeat";
  }

  const playerHealth = playerHand.reduce(
    (total, card) => total + card.currentHealth,
    0,
  );
  const botHealth = botHand.reduce(
    (total, card) => total + card.currentHealth,
    0,
  );

  if (playerHealth !== botHealth) {
    return playerHealth > botHealth ? "Victory" : "Defeat";
  }

  return "Draw";
};

export const getBlockedAbilityOwner = (
  round: number,
  playerCard: BattleCard,
  botCard: BattleCard,
): Owner | null => {
  const firstOwner: Owner = round % 2 === 1 ? "player" : "bot";
  const firstCard = firstOwner === "player" ? playerCard : botCard;

  if (firstCard.effect !== "silence") {
    return null;
  }

  return firstOwner === "player" ? "bot" : "player";
};

export function activateAbility(
  card: BattleCard,
  hand: BattleCard[],
  opponentHand: BattleCard[] = [],
  random: () => number = Math.random,
  opponentCard?: BattleCard,
  graveyard: BattleCard[] = [],
  abilityAlreadyUsed = false,
  playedSecond = false,
): AbilityResult {
  const activeCard = { ...card };
  const activeHand = hand.map((handCard) => ({ ...handCard }));

  if (card.effect === "strength-drain") {
    if (!opponentCard) {
      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} finds no opposing card to drain.`,
      };
    }

    const activeOpponentCard = { ...opponentCard };
    const drainedStrength = getStrengthDrainAmount(
      activeOpponentCard.currentStrength,
    );
    activeCard.currentStrength += drainedStrength;
    activeCard.temporaryStrengthBonus += drainedStrength;
    activeOpponentCard.currentStrength -= drainedStrength;
    activeOpponentCard.temporaryStrengthPenalty += drainedStrength;

    return {
      card: activeCard,
      hand: activeHand,
      opponentCard: activeOpponentCard,
      message:
        drainedStrength > 0
          ? `${card.name} steals 1 Strength from ${opponentCard.name} for this battle.`
          : `${opponentCard.name}'s Strength cannot be reduced below 1.`,
    };
  }

  if (card.effect === "second-strength") {
    if (!playedSecond) {
      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} was not played second, so its ability does not activate.`,
      };
    }

    activeCard.currentStrength += 2;
    activeCard.temporaryStrengthBonus += 2;

    return {
      card: activeCard,
      hand: activeHand,
      message: `${card.name} gains +2 Strength for the current battle.`,
    };
  }

  if (card.effect === "resurrect") {
    if (abilityAlreadyUsed) {
      return {
        card: activeCard,
        hand: activeHand,
        graveyard: graveyard.map((defeatedCard) => ({ ...defeatedCard })),
        message: `${card.name}'s ability has already been used this game.`,
      };
    }

    if (graveyard.length === 0) {
      return {
        card: activeCard,
        hand: activeHand,
        graveyard: [],
        message: `${card.name} finds no defeated allied card to return.`,
      };
    }

    const targetIndex = Math.floor(random() * graveyard.length);
    const resurrectedCard = prepareResurrectedCard(graveyard[targetIndex]);

    return {
      card: activeCard,
      hand: [...activeHand, resurrectedCard],
      graveyard: graveyard
        .filter((_, index) => index !== targetIndex)
        .map((defeatedCard) => ({ ...defeatedCard })),
      abilityUsed: true,
      message: `${card.name} returns ${resurrectedCard.name} to the hand with 1 Health.`,
    };
  }

  if (card.effect === "steal") {
    const ownedCardNames = new Set(
      activeHand.map((handCard) => handCard.name),
    );
    const eligibleCards = opponentHand.filter(
      (opponentCard) => !ownedCardNames.has(opponentCard.name),
    );

    if (eligibleCards.length === 0) {
      return {
        card: activeCard,
        hand: activeHand,
        opponentHand: opponentHand.map((opponentCard) => ({ ...opponentCard })),
        message: `${card.name} finds no unique card to steal.`,
      };
    }

    const stolenCard = {
      ...eligibleCards[Math.floor(random() * eligibleCards.length)],
    };

    return {
      card: activeCard,
      hand: [...activeHand, stolenCard],
      opponentHand: opponentHand
        .filter((opponentCard) => opponentCard.id !== stolenCard.id)
        .map((opponentCard) => ({ ...opponentCard })),
      message: `${card.name} steals ${stolenCard.name} from the opponent's hand.`,
    };
  }

  if (card.effect === "chaos") {
    const activeOpponentHand = opponentHand.map((opponentCard) => ({
      ...opponentCard,
    }));
    const destroysOpponentCard = random() < 0.1;
    const destroysAlliedCard = random() < 0.1;
    const messages: string[] = [];
    const defeatedAlliedCards: BattleCard[] = [];
    const defeatedOpponentCards: BattleCard[] = [];

    if (destroysOpponentCard && activeOpponentHand.length > 0) {
      const targetIndex = Math.floor(random() * activeOpponentHand.length);
      const [destroyedCard] = activeOpponentHand.splice(targetIndex, 1);
      defeatedOpponentCards.push(destroyedCard);
      messages.push(
        `${card.name} destroys ${destroyedCard.name} in the opponent's hand.`,
      );
    }

    if (destroysAlliedCard && activeHand.length > 0) {
      const targetIndex = Math.floor(random() * activeHand.length);
      const [destroyedCard] = activeHand.splice(targetIndex, 1);
      defeatedAlliedCards.push(destroyedCard);
      messages.push(
        `${card.name}'s chaos destroys allied ${destroyedCard.name}.`,
      );
    }

    return {
      card: activeCard,
      hand: activeHand,
      opponentHand: activeOpponentHand,
      defeatedAlliedCards,
      defeatedOpponentCards,
      message:
        messages.length > 0
          ? messages.join(" ")
          : `${card.name}'s chaos destroys no cards.`,
    };
  }

  if (card.effect === "weaken") {
    if (!opponentCard) {
      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} finds no opposing card to weaken.`,
      };
    }

    const weakenedStrength = getStrengthAfterWeaken(
      opponentCard.currentStrength,
    );
    const strengthReduction = opponentCard.currentStrength - weakenedStrength;
    const weakenedCard = {
      ...opponentCard,
      currentStrength: weakenedStrength,
      temporaryStrengthPenalty:
        opponentCard.temporaryStrengthPenalty + strengthReduction,
    };

    return {
      card: activeCard,
      hand: activeHand,
      opponentCard: weakenedCard,
      message: `${card.name} reduces ${opponentCard.name}'s Strength by ${strengthReduction} for this battle.`,
    };
  }

  if (card.effect === "area-damage") {
    const damagedOpponentCard = opponentCard
      ? {
          ...opponentCard,
          currentHealth: opponentCard.currentHealth - 1,
        }
      : undefined;
    const defeatedCards: BattleCard[] = [];
    const damagedOpponentHand = opponentHand
      .map((handCard) => ({
        ...handCard,
        currentHealth: handCard.currentHealth - 1,
      }))
      .filter((handCard) => {
        if (handCard.currentHealth <= 0) {
          defeatedCards.push(handCard);
          return false;
        }

        return true;
      });
    const defeatedMessage =
      defeatedCards.length > 0
        ? ` ${defeatedCards.map((defeatedCard) => defeatedCard.name).join(", ")} ${defeatedCards.length === 1 ? "is" : "are"} destroyed in the opponent's hand.`
        : "";

    return {
      card: activeCard,
      hand: activeHand,
      opponentHand: damagedOpponentHand,
      opponentCard: damagedOpponentCard,
      defeatedOpponentCards: defeatedCards,
      message: `${card.name} deals 1 damage to ${opponentCard?.name ?? "the opposing card"} and every card in the opponent's hand.${defeatedMessage}`,
    };
  }

  if (card.effect === "health") {
    if (activeHand.length > 0) {
      const target = selectMostInjuredCard(activeHand);

      if (!target) {
        return {
          card: activeCard,
          hand: activeHand,
          message: `${card.name}'s allies are already at maximum Health.`,
        };
      }

      const targetIndex = activeHand.findIndex(
        (handCard) => handCard.id === target.id,
      );
      const healthBonus = grantHealth(activeHand[targetIndex], 2);
      activeHand[targetIndex] = healthBonus.card;

      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} grants ${activeHand[targetIndex].name} +${healthBonus.amount} Health.`,
        buff: {
          targetId: activeHand[targetIndex].id,
          type: "health",
          amount: healthBonus.amount,
        },
      };
    }

    const healthBonus = grantHealth(activeCard, 2);
    activeCard.currentHealth = healthBonus.card.currentHealth;

    return {
      card: activeCard,
      hand: activeHand,
      message:
        healthBonus.amount > 0
          ? `${card.name} gains +${healthBonus.amount} Health.`
          : `${card.name} is already at maximum Health.`,
    };
  }

  if (card.effect === "strength") {
    if (activeHand.length > 0) {
      const target = selectStrongestCard(activeHand);
      const targetIndex = activeHand.findIndex(
        (handCard) => handCard.id === target?.id,
      );
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
      const eligibleTargets = activeHand.filter(
        (handCard) => handCard.currentHealth < getMaximumHealth(handCard),
      );

      if (eligibleTargets.length === 0) {
        return {
          card: activeCard,
          hand: activeHand,
          message: `${card.name}'s allies are already at maximum Health.`,
        };
      }

      const target =
        eligibleTargets[Math.floor(random() * eligibleTargets.length)];
      const targetIndex = activeHand.findIndex(
        (handCard) => handCard.id === target.id,
      );
      const healthBonus = grantHealth(activeHand[targetIndex], 3);
      activeHand[targetIndex] = healthBonus.card;

      return {
        card: activeCard,
        hand: activeHand,
        message: `${card.name} grants ${activeHand[targetIndex].name} +${healthBonus.amount} Health.`,
        buff: {
          targetId: activeHand[targetIndex].id,
          type: "health",
          amount: healthBonus.amount,
        },
      };
    }

    return {
      card: activeCard,
      hand: activeHand,
      message: `${card.name} has no other allied card to heal.`,
    };
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
