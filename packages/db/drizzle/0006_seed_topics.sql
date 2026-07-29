-- Custom SQL migration (`drizzle-kit generate --custom`): drizzle-kit generates schema, not data.
-- Same exception as 0000_enable_pgvector.sql.
--
-- The curated topic taxonomy the member interest picker renders — Figma
-- Member/Onboarding/CreateAccount/Selection, node 1554:79520.
--
-- It ships as a migration rather than a dev seed script because the picker has nothing to draw
-- without it: these rows are reference data every environment needs, and `pnpm db:migrate` is the
-- one step every environment already runs.
--
-- The frame draws 14 chips, but "Art" appears twice; 13 unique topics are seeded (ratified — the
-- duplicate is a frame artifact, not two distinct topics). `sort_order` is the frame's chip order.
--
-- ON CONFLICT DO NOTHING makes this SEED-ONCE, not enforce-forever. The whole reason topics are a
-- table is that the taxonomy can be edited as data later; re-running must not undo those edits.
INSERT INTO "topics" ("slug", "label", "sort_order") VALUES
	('wellness', 'Wellness', 0),
	('herbalism', 'Herbalism', 1),
	('art', 'Art', 2),
	('music', 'Music', 3),
	('meditation', 'Meditation', 4),
	('spirituality', 'Spirituality', 5),
	('design', 'Design', 6),
	('nature', 'Nature', 7),
	('community', 'Community', 8),
	('writing', 'Writing', 9),
	('workshops', 'Workshops', 10),
	('philosophy', 'Philosophy', 11),
	('tea-culture', 'Tea Culture', 12)
ON CONFLICT ("slug") DO NOTHING;
