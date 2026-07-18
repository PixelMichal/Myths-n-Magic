import { useEffect, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";

type CampaignCompleteScreenProps = {
  onReturnToMenu: () => void;
};

type VictoryParticleStyle = CSSProperties & {
  "--particle-angle": string;
  "--particle-distance": string;
  "--particle-delay": string;
};

const victoryLetters = "VICTORY".split("");
const particleStyles: VictoryParticleStyle[] = Array.from(
  { length: 28 },
  (_, index) => ({
    "--particle-angle": `${(360 / 28) * index + (index % 3) * 4}deg`,
    "--particle-distance": `${12 + (index % 5) * 2.8}rem`,
    "--particle-delay": `${1.05 + (index % 4) * 0.035}s`,
  }),
);

export function CampaignCompleteScreen({
  onReturnToMenu,
}: CampaignCompleteScreenProps) {
  const [showReturnButton, setShowReturnButton] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const buttonTimer = window.setTimeout(
      () => setShowReturnButton(true),
      reduceMotion ? 300 : 3200,
    );
    return () => window.clearTimeout(buttonTimer);
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="victory-screen" aria-labelledby="victory-title">
        <div className="victory-screen__flash" aria-hidden="true" />
        <div className="victory-screen__vignette" aria-hidden="true" />

        <div className="victory-rays" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => (
            <span style={{ rotate: `${index * 30}deg` }} key={index} />
          ))}
        </div>

        <div className="victory-smoke" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="victory-particles" aria-hidden="true">
          {particleStyles.map((style, index) => (
            <span style={style} key={index} />
          ))}
        </div>

        <motion.section
          className="victory-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <motion.span
            className="victory-content__eyebrow"
            initial={{ opacity: 0, y: 14, letterSpacing: "0.62em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.38em" }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Level 3 Complete
          </motion.span>

          <div className="victory-title-wrap">
            <span className="victory-sigil" aria-hidden="true" />
            <h1 id="victory-title" aria-label="Victory">
              {victoryLetters.map((letter, index) => (
                <motion.span
                  initial={{ opacity: 0, y: 70, scale: 0.65, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  transition={{
                    delay: 0.72 + index * 0.09,
                    duration: 0.78,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  aria-hidden="true"
                  key={`${letter}-${index}`}
                >
                  {letter}
                </motion.span>
              ))}
            </h1>
          </div>

          <motion.div
            className="victory-ornament"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 1.65, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <span />
          </motion.div>

          <AnimatePresence>
            {showReturnButton && (
              <motion.button
                className="victory-return-button"
                type="button"
                onClick={onReturnToMenu}
                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                Return to Main Menu
              </motion.button>
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </MotionConfig>
  );
}
