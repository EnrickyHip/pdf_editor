const PDF_FONT_TO_CSS: Record<string, string> = {
  Arial: 'Arial, sans-serif',
  ArialMT: 'Arial, sans-serif',
  'Arial-BoldMT': 'Arial, sans-serif',
  'Arial-ItalicMT': 'Arial, sans-serif',
  'Arial-BoldItalicMT': 'Arial, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  'Helvetica-Bold': 'Helvetica, Arial, sans-serif',
  'Helvetica-Oblique': 'Helvetica, Arial, sans-serif',
  'Helvetica-BoldOblique': 'Helvetica, Arial, sans-serif',
  TimesNewRoman: 'Times New Roman, serif',
  TimesNewRomanPSMT: 'Times New Roman, serif',
  'TimesNewRomanPS-BoldMT': 'Times New Roman, serif',
  'TimesNewRomanPS-ItalicMT': 'Times New Roman, serif',
  'TimesNewRomanPS-BoldItalicMT': 'Times New Roman, serif',
  'Times-Roman': 'Times New Roman, serif',
  'Times-Bold': 'Times New Roman, serif',
  'Times-Italic': 'Times New Roman, serif',
  'Times-BoldItalic': 'Times New Roman, serif',
  Courier: 'Courier New, monospace',
  CourierNew: 'Courier New, monospace',
  CourierNewPSMT: 'Courier New, monospace',
  'CourierNewPS-BoldMT': 'Courier New, monospace',
  'CourierNewPS-ItalicMT': 'Courier New, monospace',
  'CourierNewPS-BoldItalicMT': 'Courier New, monospace',
  'Courier-Bold': 'Courier New, monospace',
  'Courier-Oblique': 'Courier New, monospace',
  'Courier-BoldOblique': 'Courier New, monospace',
  Georgia: 'Georgia, serif',
  Verdana: 'Verdana, sans-serif',
  TrebuchetMS: 'Trebuchet MS, sans-serif',
  Calibri: 'Calibri, sans-serif',
  Cambria: 'Cambria, serif',
  Tahoma: 'Tahoma, sans-serif',
  Impact: 'Impact, sans-serif',
  ComicSansMS: 'Comic Sans MS, cursive',
  Symbol: 'Symbol, serif',
  ZapfDingbats: 'Zapf Dingbats, serif',
};

export function stripSubsetPrefix(pdfFontName: string): string {
  const plusIndex = pdfFontName.indexOf('+');
  if (plusIndex !== -1) {
    return pdfFontName.substring(plusIndex + 1);
  }
  return pdfFontName;
}

export function detectFontFromPdfName(pdfFontName: string): string {
  const cleanName = stripSubsetPrefix(pdfFontName);
  return PDF_FONT_TO_CSS[cleanName] ?? 'sans-serif';
}

export function detectFontFromPdfNameBoldAware(pdfFontName: string): {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
} {
  const cleanName = stripSubsetPrefix(pdfFontName);
  const fontFamily = PDF_FONT_TO_CSS[cleanName] ?? 'sans-serif';
  const lowerName = cleanName.toLowerCase();

  const isBold = lowerName.includes('bold');
  const isItalic = lowerName.includes('italic') || lowerName.includes('oblique');

  return {
    fontFamily,
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
  };
}

export function getAvailableFonts(): string[] {
  return [
    'Arial, sans-serif',
    'Helvetica, Arial, sans-serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Georgia, serif',
    'Verdana, sans-serif',
    'Trebuchet MS, sans-serif',
    'Calibri, sans-serif',
    'Tahoma, sans-serif',
  ];
}
