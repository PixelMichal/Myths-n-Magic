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
