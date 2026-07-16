import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, MotionConfig } from "motion/react";
import { BattleCardView } from "../components/cards/BattleCardView";
import { cards } from "../data/cards";
import {
  activateAbility,
  createHand,
  determineBattleResult,
  getBlockedAbilityOwner,
  getHealthAfterBonus,
  getStrengthAfterWeaken,
  MAX_ROUNDS,
  prepareCardForBattle,
  prepareSurvivor,
} from "../game/battleLogic";
import type { AbilityBuff } from "../game/battleLogic";
import type {
  BattleCard,
  BattlePhase,
  CardDefinition,
  Owner,
} from "../game/types";

const canReceiveTargetedAbility = (
  sourceCard: BattleCard,
  targetCard: BattleCard,
) =>
  sourceCard.effect !== "health" ||
  getHealthAfterBonus(targetCard, 2) > targetCard.currentHealth;

export function BattleScreen({ playerDeck }: { playerDeck: CardDefinition[] }) {
  const [playerHand, setPlayerHand] = useState(() => createHand(playerDeck, "player"));
  const [botHand, setBotHand] = useState(() =>
    createHand(cards, "bot"),
  );
  const [playerField, setPlayerField] = useState<BattleCard | null>(null);
  const [botField, setBotField] = useState<BattleCard | null>(null);
  const [turn, setTurn] = useState<Owner>("player");
  const [phase, setPhase] = useState<BattlePhase>("placing");
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState("Your turn — choose a card");
  const [battleLog, setBattleLog] = useState<string[]>(["Both players draw 5 cards."]);
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
        setStatus("The opponent is choosing a card");
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [botField, isPlayerCardLanding, playerField]);

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
      const card = botHand[Math.floor(Math.random() * botHand.length)];
      setBotHand((currentHand) =>
        currentHand.filter((handCard) => handCard.id !== card.id),
      );
      setBotField(prepareCardForBattle(card));
      setBattleLog((currentLog) =>
        [...currentLog, `The opponent places ${card.name}.`].slice(-6),
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
  }, [botField, botHand, phase, playerField, turn]);

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

    const playerAbilityHealth =
      blockedAbilityOwner !== "player" &&
      playerField.effect === "random-health" &&
      playerHand.length === 0
        ? getHealthAfterBonus(playerField, 3) - playerField.currentHealth
        : 0;
    const botAbilityHealth =
      blockedAbilityOwner !== "bot" && botHand.length === 0
        ? botField.effect === "health"
          ? getHealthAfterBonus(botField, 2) - botField.currentHealth
          : botField.effect === "random-health"
            ? getHealthAfterBonus(botField, 3) - botField.currentHealth
            : 0
        : 0;
    const damageToPlayerFromAbility =
      botField.effect === "area-damage" && blockedAbilityOwner !== "bot" ? 1 : 0;
    const damageToBotFromAbility =
      playerField.effect === "area-damage" && blockedAbilityOwner !== "player"
        ? 1
        : 0;
    const playerCombatStrength =
      botField.effect === "weaken" && blockedAbilityOwner !== "bot"
        ? getStrengthAfterWeaken(playerField.currentStrength)
        : playerField.currentStrength;
    const botCombatStrength =
      playerField.effect === "weaken" && blockedAbilityOwner !== "player"
        ? getStrengthAfterWeaken(botField.currentStrength)
        : botField.currentStrength;
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
            botCombatStrength,
        ),
        botHealth: Math.max(
          0,
          botField.currentHealth +
            botAbilityHealth -
            damageToBotFromAbility -
            playerCombatStrength,
        ),
        playerDamage: botCombatStrength,
        botDamage: playerCombatStrength,
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
            );
            activePlayerCard = activation.card;
            activePlayerHand = activation.hand;
            activeBotHand = activation.opponentHand ?? activeBotHand;
            activeBotCard = activation.opponentCard ?? activeBotCard;
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
          );
          activeBotCard = activation.card;
          activeBotHand = activation.hand;
          activePlayerHand = activation.opponentHand ?? activePlayerHand;
          activePlayerCard = activation.opponentCard ?? activePlayerCard;
          combatMessages.push(activation.message);
        }
      });

      const damageToPlayer = activeBotCard.currentStrength;
      const damageToBot = activePlayerCard.currentStrength;
      activePlayerCard.currentHealth -= damageToPlayer;
      activeBotCard.currentHealth -= damageToBot;
      combatMessages.push(
        `${activePlayerCard.name} and ${activeBotCard.name} deal ${damageToBot} and ${damageToPlayer} damage.`,
      );

      if (activePlayerCard.effect === "steal") {
        combatMessages.push(
          `${activePlayerCard.name} disappears after the battle.`,
        );
      } else if (activePlayerCard.currentHealth > 0) {
        activePlayerHand.push(prepareSurvivor(activePlayerCard));
        combatMessages.push(
          `${activePlayerCard.name} returns to your hand with ${activePlayerCard.currentHealth} HP.`,
        );
      } else {
        combatMessages.push(`${activePlayerCard.name} is defeated.`);
      }

      if (activeBotCard.effect === "steal") {
        combatMessages.push(
          `${activeBotCard.name} disappears after the battle.`,
        );
      } else if (activeBotCard.currentHealth > 0) {
        activeBotHand.push(prepareSurvivor(activeBotCard));
        combatMessages.push(
          `${activeBotCard.name} returns to the opponent's hand with ${activeBotCard.currentHealth} HP.`,
        );
      } else {
        combatMessages.push(`${activeBotCard.name} is defeated.`);
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
        nextTurn === "player" ? "Your turn — choose a card" : "The opponent goes first",
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
    botHand,
    phase,
    playerField,
    playerHand,
    round,
    targetSelection,
  ]);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="battle-card-placement">
      <main className="battle-screen">
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
            <span>Darkwood Passage</span>
            <h1 id="level-title">Level 1</h1>
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

        <section className="opponent-area" aria-label="Opponent hand">
          <div className="battle-zone-label">
            <span>Ramon</span>
            <strong>{botHand.length} cards</strong>
          </div>
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
                  displayedStrength={
                    botField?.effect === "weaken" &&
                    blockedAbilityOwner !== "bot"
                      ? getStrengthAfterWeaken(playerField.currentStrength)
                      : undefined
                  }
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
                  displayedStrength={
                    playerField?.effect === "weaken" &&
                    blockedAbilityOwner !== "player"
                      ? getStrengthAfterWeaken(botField.currentStrength)
                      : undefined
                  }
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
              <div className="field-placeholder field-placeholder--bot"><span>Opponent</span></div>
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
