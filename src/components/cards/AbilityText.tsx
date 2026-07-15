export function AbilityText({ ability }: { ability: string }) {
  return ability.split(/(\d+)/).map((abilityPart, partIndex) =>
    /^\d+$/.test(abilityPart) ? (
      <span className="card-ability__number" key={partIndex}>
        {abilityPart}
      </span>
    ) : (
      abilityPart
    ),
  );
}
