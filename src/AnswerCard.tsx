import { useState, _jsx_createElement } from "./homemadereact";

const AnswerCard = ({firstNumber, secondNumber}: {firstNumber: number, secondNumber: number}) => {
    const [answerInput, setAnswerInput] = useState('')
    const [isAnswerTrue, setIsAnswerTrue] = useState<boolean | undefined>(undefined)

    return (
      <div className="anawer-card">
        <p>Your answer: </p>
        <input
          type="number"
          onKeyUp={(e: any) => {
            if (e.key === 'Enter') {
                if (Number(answerInput) === firstNumber + secondNumber) {
                    setIsAnswerTrue(true);
                  } else {
                    setIsAnswerTrue(false);
                  }
            }
          }}
          onChange={(e: any) => {
            setAnswerInput(e.target.value);
          }}
        />
        <button
          className="answer-button"
          onClick={() => {
            if (Number(answerInput) === firstNumber + secondNumber) {
              setIsAnswerTrue(true);
            } else {
              setIsAnswerTrue(false);
            }
          }}
        >
          Send Answer
        </button>

        {isAnswerTrue !== undefined && (
          <p className={isAnswerTrue ? 'correct-answer' : 'wrong-answer'}>
            {isAnswerTrue
              ? 'You rock! That is correct 🥳'
              : 'Opss.. That is wrong maybe try again? 🥵'}
          </p>
        )}
      </div>
    );
}

export default AnswerCard;