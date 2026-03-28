-- 若历史里 add_user_password_hash 被标为已应用但 ALTER 未真正执行，会缺 passwordHash 列
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
