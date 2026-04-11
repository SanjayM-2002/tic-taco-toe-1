import { Mark } from "../nakama/types";

interface CellProps {
  value: Mark | null;
  index: number;
  isWinning: boolean;
  disabled: boolean;
  onClick: (index: number) => void;
}

export function Cell({ value, index, isWinning, disabled, onClick }: CellProps) {
  const symbol = value === Mark.X ? "X" : value === Mark.O ? "O" : "";
  const markClass = value === Mark.X ? "cell--x" : value === Mark.O ? "cell--o" : "";

  return (
    <button
      className={`cell ${markClass} ${isWinning ? "cell--winning" : ""}`}
      disabled={disabled || value !== null}
      onClick={() => onClick(index)}
      aria-label={`Cell ${index}, ${symbol || "empty"}`}
    >
      {symbol}
    </button>
  );
}
