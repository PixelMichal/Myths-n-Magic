type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <main className="title-screen">
      <div className="title-screen__content">
        <div className="game-title" aria-label="Myths and Magic">
          <span className="game-title__eyebrow">Enter the world of</span>
          <h1>
            <span>Myths</span>
            <span className="game-title__ampersand">&amp;</span>
            <span>Magic</span>
          </h1>
        </div>

        <button className="start-button" type="button" onClick={onStart}>
          <span>Start</span>
        </button>
      </div>
    </main>
  );
}
