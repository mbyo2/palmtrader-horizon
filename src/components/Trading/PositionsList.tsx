import { memo } from "react";
import { Card } from "@/components/ui/card";
import { FixedSizeList as List } from "react-window";

interface Position {
  symbol: string;
  shares: number;
  averagePrice: number;
}

interface PositionsListProps {
  positions: Position[];
}

const PositionsList = memo(({ positions }: PositionsListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const position = positions[index];
    return (
      <div style={style}>
        <Card className="m-1 p-3 rounded-lg bg-background/50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{position.symbol}</h3>
              <p className="text-sm text-muted-foreground">
                {position.shares} shares
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                ${position.averagePrice.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Avg Price</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <List
      height={400}
      itemCount={positions.length}
      itemSize={85}
      width="100%"
    >
      {Row}
    </List>
  );
});

PositionsList.displayName = "PositionsList";

export default PositionsList;