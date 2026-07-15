import { useEffect, useRef, useState } from "react";
import { cards } from "./data/cards";
import { BattleScreen } from "./screens/BattleScreen";
import { DeckScreen } from "./screens/DeckScreen";
import { TitleScreen } from "./screens/TitleScreen";
import soundtrack1 from "./soundtrack/soundtrack1.mp3";
import "./styles/game.css";

type Screen = "title" | "deck" | "battle";

function VersionBadge() {
  return <span className="version-badge">Version 1.0</span>;
}

function App() {
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  useEffect(() => {
    const soundtrack = new Audio(soundtrack1);
    soundtrack.loop = true;
    soundtrack.volume = 0.35;
    soundtrackRef.current = soundtrack;
    void soundtrack.play().catch(() => undefined);

    return () => {
      soundtrack.pause();
      soundtrackRef.current = null;
    };
  }, []);

  const startGame = () => {
    setScreen("deck");
    void soundtrackRef.current?.play().catch(() => undefined);
  };

  const toggleCard = (cardIndex: number) => {
    setSelectedCards((currentCards) =>
      currentCards.includes(cardIndex)
        ? currentCards.filter((index) => index !== cardIndex)
        : [...currentCards, cardIndex],
    );
  };

  if (screen === "battle") {
    return (
      <>
        <BattleScreen
          playerDeck={selectedCards.map((cardIndex) => cards[cardIndex])}
        />
        <VersionBadge />
      </>
    );
  }

  if (screen === "deck") {
    return (
      <>
        <DeckScreen
          selectedCards={selectedCards}
          onToggleCard={toggleCard}
          onConfirm={() => setScreen("battle")}
        />
        <VersionBadge />
      </>
    );
  }

  return (
    <>
      <TitleScreen onStart={startGame} />
      <VersionBadge />
    </>
  );
}

export default App;
