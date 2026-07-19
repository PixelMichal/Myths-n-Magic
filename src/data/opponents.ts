import kaelzunCard from "../assets/img/kaelzun-card.png";
import mordrathCard from "../assets/img/mordrath-card.png";
import ramonCard from "../assets/img/ramon-card.png";
import type { CardDefinition } from "../game/types";
import { cards, levelOneRewardCards } from "./cards";

export type OpponentDefinition = {
  name: string;
  image: string;
  location: string;
  deck: CardDefinition[];
  passive: {
    name: string;
    description: string;
    effect: "none" | "ashen-blessing" | "dark-revival";
  };
};

const createOpponentDeck = (cardNames: string[]) =>
  cardNames.map((cardName) => {
    const card = [...cards, ...levelOneRewardCards].find(
      (candidate) => candidate.name === cardName,
    );

    if (!card) {
      throw new Error(`Missing opponent card: ${cardName}`);
    }

    return card;
  });

export const opponents: Record<1 | 2 | 3, OpponentDefinition> = {
  1: {
    name: "Ramon",
    image: ramonCard,
    location: "Darkwood Passage",
    passive: {
      name: "None",
      description: "Ramon relies on standard card tactics.",
      effect: "none",
    },
    deck: createOpponentDeck([
      "Erden",
      "Lunara",
      "Lyra",
      "Brakk",
      "Velissa",
      "Bouffon",
    ]),
  },
  2: {
    name: "Kaelzun",
    image: kaelzunCard,
    location: "Ashen Citadel",
    passive: {
      name: "Ashen Favor",
      description:
        "At the start of battle, a random card in Kaelzun's hand permanently gains 1 Strength.",
      effect: "ashen-blessing",
    },
    deck: createOpponentDeck([
      "Erden",
      "Valtor",
      "Foyer",
      "Nythera",
      "Morwen",
      "Elyra",
    ]),
  },
  3: {
    name: "Mordrath",
    image: mordrathCard,
    location: "Obsidian Throne",
    passive: {
      name: "Gravebound",
      description:
        "After losing his third card, Mordrath returns his weakest defeated card with 1 Health.",
      effect: "dark-revival",
    },
    deck: createOpponentDeck([
      "Durnok",
      "Aegor",
      "Valtor",
      "Foyer",
      "Morwen",
      "Elyra",
    ]),
  },
};
