
CREATE TABLE IF NOT EXISTS public.market_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  sentiment TEXT,
  symbols TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market news"
  ON public.market_news
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service role can insert market news"
  ON public.market_news
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_market_news_published_at ON public.market_news (published_at DESC);
CREATE INDEX idx_market_news_symbols ON public.market_news USING GIN (symbols);
