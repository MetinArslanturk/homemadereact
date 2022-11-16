import { useEffect, _jsx_createElement } from '../homemadereact';

const StartButton = ({
  setPlayCount,
}: {
  setPlayCount: (val: number | ((val: number) => number)) => void;
}) => {
  useEffect(() => {
    console.log('I am start button and I "mounted", so hello');

    return () => {
      console.log('I am start button and I "unmounted", so goodbye');
    };
  }, []);

  return (
    <div className="center-flex mt-2">
      <button
        className="tdbtn"
        onClick={() => {
          setPlayCount((c) => c + 1);
        }}
      >
        <span className="btn"></span>
      </button>
    </div>
  );
};

export default StartButton;
