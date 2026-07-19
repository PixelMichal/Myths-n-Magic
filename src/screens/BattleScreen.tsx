import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from "motion/react";
import { BattleCardView } from "../components/cards/BattleCardView";
import type { OpponentDefinition } from "../data/opponents";
import {
  activateAbility,
  applyPermanentStrengthGain,
  applyPermanentStrengthLoss,
  chooseBotCard,
  createHand,
  determineBattleResult,
  getBlockedAbilityOwner,
  getHealthAfterBonus,
  getNormalCombatDamage,
  getStrengthDrainAmount,
  getStrengthAfterWeaken,
  INITIAL_HAND_SIZE,
  MAX_ROUNDS,
  prepareCardForBattle,
  prepareResurrectedCard,
  prepareSurvivor,
} from "../game/battleLogic";
import type { AbilityBuff } from "../game/battleLogic";
import type {
  BattleCard,
  BattlePhase,
  CardDefinition,
  Owner,
} from "../game/types";

declare global {
  interface Window {
    winBattle?: () => string;
    loseBattle?: () => string;
  }
}

const canReceiveTargetedAbility = (
  sourceCard: BattleCard,
  targetCard: BattleCard,
) =>
  sourceCard.effect !== "health" ||
  getHealthAfterBonus(targetCard, 2) > targetCard.currentHealth;

type BattleScreenProps = {
  playerDeck: CardDefinition[];
  level: 1 | 2 | 3;
  opponent: OpponentDefinition;
  onVictory?: () => void;
  onDefeat?: () => void;
};

export function BattleScreen({
  playerDeck,
  level,
  opponent,
  onVictory,
  onDefeat,
}: BattleScreenProps) {
  const [showOpponentIntro, setShowOpponentIntro] = useState(true);
  const [playerHand, setPlayerHand] = useState(() => createHand(playerDeck, "player"));
  const [botHand, setBotHand] = useState(() =>
    createHand(opponent.deck, "bot"),
  );
  const [playerGraveyard, setPlayerGraveyard] = useState<BattleCard[]>([]);
  const [botGraveyard, setBotGraveyard] = useState<BattleCard[]>([]);
  const [playerElyraAbilityUsed, setPlayerElyraAbilityUsed] = useState(false);
  const [botElyraAbilityUsed, setBotElyraAbilityUsed] = useState(false);
  const [opponentPassiveUsed, setOpponentPassiveUsed] = useState(false);
  const [botDefeatCount, setBotDefeatCount] = useState(0);
  const [playerField, setPlayerField] = useState<BattleCard | null>(null);
  const [botField, setBotField] = useState<BattleCard | null>(null);
  const [turn, setTurn] = useState<Owner>("player");
  const [phase, setPhase] = useState<BattlePhase>("placing");
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState("Your turn — choose a card");
  const [battleLog, setBattleLog] = useState<string[]>([
    `Both players draw ${INITIAL_HAND_SIZE} cards.`,
  ]);
  const [result, setResult] = useState("");
  const [isAttacking, setIsAttacking] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [damagePreview, setDamagePreview] = useState<{
    playerHealth: number;
    botHealth: number;
    playerDamage: number;
    botDamage: number;
  } | null>(null);
  const [targetSelection, setTargetSelection] = useState<"waiting" | "done" | null>(null);
  const [placementPreview, setPlacementPreview] = useState<BattleCard | null>(null);
  const [isPlayerCardLanding, setIsPlayerCardLanding] = useState(false);
  const [handBuffAnimation, setHandBuffAnimation] = useState<AbilityBuff | null>(null);
  const blockedAbilityOwner =
    phase === "combat" && playerField && botField
      ? getBlockedAbilityOwner(round, playerField, botField)
      : null;
  const secondCardOwner: Owner = round % 2 === 1 ? "bot" : "player";
  const playerSecondStrengthBonus =
    phase === "combat" &&
    playerField?.effect === "second-strength" &&
    secondCardOwner === "player" &&
    blockedAbilityOwner !== "player"
      ? 2
      : 0;
  const botSecondStrengthBonus =
    phase === "combat" &&
    botField?.effect === "second-strength" &&
    secondCardOwner === "bot" &&
    blockedAbilityOwner !== "bot"
      ? 2
      : 0;
  const playerPreviewDrain =
    phase === "combat" &&
    playerField?.effect === "strength-drain" &&
    botField &&
    blockedAbilityOwner !== "player"
      ? getStrengthDrainAmount(
          botField.currentStrength + botSecondStrengthBonus,
        )
      : 0;
  const botPreviewDrain =
    phase === "combat" &&
    botField?.effect === "strength-drain" &&
    playerField &&
    blockedAbilityOwner !== "bot"
      ? getStrengthDrainAmount(
          playerField.currentStrength + playerSecondStrengthBonus,
        )
      : 0;
  const playerDisplayedStrength =
    phase === "combat" && playerField && botField
      ? botField.effect === "weaken" && blockedAbilityOwner !== "bot"
        ? getStrengthAfterWeaken(
            playerField.currentStrength +
              playerSecondStrengthBonus +
              playerPreviewDrain -
              botPreviewDrain,
          )
        : playerField.currentStrength +
          playerSecondStrengthBonus +
          playerPreviewDrain -
          botPreviewDrain
      : undefined;
  const botDisplayedStrength =
    phase === "combat" && playerField && botField
      ? playerField.effect === "weaken" && blockedAbilityOwner !== "player"
        ? getStrengthAfterWeaken(
            botField.currentStrength +
              botSecondStrengthBonus +
              botPreviewDrain -
              playerPreviewDrain,
          )
        : botField.currentStrength +
          botSecondStrengthBonus +
          botPreviewDrain -
          playerPreviewDrain
      : undefined;

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowOpponentIntro(false);
    }, 2800);

    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (
      opponent.passive.effect !== "ashen-blessing" ||
      opponentPassiveUsed ||
      phase !== "placing" ||
      round !== 1
    ) {
      return;
    }

    const passiveTimer = window.setTimeout(() => {
      setBotHand((currentHand) => {
        if (currentHand.length === 0) {
          return currentHand;
        }

        const targetIndex = Math.floor(Math.random() * currentHand.length);
        return currentHand.map((card, index) =>
          index === targetIndex ? applyPermanentStrengthGain(card) : card,
        );
      });
      setOpponentPassiveUsed(true);
      setStatus(`${opponent.name} invokes ${opponent.passive.name}`);
      setBattleLog((currentLog) =>
        [
          ...currentLog,
          `${opponent.passive.name}: A hidden card permanently gains 1 Strength.`,
        ].slice(-6),
      );
    }, 3000);

    return () => window.clearTimeout(passiveTimer);
  }, [
    opponent.name,
    opponent.passive.effect,
    opponent.passive.name,
    opponentPassiveUsed,
    phase,
    round,
  ]);

  useEffect(() => {
    if (result !== "Victory" || !onVictory) {
      return;
    }

    const rewardTimer = window.setTimeout(onVictory, 1800);
    return () => window.clearTimeout(rewardTimer);
  }, [onVictory, result]);

  useEffect(() => {
    if (result !== "Defeat" || !onDefeat) {
      return;
    }

    const defeatTimer = window.setTimeout(onDefeat, 1200);
    return () => window.clearTimeout(defeatTimer);
  }, [onDefeat, result]);

  useEffect(() => {
    const triggerTestVictory = () => {
      setShowOpponentIntro(false);
      setPhase("finished");
      setResult("Victory");
      setStatus("Victory");
      setTurn("player");
      setPlayerField(null);
      setBotField(null);
      setBotHand([]);
      setPlacementPreview(null);
      setIsPlayerCardLanding(false);
      setIsAttacking(false);
      setShowImpact(false);
      setDamagePreview(null);
      setTargetSelection(null);
      setBattleLog((currentLog) =>
        [
          ...currentLog,
          `Test command: Level ${level} victory over ${opponent.name}.`,
        ].slice(-6),
      );

      return `Level ${level} victory triggered.`;
    };

    const triggerTestDefeat = () => {
      setShowOpponentIntro(false);
      setPhase("finished");
      setResult("Defeat");
      setStatus("Defeat");
      setTurn("player");
      setPlayerField(null);
      setBotField(null);
      setPlayerHand([]);
      setPlacementPreview(null);
      setIsPlayerCardLanding(false);
      setIsAttacking(false);
      setShowImpact(false);
      setDamagePreview(null);
      setTargetSelection(null);
      setBattleLog((currentLog) =>
        [
          ...currentLog,
          `Test command: Level ${level} defeat against ${opponent.name}.`,
        ].slice(-6),
      );

      return `Level ${level} defeat triggered.`;
    };

    window.winBattle = triggerTestVictory;
    window.loseBattle = triggerTestDefeat;

    return () => {
      if (window.winBattle === triggerTestVictory) {
        delete window.winBattle;
      }
      if (window.loseBattle === triggerTestDefeat) {
        delete window.loseBattle;
      }
    };
  }, [level, opponent.name]);

  const placePlayerCard = (card: BattleCard) => {
    if (
      phase !== "placing" ||
      turn !== "player" ||
      playerField ||
      placementPreview ||
      isPlayerCardLanding
    ) {
      return;
    }

    setPlayerHand((currentHand) =>
      currentHand.filter((handCard) => handCard.id !== card.id),
    );
    setPlacementPreview(prepareCardForBattle(card));
    setStatus(`${card.name} selected`);
  };

  useEffect(() => {
    if (!placementPreview) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPlayerField(placementPreview);
      setPlacementPreview(null);
      setIsPlayerCardLanding(true);
      setStatus(`${placementPreview.name} enters the battlefield`);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [placementPreview]);

  useEffect(() => {
    if (!isPlayerCardLanding || !playerField) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsPlayerCardLanding(false);
      setBattleLog((currentLog) =>
        [...currentLog, `You place ${playerField.name}.`].slice(-6),
      );

      if (botField) {
        setPhase("combat");
        setStatus("Combat begins");
      } else {
        setTurn("bot");
        setStatus(`${opponent.name} is choosing a card`);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [botField, isPlayerCardLanding, opponent.name, playerField]);

  const selectAbilityTarget = (targetCard: BattleCard) => {
    if (
      targetSelection !== "waiting" ||
      !playerField ||
      (playerField.effect !== "health" && playerField.effect !== "strength")
    ) {
      return;
    }

    const hasHandTargets = playerHand.length > 0;
    const isFieldTarget =
      !hasHandTargets && playerField.id === targetCard.id;
    const isHandTarget = playerHand.some(
      (card) =>
        card.id === targetCard.id &&
        canReceiveTargetedAbility(playerField, card),
    );

    if (
      (!isFieldTarget && !isHandTarget) ||
      !canReceiveTargetedAbility(playerField, targetCard)
    ) {
      return;
    }

    const appliedAmount =
      playerField.effect === "health"
        ? getHealthAfterBonus(targetCard, 2) - targetCard.currentHealth
        : 2;
    const applyTargetedEffect = (card: BattleCard, isAlreadyInBattle: boolean) => ({
      ...card,
      currentStrength:
        card.currentStrength +
        (playerField.effect === "strength" && !isAlreadyInBattle ? 2 : 0),
      currentHealth:
        playerField.effect === "health"
          ? getHealthAfterBonus(card, 2)
          : card.currentHealth,
      temporaryStrengthBonus:
        card.temporaryStrengthBonus +
        (playerField.effect === "strength" && !isAlreadyInBattle ? 2 : 0),
      nextBattleStrengthBonus:
        card.nextBattleStrengthBonus +
        (playerField.effect === "strength" && isAlreadyInBattle ? 2 : 0),
    });

    if (isFieldTarget) {
      setPlayerField((currentCard) =>
        currentCard ? applyTargetedEffect(currentCard, true) : currentCard,
      );
    } else {
      setPlayerHand((currentHand) =>
        currentHand.map((card) =>
          card.id === targetCard.id ? applyTargetedEffect(card, false) : card,
        ),
      );
      if (appliedAmount > 0) {
        setHandBuffAnimation({
          targetId: targetCard.id,
          type: playerField.effect,
          amount: appliedAmount,
        });
      }
    }

    setBattleLog((currentLog) =>
      [
        ...currentLog,
        appliedAmount > 0
          ? `${playerField.name} uses its ability on ${targetCard.name}.`
          : `${targetCard.name} is already at maximum Health.`,
      ].slice(-6),
    );
    setStatus(
      appliedAmount > 0
        ? `${playerField.name} empowers ${targetCard.name}`
        : `${targetCard.name} is already at maximum Health`,
    );
    setTargetSelection("done");
  };

  useEffect(() => {
    if (!handBuffAnimation) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHandBuffAnimation(null);
    }, 1900);

    return () => window.clearTimeout(timer);
  }, [handBuffAnimation]);

  useEffect(() => {
    if (phase !== "placing" || turn !== "bot" || botField || botHand.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      const card = chooseBotCard(botHand, {
        opponentCard: playerField ?? undefined,
        opponentHandSize: playerHand.length,
        alliedGraveyardSize: botGraveyard.length,
        resurrectionUsed: botElyraAbilityUsed,
        playedSecond: Boolean(playerField),
      });
      setBotHand((currentHand) =>
        currentHand.filter((handCard) => handCard.id !== card.id),
      );
      setBotField(prepareCardForBattle(card));
      setBattleLog((currentLog) =>
        [...currentLog, `${opponent.name} places ${card.name}.`].slice(-6),
      );

      if (playerField) {
        setPhase("combat");
        setStatus("Combat begins");
      } else {
        setTurn("player");
        setStatus("Your turn — choose a card");
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    botElyraAbilityUsed,
    botField,
    botGraveyard.length,
    botHand,
    opponent.name,
    phase,
    playerField,
    playerHand.length,
    turn,
  ]);

  useEffect(() => {
    if (phase !== "combat" || !playerField || !botField) {
      return;
    }

    const activationOrder: Owner[] = round % 2 === 1 ? ["player", "bot"] : ["bot", "player"];
    const orderedCards = activationOrder.map((owner) =>
      owner === "player" ? playerField : botField,
    );
    const abilityMessage = (card: BattleCard) => {
      const owner: Owner = card.id === playerField.id ? "player" : "bot";

      if (blockedAbilityOwner === owner) {
        return `${card.name}'s special ability is blocked`;
      }

      return card.effect === "none"
        ? `${card.name} — no special ability`
        : card.effect === "steal"
          ? `${card.name} searches the opponent's hand`
          : card.effect === "chaos"
            ? `${card.name} tempts fate`
            : card.effect === "weaken"
              ? `${card.name} weakens the opposing card`
              : card.effect === "survivor-curse"
                ? `${card.name} places a lasting curse`
                : card.effect === "resurrect"
                  ? `${card.name} calls to a fallen ally`
                  : card.effect === "second-strength"
                    ? owner === secondCardOwner
                      ? `${card.name} gains +2 Strength`
                      : `${card.name} was not played second`
                    : card.effect === "damage-reduction"
                      ? `${card.name} braces for the incoming strike`
                    : card.effect === "strength-drain"
                      ? `${card.name} drains the opposing card's Strength`
              : card.effect === "area-damage"
                ? `${card.name} scorches the opposing forces`
              : card.effect === "silence"
                ? orderedCards[0].id === card.id
                  ? `${card.name} seals the opposing card's ability`
                  : `${card.name} was not played first`
                : `${card.name} uses: ${card.ability}`;
    };
    const hasTargetedAbility =
      playerField.effect === "health" || playerField.effect === "strength";
    const potentialTargets =
      playerHand.length > 0 ? playerHand : [playerField];
    const playerNeedsTarget =
      blockedAbilityOwner !== "player" &&
      hasTargetedAbility &&
      potentialTargets.some((card) =>
        canReceiveTargetedAbility(playerField, card),
      );
    const playerActsFirst = activationOrder[0] === "player";

    if (playerNeedsTarget && targetSelection === null) {
      const precedingAbilityTimer = playerActsFirst
        ? undefined
        : window.setTimeout(() => setStatus(abilityMessage(botField)), 350);
      const selectionTimer = window.setTimeout(
        () => {
          setStatus(
            playerHand.length > 0
              ? "Select a card from your hand"
              : "Select your active card",
          );
          setTargetSelection("waiting");
        },
        playerActsFirst ? 350 : 1500,
      );

      return () => {
        if (precedingAbilityTimer !== undefined) {
          window.clearTimeout(precedingAbilityTimer);
        }
        window.clearTimeout(selectionTimer);
      };
    }

    if (targetSelection === "waiting") {
      return;
    }

    const playerAbilityHealth = 0;
    const botAbilityHealth =
      blockedAbilityOwner !== "bot" && botHand.length === 0
        ? botField.effect === "health"
          ? getHealthAfterBonus(botField, 2) - botField.currentHealth
          : 0
        : 0;
    const damageToPlayerFromAbility =
      botField.effect === "area-damage" && blockedAbilityOwner !== "bot" ? 1 : 0;
    const damageToBotFromAbility =
      playerField.effect === "area-damage" && blockedAbilityOwner !== "player"
        ? 1
        : 0;
    const playerStrengthWithSecondBonus =
      playerField.currentStrength + playerSecondStrengthBonus;
    const botStrengthWithSecondBonus =
      botField.currentStrength + botSecondStrengthBonus;
    const playerDrainAmount =
      playerField.effect === "strength-drain" &&
      blockedAbilityOwner !== "player"
        ? getStrengthDrainAmount(botStrengthWithSecondBonus)
        : 0;
    const botDrainAmount =
      botField.effect === "strength-drain" && blockedAbilityOwner !== "bot"
        ? getStrengthDrainAmount(playerStrengthWithSecondBonus)
        : 0;
    const playerStrengthAfterDrain =
      playerStrengthWithSecondBonus + playerDrainAmount - botDrainAmount;
    const botStrengthAfterDrain =
      botStrengthWithSecondBonus + botDrainAmount - playerDrainAmount;
    const playerCombatStrength =
      botField.effect === "weaken" && blockedAbilityOwner !== "bot"
        ? getStrengthAfterWeaken(playerStrengthAfterDrain)
        : playerStrengthAfterDrain;
    const botCombatStrength =
      playerField.effect === "weaken" && blockedAbilityOwner !== "player"
        ? getStrengthAfterWeaken(botStrengthAfterDrain)
        : botStrengthAfterDrain;
    const normalDamageToPlayer = getNormalCombatDamage(
      botCombatStrength,
      playerField,
      blockedAbilityOwner === "player",
    );
    const normalDamageToBot = getNormalCombatDamage(
      playerCombatStrength,
      botField,
      blockedAbilityOwner === "bot",
    );
    const abilityTimers: number[] = [];
    let damageDelay = 2650;

    if (playerNeedsTarget && targetSelection === "done") {
      if (playerActsFirst) {
        abilityTimers.push(
          window.setTimeout(() => setStatus(abilityMessage(botField)), 1150),
        );
        damageDelay = 2300;
      } else {
        damageDelay = 1150;
      }
    } else {
      abilityTimers.push(
        window.setTimeout(() => setStatus(abilityMessage(orderedCards[0])), 350),
        window.setTimeout(() => setStatus(abilityMessage(orderedCards[1])), 1500),
      );
    }

    const damageTimer = window.setTimeout(() => {
      setStatus("Both cards strike simultaneously");
      setIsAttacking(true);
    }, damageDelay);

    const impactTimer = window.setTimeout(() => {
      setIsAttacking(false);
      setShowImpact(true);
      setDamagePreview({
        playerHealth: Math.max(
          0,
          playerField.currentHealth +
            playerAbilityHealth -
            damageToPlayerFromAbility -
            normalDamageToPlayer,
        ),
        botHealth: Math.max(
          0,
          botField.currentHealth +
            botAbilityHealth -
            damageToBotFromAbility -
            normalDamageToBot,
        ),
        playerDamage: normalDamageToPlayer,
        botDamage: normalDamageToBot,
      });
    }, damageDelay + 620);

    const impactClearTimer = window.setTimeout(() => {
      setShowImpact(false);
    }, damageDelay + 1320);

    const resolutionTimer = window.setTimeout(() => {
      let activePlayerCard = { ...playerField };
      let activeBotCard = { ...botField };
      let activePlayerHand = [...playerHand];
      let activeBotHand = [...botHand];
      let activePlayerGraveyard = [...playerGraveyard];
      let activeBotGraveyard = [...botGraveyard];
      let activePlayerElyraAbilityUsed = playerElyraAbilityUsed;
      let activeBotElyraAbilityUsed = botElyraAbilityUsed;
      let activeBotDefeatCount = botDefeatCount;
      let activeOpponentPassiveUsed = opponentPassiveUsed;
      const combatMessages: string[] = [];
      let resolvedHandBuff: AbilityBuff | undefined;

      activationOrder.forEach((owner) => {
        if (owner === "player") {
          if (blockedAbilityOwner === "player") {
            combatMessages.push(
              `${activePlayerCard.name}'s special ability is blocked by Foyer.`,
            );
          } else if (activePlayerCard.effect === "silence") {
            combatMessages.push(
              activationOrder[0] === "player"
                ? `${activePlayerCard.name} blocks ${activeBotCard.name}'s special ability.`
                : `${activePlayerCard.name} was not played first, so its ability does not activate.`,
            );
          } else if (playerNeedsTarget && targetSelection === "done") {
            combatMessages.push(`${activePlayerCard.name}'s targeted ability resolves.`);
          } else {
            const activation = activateAbility(
              activePlayerCard,
              activePlayerHand,
              activeBotHand,
              Math.random,
              activeBotCard,
              activePlayerGraveyard,
              activePlayerElyraAbilityUsed,
              secondCardOwner === "player",
            );
            activePlayerCard = activation.card;
            activePlayerHand = activation.hand;
            activeBotHand = activation.opponentHand ?? activeBotHand;
            activeBotCard = activation.opponentCard ?? activeBotCard;
            activePlayerGraveyard =
              activation.graveyard ?? activePlayerGraveyard;
            activePlayerGraveyard.push(
              ...(activation.defeatedAlliedCards ?? []),
            );
            const defeatedBotCards = activation.defeatedOpponentCards ?? [];
            activeBotGraveyard.push(...defeatedBotCards);
            activeBotDefeatCount += defeatedBotCards.length;
            activePlayerElyraAbilityUsed =
              activePlayerElyraAbilityUsed || Boolean(activation.abilityUsed);
            combatMessages.push(activation.message);
            resolvedHandBuff = activation.buff;
          }
        } else if (blockedAbilityOwner === "bot") {
          combatMessages.push(
            `${activeBotCard.name}'s special ability is blocked by Foyer.`,
          );
        } else if (activeBotCard.effect === "silence") {
          combatMessages.push(
            activationOrder[0] === "bot"
              ? `${activeBotCard.name} blocks ${activePlayerCard.name}'s special ability.`
              : `${activeBotCard.name} was not played first, so its ability does not activate.`,
          );
        } else {
          const activation = activateAbility(
            activeBotCard,
            activeBotHand,
            activePlayerHand,
            Math.random,
            activePlayerCard,
            activeBotGraveyard,
            activeBotElyraAbilityUsed,
            secondCardOwner === "bot",
          );
          activeBotCard = activation.card;
          activeBotHand = activation.hand;
          activePlayerHand = activation.opponentHand ?? activePlayerHand;
          activePlayerCard = activation.opponentCard ?? activePlayerCard;
          activeBotGraveyard = activation.graveyard ?? activeBotGraveyard;
          const defeatedBotCards = activation.defeatedAlliedCards ?? [];
          activeBotGraveyard.push(...defeatedBotCards);
          activeBotDefeatCount += defeatedBotCards.length;
          activePlayerGraveyard.push(
            ...(activation.defeatedOpponentCards ?? []),
          );
          activeBotElyraAbilityUsed =
            activeBotElyraAbilityUsed || Boolean(activation.abilityUsed);
          combatMessages.push(activation.message);
        }
      });

      const damageToPlayer = getNormalCombatDamage(
        activeBotCard.currentStrength,
        activePlayerCard,
        blockedAbilityOwner === "player",
      );
      const damageToBot = getNormalCombatDamage(
        activePlayerCard.currentStrength,
        activeBotCard,
        blockedAbilityOwner === "bot",
      );
      activePlayerCard.currentHealth -= damageToPlayer;
      activeBotCard.currentHealth -= damageToBot;
      combatMessages.push(
        `${activePlayerCard.name} and ${activeBotCard.name} deal ${damageToBot} and ${damageToPlayer} damage.`,
      );

      let returningPlayerCard = prepareSurvivor(activePlayerCard);
      let returningBotCard = prepareSurvivor(activeBotCard);
      const playerCurseActivates =
        activePlayerCard.effect === "survivor-curse" &&
        activePlayerCard.currentHealth > 0 &&
        blockedAbilityOwner !== "player";
      const botCurseActivates =
        activeBotCard.effect === "survivor-curse" &&
        activeBotCard.currentHealth > 0 &&
        blockedAbilityOwner !== "bot";

      if (playerCurseActivates && activeBotCard.currentHealth > 0) {
        const previousStrength = returningBotCard.currentStrength;
        returningBotCard = applyPermanentStrengthLoss(returningBotCard);
        const lostStrength = previousStrength - returningBotCard.currentStrength;
        combatMessages.push(
          lostStrength > 0
            ? `${activePlayerCard.name}'s curse permanently reduces ${activeBotCard.name}'s Strength by ${lostStrength}.`
            : `${activeBotCard.name}'s Strength cannot be reduced below 1.`,
        );
      }

      if (botCurseActivates && activePlayerCard.currentHealth > 0) {
        const previousStrength = returningPlayerCard.currentStrength;
        returningPlayerCard = applyPermanentStrengthLoss(returningPlayerCard);
        const lostStrength =
          previousStrength - returningPlayerCard.currentStrength;
        combatMessages.push(
          lostStrength > 0
            ? `${activeBotCard.name}'s curse permanently reduces ${activePlayerCard.name}'s Strength by ${lostStrength}.`
            : `${activePlayerCard.name}'s Strength cannot be reduced below 1.`,
        );
      }

      if (activePlayerCard.effect === "steal") {
        combatMessages.push(
          `${activePlayerCard.name} disappears after the battle.`,
        );
      } else if (activePlayerCard.currentHealth > 0) {
        activePlayerHand.push(returningPlayerCard);
        combatMessages.push(
          `${activePlayerCard.name} returns to your hand with ${activePlayerCard.currentHealth} HP.`,
        );
      } else {
        activePlayerGraveyard.push(returningPlayerCard);
        combatMessages.push(`${activePlayerCard.name} is defeated.`);
      }

      if (activeBotCard.effect === "steal") {
        combatMessages.push(
          `${activeBotCard.name} disappears after the battle.`,
        );
      } else if (activeBotCard.currentHealth > 0) {
        activeBotHand.push(returningBotCard);
        combatMessages.push(
          `${activeBotCard.name} returns to the opponent's hand with ${activeBotCard.currentHealth} HP.`,
        );
      } else {
        activeBotGraveyard.push(returningBotCard);
        activeBotDefeatCount += 1;
        combatMessages.push(`${activeBotCard.name} is defeated.`);
      }

      if (
        opponent.passive.effect === "dark-revival" &&
        !activeOpponentPassiveUsed &&
        activeBotDefeatCount >= 3 &&
        activeBotGraveyard.length > 0
      ) {
        const weakestCard = activeBotGraveyard.reduce((weakest, card) => {
          if (card.currentStrength !== weakest.currentStrength) {
            return card.currentStrength < weakest.currentStrength
              ? card
              : weakest;
          }

          return card.health < weakest.health ? card : weakest;
        });
        const revivedCard = prepareResurrectedCard(weakestCard);
        activeBotGraveyard = activeBotGraveyard.filter(
          (card) => card.id !== weakestCard.id,
        );
        activeBotHand.push(revivedCard);
        activeOpponentPassiveUsed = true;
        combatMessages.push(
          `${opponent.passive.name}: ${opponent.name} returns ${revivedCard.name} with 1 Health.`,
        );
      }

      const cardsEliminated =
        activePlayerHand.length === 0 || activeBotHand.length === 0;
      const roundLimitReached = round >= MAX_ROUNDS;

      if (roundLimitReached && !cardsEliminated) {
        combatMessages.push(
          `The ${MAX_ROUNDS}-round limit is reached. Remaining cards and Health decide the battle.`,
        );
      }

      setPlayerHand(activePlayerHand);
      setBotHand(activeBotHand);
      setPlayerGraveyard(activePlayerGraveyard);
      setBotGraveyard(activeBotGraveyard);
      setPlayerElyraAbilityUsed(activePlayerElyraAbilityUsed);
      setBotElyraAbilityUsed(activeBotElyraAbilityUsed);
      setBotDefeatCount(activeBotDefeatCount);
      setOpponentPassiveUsed(activeOpponentPassiveUsed);
      if (resolvedHandBuff) {
        setHandBuffAnimation(resolvedHandBuff);
      }
      setPlayerField(null);
      setBotField(null);
      setIsAttacking(false);
      setShowImpact(false);
      setDamagePreview(null);
      setTargetSelection(null);
      setBattleLog((currentLog) => [...currentLog, ...combatMessages].slice(-6));

      if (cardsEliminated || roundLimitReached) {
        const battleResult = determineBattleResult(
          activePlayerHand,
          activeBotHand,
        );
        setResult(battleResult);
        setStatus(battleResult);
        setPhase("finished");
        return;
      }

      const nextRound = round + 1;
      const nextTurn: Owner = nextRound % 2 === 1 ? "player" : "bot";
      setRound(nextRound);
      setTurn(nextTurn);
      setPhase("placing");
      setStatus(
        nextTurn === "player"
          ? "Your turn — choose a card"
          : `${opponent.name} goes first`,
      );
    }, damageDelay + 2900);

    return () => {
      abilityTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(damageTimer);
      window.clearTimeout(impactTimer);
      window.clearTimeout(impactClearTimer);
      window.clearTimeout(resolutionTimer);
    };
  }, [
    blockedAbilityOwner,
    botField,
    botGraveyard,
    botHand,
    botElyraAbilityUsed,
    botDefeatCount,
    botSecondStrengthBonus,
    opponent.name,
    opponent.passive.effect,
    opponent.passive.name,
    opponentPassiveUsed,
    phase,
    playerField,
    playerGraveyard,
    playerHand,
    playerElyraAbilityUsed,
    playerSecondStrengthBonus,
    round,
    secondCardOwner,
    targetSelection,
  ]);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="battle-card-placement">
      <main className="battle-screen">
      <AnimatePresence>
        {showOpponentIntro && (
          <motion.section
            className="opponent-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            role="status"
            aria-label={`Level ${level}. Your opponent is ${opponent.name}.`}
          >
            <motion.div
              className="opponent-intro__content"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, scale: 1.025 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.span
                className="opponent-intro__level"
                initial={{ opacity: 0, letterSpacing: "0.55em" }}
                animate={{ opacity: 1, letterSpacing: "0.34em" }}
                transition={{ delay: 0.18, duration: 0.65 }}
              >
                Level {level}
              </motion.span>
              <motion.div
                className="opponent-intro__portrait"
                initial={{ opacity: 0, scale: 0.72, filter: "brightness(0.45)" }}
                animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
                transition={{
                  delay: 0.12,
                  duration: 0.82,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <img src={opponent.image} alt={opponent.name} />
              </motion.div>
              <div className="opponent-intro__identity">
                <span>Your Opponent</span>
                <h2>{opponent.name}</h2>
              </div>
              {opponent.passive.effect !== "none" && (
                <div className="opponent-intro__passive">
                  <span>Passive Ability</span>
                  <strong>{opponent.passive.name}</strong>
                  <small>{opponent.passive.description}</small>
                </div>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {placementPreview && (
          <motion.div
            className="card-selection-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />
        )}
      </AnimatePresence>

      {placementPreview && (
        <motion.div
          className="card-selection-preview"
          layoutId={`battle-card-${placementPreview.id}`}
          initial={{ opacity: 0, scale: 0.58, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            opacity: { duration: 0.22 },
            scale: { type: "spring", stiffness: 230, damping: 20 },
            y: { type: "spring", stiffness: 230, damping: 20 },
            layout: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          <BattleCardView card={placementPreview} field owner="player" />
        </motion.div>
      )}

      <section className="battle-board" aria-labelledby="level-title">
        <header className="battle-header">
          <div>
            <span>{opponent.location}</span>
            <h1 id="level-title">Level {level}</h1>
          </div>
          <div className="battle-objective">
            <span>Objective</span>
            <strong>Defeat all opponent cards</strong>
            <small>Health bonus cap +5</small>
          </div>
          <div className="round-indicator">
            <span>Round</span>
            <strong>{round}/{MAX_ROUNDS}</strong>
          </div>
        </header>

        <section
          className="opponent-area"
          aria-label={`${opponent.name}'s hand`}
        >
          <div className="opponent-portrait" aria-hidden="true">
            <img src={opponent.image} alt="" />
          </div>
          <div className="battle-zone-label">
            <span>{opponent.name}</span>
            <strong>{botHand.length} cards</strong>
          </div>
          {opponent.passive.effect !== "none" && (
            <div
              className={`opponent-passive${opponentPassiveUsed ? " opponent-passive--used" : ""}`}
            >
              <span>Passive · {opponent.passive.name}</span>
              <small>{opponent.passive.description}</small>
            </div>
          )}
          <div className="opponent-hand">
            {botHand.map((card) => <span className="card-back" key={card.id} />)}
          </div>
        </section>

        <section
          className={`battlefield${showImpact ? " battlefield--impact" : ""}`}
          aria-label="Battlefield"
        >
          <AnimatePresence>
            {showImpact && (
              <motion.div
                className="combat-impact"
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: [0, 1, 0.65, 0], scale: [0.65, 1.12, 1, 1.18] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.68, times: [0, 0.16, 0.58, 1] }}
                aria-hidden="true"
              >
                <motion.span
                  className="combat-impact__slash"
                  initial={{ scaleX: 0, rotate: -32 }}
                  animate={{ scaleX: [0, 1.18, 0.82], rotate: [-32, -24, -20] }}
                  transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                />
                <span className="combat-impact__burst">
                  {Array.from({ length: 10 }, (_, particleIndex) => {
                    const angle = (Math.PI * 2 * particleIndex) / 10;
                    return (
                      <motion.span
                        className="combat-impact__particle"
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{
                          x: Math.cos(angle) * 72,
                          y: Math.sin(angle) * 52,
                          opacity: 0,
                          scale: 0.2,
                        }}
                        transition={{ duration: 0.62, ease: "easeOut" }}
                        key={particleIndex}
                      />
                    );
                  })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="field-position">
            {playerField ? (
              <motion.div
                className="battle-card-motion"
                layoutId={`battle-card-${playerField.id}`}
                animate={
                  isAttacking
                    ? { x: [0, 18, 54], rotate: [0, -1.2, 1.4], scale: [1, 1.025, 1.055] }
                    : damagePreview &&
                        (damagePreview.playerHealth === 0 ||
                          playerField.effect === "steal")
                      ? {
                          x: 0,
                          y: [0, 5, 18],
                          rotate: [0, -2, -7],
                          scale: [1, 0.94, 0.68],
                          opacity: [1, 0.82, 0],
                          filter: ["brightness(1)", "brightness(0.55)", "brightness(0.15)"],
                        }
                      : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, filter: "brightness(1)" }
                }
                transition={
                  isAttacking
                    ? { duration: 0.62, times: [0, 0.45, 1], ease: [0.4, 0, 0.2, 1] }
                    : damagePreview &&
                        (damagePreview.playerHealth === 0 ||
                          playerField.effect === "steal")
                      ? { duration: 1.5, times: [0, 0.38, 1], ease: [0.4, 0, 0.6, 1] }
                      : {
                          x: { type: "spring", stiffness: 145, damping: 17 },
                          layout: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
                        }
                }
              >
                <BattleCardView
                  card={playerField}
                  field
                  owner="player"
                  disabled={
                    targetSelection !== "waiting" ||
                    playerHand.length > 0 ||
                    !canReceiveTargetedAbility(playerField, playerField)
                  }
                  onClick={() => selectAbilityTarget(playerField)}
                  targetable={
                    targetSelection === "waiting" &&
                    playerHand.length === 0 &&
                    canReceiveTargetedAbility(playerField, playerField)
                  }
                  invalidTarget={
                    targetSelection === "waiting" &&
                    (playerHand.length > 0 ||
                      !canReceiveTargetedAbility(playerField, playerField))
                  }
                  displayedStrength={playerDisplayedStrength}
                  damage={damagePreview?.playerDamage}
                  displayedHealth={damagePreview?.playerHealth}
                />
                <AnimatePresence>
                  {damagePreview && (
                    <motion.span
                      className="field-damage-number"
                      initial={{ opacity: 0, y: 8, scale: 0.72 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [8, -8, -25, -38],
                        scale: [0.72, 1.18, 1, 0.94],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, times: [0, 0.16, 0.72, 1] }}
                    >
                      -{damagePreview.playerDamage} HP
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="field-placeholder field-placeholder--player"><span>You</span></div>
            )}
          </div>

          <div className="battle-status" aria-live="polite">
            <span>
              {phase === "combat"
                ? targetSelection === "waiting"
                  ? "Target selection"
                  : status.includes("strike")
                    ? "Damage phase"
                    : "Ability phase"
                : phase === "finished"
                  ? "Battle complete"
                  : "Placement phase"}
            </span>
            <strong key={status}>{status}</strong>
          </div>

          <div className="field-position">
            {botField ? (
              <motion.div
                className="battle-card-motion"
                animate={
                  isAttacking
                    ? { x: [0, -18, -54], rotate: [0, 1.2, -1.4], scale: [1, 1.025, 1.055] }
                    : damagePreview &&
                        (damagePreview.botHealth === 0 ||
                          botField.effect === "steal")
                      ? {
                          x: 0,
                          y: [0, 5, 18],
                          rotate: [0, 2, 7],
                          scale: [1, 0.94, 0.68],
                          opacity: [1, 0.82, 0],
                          filter: ["brightness(1)", "brightness(0.55)", "brightness(0.15)"],
                        }
                      : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, filter: "brightness(1)" }
                }
                transition={
                  isAttacking
                    ? { duration: 0.62, times: [0, 0.45, 1], ease: [0.4, 0, 0.2, 1] }
                    : damagePreview &&
                        (damagePreview.botHealth === 0 ||
                          botField.effect === "steal")
                      ? { duration: 1.5, times: [0, 0.38, 1], ease: [0.4, 0, 0.6, 1] }
                      : { x: { type: "spring", stiffness: 145, damping: 17 } }
                }
              >
                <BattleCardView
                  card={botField}
                  field
                  owner="bot"
                  invalidTarget={targetSelection === "waiting"}
                  displayedStrength={botDisplayedStrength}
                  damage={damagePreview?.botDamage}
                  displayedHealth={damagePreview?.botHealth}
                />
                <AnimatePresence>
                  {damagePreview && (
                    <motion.span
                      className="field-damage-number"
                      initial={{ opacity: 0, y: 8, scale: 0.72 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [8, -8, -25, -38],
                        scale: [0.72, 1.18, 1, 0.94],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, times: [0, 0.16, 0.72, 1] }}
                    >
                      -{damagePreview.botDamage} HP
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="field-placeholder field-placeholder--bot">
                <span>{opponent.name}</span>
              </div>
            )}
          </div>
        </section>

        <section className="player-area" aria-label="Your hand">
          <div className="battle-zone-label">
            <span>Your Hand</span>
            <strong>{playerHand.length} cards</strong>
          </div>
          <div className="player-hand">
            {playerHand.map((card) => {
              const activeBuff =
                handBuffAnimation?.targetId === card.id ? handBuffAnimation : null;
              const canReceiveAbility =
                !playerField || canReceiveTargetedAbility(playerField, card);

              return (
                <motion.div
                  className={`hand-card-motion${activeBuff ? ` hand-card-motion--${activeBuff.type}` : ""}`}
                  animate={
                    activeBuff
                      ? activeBuff.type === "health"
                        ? {
                            scale: [1, 1.085, 1.035, 1],
                            y: [0, -5, -2, 0],
                            filter: [
                              "drop-shadow(0 0 0 rgba(66, 217, 145, 0))",
                              "drop-shadow(0 0 22px rgba(66, 217, 145, 0.82))",
                              "drop-shadow(0 0 12px rgba(66, 217, 145, 0.42))",
                              "drop-shadow(0 0 0 rgba(66, 217, 145, 0))",
                            ],
                          }
                        : {
                            scale: [1, 1.09, 1.04, 1],
                            y: [0, -5, -2, 0],
                            rotate: [0, -1, 0.7, 0],
                            filter: [
                              "drop-shadow(0 0 0 rgba(99, 151, 255, 0))",
                              "drop-shadow(0 0 24px rgba(99, 151, 255, 0.86))",
                              "drop-shadow(0 0 13px rgba(99, 151, 255, 0.46))",
                              "drop-shadow(0 0 0 rgba(99, 151, 255, 0))",
                            ],
                          }
                      : { scale: 1, y: 0, rotate: 0, filter: "none" }
                  }
                  transition={{
                    duration: 1.45,
                    times: [0, 0.24, 0.68, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  key={card.id}
                >
                  <BattleCardView
                    card={card}
                    disabled={
                      targetSelection === "waiting"
                        ? !canReceiveAbility
                        : phase !== "placing" ||
                          turn !== "player" ||
                          Boolean(playerField) ||
                          Boolean(placementPreview) ||
                          isPlayerCardLanding
                    }
                    targetable={
                      targetSelection === "waiting" && canReceiveAbility
                    }
                    invalidTarget={
                      targetSelection === "waiting" && !canReceiveAbility
                    }
                    onClick={() =>
                      targetSelection === "waiting"
                        ? selectAbilityTarget(card)
                        : placePlayerCard(card)
                    }
                  />

                  <AnimatePresence>
                    {activeBuff && (
                      <motion.span
                        className={`hand-buff-value hand-buff-value--${activeBuff.type}`}
                        initial={{ opacity: 0, y: 5, scale: 0.76 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: [5, -12, -30, -46],
                          scale: [0.76, 1.12, 1, 0.94],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.75, times: [0, 0.18, 0.72, 1] }}
                      >
                        +{activeBuff.amount}{" "}
                        {activeBuff.type === "health" ? "Health" : "Strength"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        <aside className="battle-log" aria-label="Battle log">
          <span>Battle Log</span>
          <ol>
            {battleLog.map((message, messageIndex) => (
              <li key={`${message}-${messageIndex}`}>{message}</li>
            ))}
          </ol>
          {result && <strong className="battle-result">{result}</strong>}
        </aside>
      </section>
      </main>
      </LayoutGroup>
    </MotionConfig>
  );
}
