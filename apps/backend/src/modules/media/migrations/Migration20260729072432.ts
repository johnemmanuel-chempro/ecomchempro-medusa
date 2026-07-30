import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729072432 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "media_file" ("id" text not null, "name" text not null, "folder_id" text null, "file_id" text not null, "url" text not null, "mime_type" text not null, "size" integer not null, "alt" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "media_file_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_media_file_deleted_at" ON "media_file" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "media_folder" ("id" text not null, "name" text not null, "parent_id" text null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "media_folder_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_media_folder_deleted_at" ON "media_folder" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "media_file" cascade;`);

    this.addSql(`drop table if exists "media_folder" cascade;`);
  }

}
