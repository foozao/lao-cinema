ALTER TABLE "video_sources" ADD COLUMN "has_burned_subtitles" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "video_sources" ADD COLUMN "burned_subtitles_language" text;