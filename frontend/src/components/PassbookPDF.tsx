'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

interface PassbookPDFProps {
  elementId: string;
  filename?: string;
  label?: string;
}

export default function PassbookPDF({ elementId, filename = 'passbook.pdf', label = 'Download PDF' }: PassbookPDFProps) {
  const downloadPDF = async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert('Content element not found for PDF export.');
      return;
    }

    try {
      const originalBg = element.style.background;
      element.style.background = '#ffffff';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });
      element.style.background = originalBg;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Error generating PDF report.');
    }
  };

  return (
    <button
      onClick={downloadPDF}
      className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow transition-all hover:scale-[1.02]"
    >
      <Download className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
