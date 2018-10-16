CREATE TABLE "public"."shows" (
    "id" int4 NOT NULL,
    "name" varchar NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."cast_members" (
    "id" int4 NOT NULL,
    "name" varchar NOT NULL,
    "birthday" date,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."shows_cast_members" (
  show_id    int REFERENCES shows (id) ON UPDATE CASCADE ON DELETE CASCADE,
  cast_member_id int REFERENCES cast_members (id) ON UPDATE CASCADE,
 CONSTRAINT shows_cast_members_pkey PRIMARY KEY (show_id, cast_member_id)
);