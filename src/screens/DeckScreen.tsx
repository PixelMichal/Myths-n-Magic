import { AbilityText } from "../components/cards/AbilityText";
import { cards, DECK_SIZE } from "../data/cards";

type DeckScreenProps = {
  selectedCards: number[];
  onToggleCard: (cardIndex: number) => void;
  onConfirm: () => void;
};

export function DeckScreen({
  selectedCards,
  onToggleCard,
  onConfirm,
}: DeckScreenProps) {
  return (
    <main className="deck-screen">
      <section className="deck-builder" aria-labelledby="deck-title">
        <header className="deck-builder__header">
          <span className="deck-builder__eyebrow">Prepare for the journey</span>
          <h1 id="deck-title">Choose Your Deck</h1>
          <p>Select exactly {DECK_SIZE} cards to continue</p>
        </header>

        <div className="card-grid" aria-label="Deck card slots">
          {Array.from({ length: DECK_SIZE }, (_, cardIndex) => {
            const card = cards[cardIndex];
            const isSelected = selectedCards.includes(cardIndex);

            if (!card) {
              return (
                <button
                  className="card-slot card-slot--empty"
                  type="button"
                  aria-label={`Empty card slot ${cardIndex + 1}`}
                  disabled
                  key={cardIndex}
                />
              );
            }

            return (
              <button
                className={`card-slot card-slot--card${isSelected ? " card-slot--selected" : ""}`}
                type="button"
                aria-label={`${card.name}. Strength ${card.strength}. Health ${card.health}.${card.ability !== "None" ? ` Special Ability: ${card.ability}.` : ""}`}
                aria-pressed={isSelected}
                onClick={() => onToggleCard(cardIndex)}
                key={cardIndex}
              >
                <img src={card.image} alt="" />
                <span className="card-name">{card.name}</span>

                <span className="card-details" aria-hidden="true">
                  <span className="card-details__title">{card.name}</span>
                  <span className="card-details__divider" />
                  <span className="card-stat">
                    <span>Strength</span>
                    <strong>{card.strength}</strong>
                  </span>
                  <span className="card-stat">
                    <span>Health</span>
                    <strong>{card.health}</strong>
                  </span>
                  {card.ability !== "None" && (
                    <span className="card-ability">
                      <span>Special Ability</span>
                      <strong
                        className={
                          card.ability.length > 25
                            ? "card-ability__text--long"
                            : ""
                        }
                      >
                        <AbilityText ability={card.ability} />
                      </strong>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="deck-builder__footer">
          <div className="deck-counter" aria-live="polite">
            <span>Cards selected</span>
            <strong>{selectedCards.length}/{DECK_SIZE}</strong>
          </div>

          <button
            className="confirm-button"
            type="button"
            disabled={selectedCards.length !== DECK_SIZE}
            onClick={onConfirm}
          >
            Confirm Deck
          </button>
        </footer>
      </section>
    </main>
  );
}
