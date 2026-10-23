/** Document allowlist mirrored from the Core contract. The server revalidates bytes. */
export const DOCUMENT_MIMES: Readonly<Record<string, string>> = Object.freeze({
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
});
export function documentMime(file: Pick<File, 'name' | 'type'>): string | undefined {
  const ext = file.name.split('.').at(-1)?.toLowerCase() ?? '';
  const expected = DOCUMENT_MIMES[ext];
  if (!expected) return undefined;
  const declared = file.type.split(';')[0].toLowerCase();
  const generic = !declared || declared === 'application/octet-stream';
  const officeZip = (ext === 'docx' || ext === 'xlsx') && declared === 'application/zip';
  const csvExcel = ext === 'csv' && declared === 'application/vnd.ms-excel';
  if (declared !== expected && !generic && !officeZip && !csvExcel) return undefined;
  return expected;
}
