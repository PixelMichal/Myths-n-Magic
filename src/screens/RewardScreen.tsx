import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BattleCardView } from "../components/cards/BattleCardView";
import { replaceDeckCard } from "../game/battleLogic";
import type { BattleCard, CardDefinition } from "../game/types";

type RewardScreenProps = {
  deck: CardDefinition[];
  rewards: CardDefinition[];
  completedLevel: 1 | 2;
  nextOpponentName?: string;
  onComplete: (updatedDeck: CardDefinition[]) => void;
};

const createPreviewCard = (
  card: CardDefinition,
  id: string,
): BattleCard => ({
  ...card,
  id,
  currentStrength: card.strength,
  currentHealth: card.health,
  temporaryStrengthBonus: 0,
  temporaryStrengthPenalty: 0,
  nextBattleStrengthBonus: 0,
});

export function RewardScreen({
  deck,
  rewards,
  completedLevel,
  nextOpponentName,
  onComplete,
}: RewardScreenProps) {
  const [selectedReward, setSelectedReward] = useState<CardDefinition | null>(
    null,
  );
  const rewardPreviews = useMemo(
    () =>
      rewards.map((card, index) =>
        createPreviewCard(card, `reward-${card.name}-${index}`),
      ),
    [rewards],
  );
  const deckPreviews = useMemo(
    () =>
      deck.map((card, index) =>
        createPreviewCard(card, `replacement-${card.name}-${index}`),
      ),
    [deck],
  );

  const replaceCard = (replacementIndex: number) => {
    if (!selectedReward) {
      return;
    }

    onComplete(replaceDeckCard(deck, replacementIndex, selectedReward));
  };

  return (
    <main className="reward-screen">
      <motion.section
        className="reward-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="reward-title"
      >
        <header className="reward-header">
          <span>Level {completedLevel} Complete</span>
          <h1 id="reward-title">
            {selectedReward ? "Replace a Card" : "Choose Your Reward"}
          </h1>
          <p>
            {selectedReward
              ? `Select one card from your deck to replace with ${selectedReward.name}.`
              : nextOpponentName
                ? `Choose one powerful card before facing ${nextOpponentName}.`
                : "Choose one powerful card as your victory reward."}
          </p>
        </header>

        {!selectedReward ? (
          <div className="reward-selection">
            <div className="reward-choices" aria-label="Reward cards">
              {rewardPreviews.map((card, index) => (
                <motion.div
                  className="reward-card"
                  initial={{ opacity: 0, y: 24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.18 + index * 0.12,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  key={card.id}
                >
                  <BattleCardView
                    card={card}
                    disabled={false}
                    onClick={() => setSelectedReward(rewards[index])}
                  />
                </motion.div>
              ))}
            </div>

            <button
              className="skip-reward-button"
              type="button"
              onClick={() => onComplete(deck)}
            >
              <span>Keep Current Deck</span>
              Skip Reward
            </button>
          </div>
        ) : (
          <div className="replacement-step">
            <div className="chosen-reward" aria-label="Chosen reward">
              <span>New Card</span>
              <BattleCardView
                card={createPreviewCard(
                  selectedReward,
                  `chosen-${selectedReward.name}`,
                )}
              />
            </div>

            <div className="replacement-arrow" aria-hidden="true">
              replaces
            </div>

            <div className="replacement-deck" aria-label="Your current deck">
              {deckPreviews.map((card, index) => (
                <motion.div
                  className="replacement-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.4 }}
                  key={card.id}
                >
                  <BattleCardView
                    card={card}
                    disabled={false}
                    onClick={() => replaceCard(index)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}
