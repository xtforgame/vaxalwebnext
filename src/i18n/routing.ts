import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支援的語言列表
  locales: ['zh', 'en'],
  // 預設語言
  defaultLocale: 'zh',
  // 路徑總是顯示語言
  localePrefix: 'always'
});
