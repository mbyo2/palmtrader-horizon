import { useSwipeable } from "react-swipeable";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SwipeNavigationProps {
  children: React.ReactNode;
}

const SwipeNavigation = ({ children }: SwipeNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const routes = [
    "/",
    "/markets",
    ...(user ? ["/portfolio", "/watchlist", "/crypto"] : []),
  ];

  const currentIndex = routes.indexOf(location.pathname);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < routes.length - 1) {
        navigate(routes[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
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
