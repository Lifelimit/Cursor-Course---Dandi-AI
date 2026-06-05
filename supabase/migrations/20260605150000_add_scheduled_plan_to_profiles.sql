-- Add scheduled plan tracking columns to profiles
ALTER TABLE "public"."profiles" 
ADD COLUMN "stripe_scheduled_plan" text,
ADD COLUMN "stripe_scheduled_plan_date" timestamptz;
