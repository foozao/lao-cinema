CREATE TABLE "homepage_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"randomize_featured" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
