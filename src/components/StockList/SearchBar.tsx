
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  search: string;
  setSearch: (search: string) => void;
}

const SearchBar = ({ search, setSearch }: SearchBarProps) => {
  return (
    <Input
      type="search"
      placeholder="Search stocks..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="max-w-md bg-background/50"
    />
  );
};

export default SearchBar;
