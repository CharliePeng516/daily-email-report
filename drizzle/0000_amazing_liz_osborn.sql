CREATE TABLE "processed_emails" (
	"provider" text NOT NULL,
	"message_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"sender_address" text NOT NULL,
	"subject" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"score" integer NOT NULL,
	"level" text NOT NULL,
	"action_required" boolean NOT NULL,
	"action" text,
	"deadline" timestamp with time zone,
	"sensitive" boolean NOT NULL,
	"confidence" double precision NOT NULL,
	"web_link" text NOT NULL,
	"analysis_version" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "processed_emails_provider_message_id_pk" PRIMARY KEY("provider","message_id")
);
--> statement-breakpoint
CREATE TABLE "processing_errors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "processing_errors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"provider" text NOT NULL,
	"message_id" text NOT NULL,
	"subject" text NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"error" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_checkpoints" (
	"job_name" text PRIMARY KEY NOT NULL,
	"last_success_at" timestamp with time zone NOT NULL
);
