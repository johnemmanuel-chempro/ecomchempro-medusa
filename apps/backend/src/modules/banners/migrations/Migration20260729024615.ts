import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729024615 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "banner" add column if not exists "parent_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "banner" drop column if exists "parent_id";`);
  }

}
