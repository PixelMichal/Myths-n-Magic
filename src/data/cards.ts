import brakkCard from "../assets/img/brakk-card.png";
import erdenCard from "../assets/img/erden-card.png";
import lunaraCard from "../assets/img/lunara-card.png";
import lyraCard from "../assets/img/lyra-card.png";
import velissaCard from "../assets/img/velissa-card.png";
import type { CardDefinition } from "../game/types";

export const DECK_SIZE = 5;

export const cards: CardDefinition[] = [
  {
    name: "Erden",
    image: erdenCard,
    strength: 5,
    health: 3,
    ability: "None",
    effect: "none",
  },
  {
    name: "Lunara",
    image: lunaraCard,
    strength: 1,
    health: 3,
    ability: "Increases a selected card’s Health by 2",
    effect: "health",
  },
  {
    name: "Lyra",
    image: lyraCard,
    strength: 1,
    health: 3,
    ability: "Increases a selected card’s Strength by 2 for its next battle",
    effect: "strength",
  },
  {
    name: "Brakk",
    image: brakkCard,
    strength: 2,
    health: 8,
    ability: "None",
    effect: "none",
  },
  {
    name: "Velissa",
    image: velissaCard,
    strength: 2,
    health: 4,
    ability: "Increases the Health of a random allied card by 3",
    effect: "random-health",
  },
];
