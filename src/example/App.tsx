import AnswerCard from './AnswerCard';
import { useEffect, useState, _jsx_createElement } from '../homemadereact';
import RandomNumberCard from './RandomNumberCard';
import StartButton from "./StartButton";

const App = () => {
  const [playCount, setPlayCount] = useState(0);
  const [firstNumber, setFirstNumber] = useState(0);
  const [secondNumber, setSecondNumber] = useState(0);

  useEffect(() => {
    if (playCount > 0) {
      setFirstNumber(Math.floor(Math.random() * 100));
      setSecondNumber(Math.floor(Math.random() * 100));
    }
  }, [playCount]);

  return (
    <div>
      {playCount === 0 && (
        <StartButton setPlayCount={setPlayCount} />
      )}

      {playCount > 0 && (
        <div>
          <div className="game-wrapper">
            <div className="card-wrapper">
              <RandomNumberCard>{firstNumber}</RandomNumberCard>
            </div>
            <div className="card-wrapper">
              <div className="plus-card">+</div>
            </div>
            <div className="card-wrapper">
              <RandomNumberCard>{secondNumber}</RandomNumberCard>
            </div>
            <div className="card-wrapper">
              <AnswerCard
                firstNumber={firstNumber}
                secondNumber={secondNumber}
              />
            </div>
          </div>
          <div className="center-flex mt-1">
            <p className="played-text">You played {playCount} times.</p>
          </div>
          <div className="center-flex mt-1">
            <button
              onClick={() => {
                setPlayCount((c) => c + 1);
              }}
              className="restart-button"
            >
              Restart Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
