import brakkCard from "../assets/img/brakk-card.png";
import bouffonCard from "../assets/img/bouffon-card.png";
import erdenCard from "../assets/img/erden-card.png";
import foyerCard from "../assets/img/foyer-card.png";
import lunaraCard from "../assets/img/lunara-card.png";
import lyraCard from "../assets/img/lyra-card.png";
import nytheraCard from "../assets/img/nythera-card.png";
import terronCard from "../assets/img/terron-card.png";
import valtorCard from "../assets/img/valtor-card.png";
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
  {
    name: "Terron",
    image: terronCard,
    strength: 1,
    health: 0,
    ability: "Steals a random card from the opponent’s hand and adds it to the player’s hand. The stolen card cannot be a duplicate of a card already in the player’s hand. After the battle, this card disappears.",
    effect: "steal",
  },
  {
    name: "Bouffon",
    image: bouffonCard,
    strength: 3,
    strengthRange: [3, 6],
    health: 2,
    ability: "Has a 10% chance to destroy a random card in the opponent’s hand and a 10% chance to destroy a random card in the player’s hand",
    effect: "chaos",
  },
  {
    name: "Valtor",
    image: valtorCard,
    strength: 2,
    health: 6,
    ability:
      "Reduces the opposing card’s Strength by 2 for the current battle, but not below 1",
    effect: "weaken",
  },
  {
    name: "Foyer",
    image: foyerCard,
    strength: 2,
    health: 4,
    ability: "If this card is played first, it blocks the opposing card’s special ability for the current battle",
    effect: "silence",
  },
  {
    name: "Nythera",
    image: nytheraCard,
    strength: 1,
    health: 3,
    ability:
      "Deals 1 damage to the opposing card and 1 damage to every card in the opponent’s hand",
    effect: "area-damage",
  },
];
