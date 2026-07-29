import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260728050349 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "banner" alter column "description" type text using ("description"::text);`);
    this.addSql(`alter table if exists "banner" alter column "description" drop not null;`);
    this.addSql(`alter table if exists "banner" alter column "image_url" type text using ("image_url"::text);`);
    this.addSql(`alter table if exists "banner" alter column "image_url" drop not null;`);
    this.addSql(`alter table if exists "banner" alter column "image_alt" type text using ("image_alt"::text);`);
    this.addSql(`alter table if exists "banner" alter column "image_alt" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "banner" alter column "description" type text using ("description"::text);`);
    this.addSql(`alter table if exists "banner" alter column "description" set not null;`);
    this.addSql(`alter table if exists "banner" alter column "image_url" type text using ("image_url"::text);`);
    this.addSql(`alter table if exists "banner" alter column "image_url" set not null;`);
    this.addSql(`alter table if exists "banner" alter column "image_alt" type text using ("image_alt"::text);`);
    this.addSql(`alter table if exists "banner" alter column "image_alt" set not null;`);
  }

}
