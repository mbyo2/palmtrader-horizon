export const USD_DEMO_PORTFOLIO_UPDATED_EVENT = "usd-demo-portfolio-updated";

export const notifyUsdDemoPortfolioUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USD_DEMO_PORTFOLIO_UPDATED_EVENT));
};