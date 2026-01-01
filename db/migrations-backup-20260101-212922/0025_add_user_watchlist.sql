-- Add user watchlist table
CREATE TABLE IF NOT EXISTS "user_watchlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "movie_id" uuid NOT NULL REFERENCES "movies"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "movie_id")
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_user_watchlist_user_id" ON "user_watchlist" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_watchlist_movie_id" ON "user_watchlist" ("movie_id");
