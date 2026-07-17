import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717072944 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "featured_product" ("id" text not null, "product_id" text not null, "rank" integer not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "featured_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_featured_product_deleted_at" ON "featured_product" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "featured_settings" ("id" text not null, "enabled" boolean not null default false, "title" text not null default 'Featured Products', "subtitle" text null, "max_items" integer not null default 8, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "featured_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_featured_settings_deleted_at" ON "featured_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "featured_product" cascade;`);

    this.addSql(`drop table if exists "featured_settings" cascade;`);
  }

}
