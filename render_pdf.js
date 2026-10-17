import puppeteer from 'puppeteer-core';
import path from 'path';

async function generatePDF() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const htmlPath = path.resolve('informe_fase1_robokinetic.html');
  const pdfPath = path.resolve('RoboKinetic_3D_Informe_Fase_1.pdf');

  console.log('Iniciando navegador Edge headless...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    console.log('Cargando documento HTML...');
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
    });

    console.log('Generando PDF de alta calidad...');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm',
      },
    });

    console.log('PDF generado exitosamente en:', pdfPath);
  } finally {
    await browser.close();
  }
}

generatePDF().catch((err) => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
