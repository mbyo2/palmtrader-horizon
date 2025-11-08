import { useSwipeable } from "react-swipeable";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useHaptic } from "@/hooks/useHaptic";

interface SwipeNavigationProps {
  children: React.ReactNode;
}

const SwipeNavigation = ({ children }: SwipeNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { trigger } = useHaptic();

  const routes = [
    "/",
    "/markets",
    ...(user ? ["/portfolio", "/watchlist", "/crypto"] : []),
  ];

  const currentIndex = routes.indexOf(location.pathname);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < routes.length - 1) {
        trigger("light");
        navigate(routes[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        trigger("light");
        navigate(routes[currentIndex - 1]);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 50,
  });

  return <div {...handlers}>{children}</div>;
};

export default SwipeNavigation;
