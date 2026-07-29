import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728030042 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "banner" ("id" text not null, "title" text not null, "description" text not null, "image_url" text not null, "image_alt" text not null, "sort_order" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" ON "banner" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "banner_placement" ("id" text not null, "banner_id" text not null, "placement" text not null, "page_key" text not null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banner_placement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_placement_deleted_at" ON "banner_placement" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`);

    this.addSql(`drop table if exists "banner_placement" cascade;`);
  }

}
