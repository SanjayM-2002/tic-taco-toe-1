import { Mark } from "../nakama/types";
import { Cell } from "./Cell";

interface BoardProps {
  board: (Mark | null)[];
  winLine: number[] | null;
  disabled: boolean;
  onCellClick: (index: number) => void;
}

export function Board({ board, winLine, disabled, onCellClick }: BoardProps) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Cell
          key={index}
          value={value}
          index={index}
          isWinning={winLine ? winLine.includes(index) : false}
          disabled={disabled}
          onClick={onCellClick}
        />
      ))}
    </div>
  );
}
