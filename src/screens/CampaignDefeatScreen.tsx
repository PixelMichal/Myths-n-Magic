import { useEffect, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "motion/react";

type CampaignDefeatScreenProps = {
  onReturnToMenu: () => void;
};

type AshStyle = CSSProperties & {
  "--ash-left": string;
  "--ash-drift": string;
  "--ash-delay": string;
  "--ash-duration": string;
};

const defeatLetters = "DEFEAT".split("");
const ashStyles: AshStyle[] = Array.from({ length: 34 }, (_, index) => ({
  "--ash-left": `${3 + ((index * 29) % 94)}%`,
  "--ash-drift": `${-38 + ((index * 17) % 76)}px`,
  "--ash-delay": `${0.15 + (index % 9) * 0.19}s`,
  "--ash-duration": `${2.8 + (index % 6) * 0.42}s`,
}));

export function CampaignDefeatScreen({
  onReturnToMenu,
}: CampaignDefeatScreenProps) {
  const [showReturnButton, setShowReturnButton] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const buttonTimer = window.setTimeout(
      () => setShowReturnButton(true),
      reduceMotion ? 300 : 2800,
    );
    return () => window.clearTimeout(buttonTimer);
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <main className="defeat-screen" aria-labelledby="defeat-title">
        <div className="defeat-screen__dying-light" aria-hidden="true" />
        <div className="defeat-screen__shadow" aria-hidden="true" />

        <div className="defeat-smoke" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="defeat-ash" aria-hidden="true">
          {ashStyles.map((style, index) => (
            <span style={style} key={index} />
          ))}
        </div>

        <motion.section
          className="defeat-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
        >
          <motion.span
            className="defeat-content__eyebrow"
            initial={{ opacity: 0, y: -10, letterSpacing: "0.58em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.34em" }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Battle Lost
          </motion.span>

          <div className="defeat-title-wrap">
            <span className="defeat-mark" aria-hidden="true" />
            <h1 id="defeat-title" aria-label="Defeat">
              {defeatLetters.map((letter, index) => (
                <motion.span
                  initial={{ opacity: 0, y: -35, scale: 1.12, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  transition={{
                    delay: 0.55 + index * 0.1,
                    duration: 0.72,
                    ease: [0.22, 1, 0.36, 1],
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
            className="defeat-ornament"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 1.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <span />
          </motion.div>

          <AnimatePresence>
            {showReturnButton && (
              <motion.button
                className="defeat-return-button"
                type="button"
                onClick={onReturnToMenu}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
