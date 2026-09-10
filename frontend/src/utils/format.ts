/**
 * 将后端返回的 ISO 时间格式化为本地可读时间
 */
export const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('zh-CN', { hour12: false });
};
