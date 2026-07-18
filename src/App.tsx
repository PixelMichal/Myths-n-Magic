import { useEffect, useRef, useState } from "react";
import {
  cards,
  DECK_SIZE,
  levelOneRewardCards,
  levelTwoRewardCards,
  rewardCards,
} from "./data/cards";
import { opponents } from "./data/opponents";
import type { CardDefinition } from "./game/types";
import { BattleScreen } from "./screens/BattleScreen";
import { CampaignCompleteScreen } from "./screens/CampaignCompleteScreen";
import { DeckScreen } from "./screens/DeckScreen";
import { RewardScreen } from "./screens/RewardScreen";
import { TitleScreen } from "./screens/TitleScreen";
import soundtrack1 from "./soundtrack/soundtrack1.mp3";
import "./styles/game.css";

type Screen = "title" | "deck" | "battle" | "reward" | "complete";

const preloadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();

    image.onload = () => {
      if (typeof image.decode === "function") {
        void image
          .decode()
          .catch(() => undefined)
          .finally(() => resolve(image));
        return;
      }

      resolve(image);
    };
    image.onerror = () => resolve(image);
    image.src = source;
  });

function VersionBadge() {
  return <span className="version-badge">Version 1.2</span>;
}

function App() {
  const soundtrackRef = useRef<HTMLAudioElement | null>(null);
  const preloadedCampaignImagesRef = useRef<HTMLImageElement[]>([]);
  const campaignImagesPromiseRef = useRef<Promise<void> | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [playerDeck, setPlayerDeck] = useState<CardDefinition[]>([]);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [rewardLevel, setRewardLevel] = useState<1 | 2>(1);
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);

  const preloadCampaignImages = () => {
    if (!campaignImagesPromiseRef.current) {
      const sources = [
        opponents[1].image,
        opponents[2].image,
        opponents[3].image,
        ...rewardCards.map((card) => card.image),
      ];

      campaignImagesPromiseRef.current = Promise.all(sources.map(preloadImage)).then(
        (images) => {
          preloadedCampaignImagesRef.current = images;
        },
      );
    }

    return campaignImagesPromiseRef.current;
  };

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
    void preloadCampaignImages();
    void soundtrackRef.current?.play().catch(() => undefined);
  };

  const toggleCard = (cardIndex: number) => {
    setSelectedCards((currentCards) => {
      if (currentCards.includes(cardIndex)) {
        return currentCards.filter((index) => index !== cardIndex);
      }

      if (currentCards.length >= DECK_SIZE) {
        return currentCards;
      }

      return [...currentCards, cardIndex];
    });
  };

  const randomizeDeck = () => {
    const cardIndexes = cards.map((_, index) => index);

    for (let index = cardIndexes.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [cardIndexes[index], cardIndexes[randomIndex]] = [
        cardIndexes[randomIndex],
        cardIndexes[index],
      ];
    }

    setSelectedCards(cardIndexes.slice(0, DECK_SIZE));
  };

  const beginLevelOne = async () => {
    if (isPreparingBattle) {
      return;
    }

    setIsPreparingBattle(true);
    await preloadCampaignImages();
    setPlayerDeck(selectedCards.map((cardIndex) => cards[cardIndex]));
    setLevel(1);
    setScreen("battle");
    setIsPreparingBattle(false);
  };

  const beginLevelTwo = (updatedDeck: CardDefinition[]) => {
    setPlayerDeck(updatedDeck);
    setLevel(2);
    setScreen("battle");
  };

  const beginLevelThree = (updatedDeck: CardDefinition[]) => {
    setPlayerDeck(updatedDeck);
    setLevel(3);
    setScreen("battle");
  };

  const openRewardScreen = (completedLevel: 1 | 2) => {
    setRewardLevel(completedLevel);
    setScreen("reward");
  };

  const returnToMainMenu = () => {
    setSelectedCards([]);
    setPlayerDeck([]);
    setLevel(1);
    setRewardLevel(1);
    setScreen("title");
  };

  if (screen === "battle") {
    return (
      <>
        <BattleScreen
          playerDeck={playerDeck}
          level={level}
          opponent={opponents[level]}
          onVictory={() => {
            if (level === 3) {
              setScreen("complete");
              return;
            }

            openRewardScreen(level);
          }}
        />
        <VersionBadge />
      </>
    );
  }

  if (screen === "reward") {
    return (
      <>
        <RewardScreen
          deck={playerDeck}
          rewards={
            rewardLevel === 1 ? levelOneRewardCards : levelTwoRewardCards
          }
          completedLevel={rewardLevel}
          nextOpponentName={
            rewardLevel === 1 ? opponents[2].name : opponents[3].name
          }
          onComplete={rewardLevel === 1 ? beginLevelTwo : beginLevelThree}
        />
        <VersionBadge />
      </>
    );
  }

  if (screen === "complete") {
    return (
      <>
        <CampaignCompleteScreen onReturnToMenu={returnToMainMenu} />
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
          onRandomize={randomizeDeck}
          onConfirm={beginLevelOne}
          isPreparing={isPreparingBattle}
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
