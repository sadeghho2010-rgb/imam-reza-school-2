-- افزودن ستون‌های مربوط به ادعای مجری و تایید نهایی ناظر
ALTER TABLE resolutions 
ADD COLUMN IF NOT EXISTS executor_claim boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS executor_claim_date text,
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_completed_at text,
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

-- کامنت برای راهنمایی
COMMENT ON COLUMN resolutions.executor_claim IS 'ادعای مسئول مبنی بر انجام کار';
COMMENT ON COLUMN resolutions.executor_claim_date IS 'تاریخ ادعای مسئول';
COMMENT ON COLUMN resolutions.is_completed IS 'تایید نهایی توسط ناظر در بخش پیگیری';
COMMENT ON COLUMN resolutions.progress IS 'درصد پیشرفت کار';