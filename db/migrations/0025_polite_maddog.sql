CREATE TABLE "user_watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rentals" ADD COLUMN "current_short_id" uuid;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watchlist" ADD CONSTRAINT "user_watchlist_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_current_short_id_movies_id_fk" FOREIGN KEY ("current_short_id") REFERENCES "public"."movies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_packs" DROP COLUMN "price_usd";