ALTER TYPE "public"."audit_action" ADD VALUE 'add_subtitle' BEFORE 'add_genre';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'remove_subtitle' BEFORE 'add_genre';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'update_subtitle' BEFORE 'add_genre';