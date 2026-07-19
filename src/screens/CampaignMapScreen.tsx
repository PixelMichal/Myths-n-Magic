import { useEffect, useState } from "react";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import { opponents } from "../data/opponents";

type CampaignMapScreenProps = {
  destinationLevel: 2 | 3;
  onContinue: () => void;
};

const campaignLevels = [1, 2, 3] as const;

export function CampaignMapScreen({
  destinationLevel,
  onContinue,
}: CampaignMapScreenProps) {
  const [showContinue, setShowContinue] = useState(false);
  const reduceMotion = useReducedMotion();
  const destination = opponents[destinationLevel];

  useEffect(() => {
    const continueTimer = window.setTimeout(
      () => setShowContinue(true),
      reduceMotion ? 200 : 1550,
    );
    return () => window.clearTimeout(continueTimer);
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="campaign-map-screen" aria-labelledby="campaign-map-title">
        <div className="campaign-map-screen__mist" aria-hidden="true" />

        <motion.section
          className="campaign-map"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="campaign-map__header">
            <span>The road continues</span>
            <h1 id="campaign-map-title">Campaign Map</h1>
            <p>
              Your next opponent awaits at {destination.location}.
            </p>
          </header>

          <div className="campaign-route" aria-label="Campaign progress">
            {campaignLevels.map((level, index) => {
              const opponent = opponents[level];
              const state =
                level < destinationLevel
                  ? "completed"
                  : level === destinationLevel
                    ? "active"
                    : "locked";

              return (
                <div className="campaign-route__step" key={level}>
                  <motion.article
                    className={`campaign-node campaign-node--${state}`}
                    initial={{ opacity: 0, scale: 0.84, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: 0.24 + index * 0.22,
                      duration: 0.58,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    aria-label={`Level ${level}, ${opponent.name}, ${state}`}
                  >
                    <span className="campaign-node__level">Level {level}</span>
                    <div className="campaign-node__portrait">
                      <img src={opponent.image} alt="" />
                      {state === "completed" && (
                        <span className="campaign-node__check" aria-hidden="true">✓</span>
                      )}
                      {state === "locked" && (
                        <span className="campaign-node__lock" aria-hidden="true">◆</span>
                      )}
                    </div>
                    <div className="campaign-node__identity">
                      <strong>{opponent.name}</strong>
                      <small>{opponent.location}</small>
                    </div>
                    <span className="campaign-node__state">
                      {state === "completed"
                        ? "Conquered"
                        : state === "active"
                          ? "Next Battle"
                          : "Unknown"}
                    </span>
                  </motion.article>

                  {index < campaignLevels.length - 1 && (
                    <div
                      className={`campaign-route__path${level < destinationLevel ? " campaign-route__path--reached" : ""}`}
                      aria-hidden="true"
                    >
                      <span />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="campaign-map__destination" aria-live="polite">
            <span>Next destination</span>
            <strong>{destination.name}</strong>
            <small>{destination.passive.effect === "none" ? destination.location : `${destination.location} · ${destination.passive.name}`}</small>
          </div>

          {showContinue && (
            <motion.button
              className="campaign-map__continue"
              type="button"
              onClick={onContinue}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              Continue to Level {destinationLevel}
            </motion.button>
          )}
        </motion.section>
      </main>
    </MotionConfig>
  );
}
