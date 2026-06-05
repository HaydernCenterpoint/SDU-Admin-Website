import html2pdf from 'html2pdf.js';

export const buildReportHTML = (month: number, departmentsData: { name: string, rows: any[] }[]) => {
  const date = new Date();
  
  const toRoman = (num: number) => {
    const romanNumbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanNumbers[num - 1] || num.toString();
  };

  let departmentsHTML = '';

  departmentsData.forEach((dept, dIdx) => {
    const roman = toRoman(dIdx + 1);
    
    let deptRows = '';
    let sumTh = [0, 0, 0, 0, 0];
    let sumTotalKh = 0;
    let sumTotalTh = 0;

    if (dept.rows.length === 0) {
      deptRows = `
        <tr>
          <td colspan="10" style="text-align: center;">Không có dữ liệu.</td>
        </tr>
      `;
    } else {
      dept.rows.forEach((row, idx) => {
        sumTh[0] += row.th[0] || 0;
        sumTh[1] += row.th[1] || 0;
        sumTh[2] += row.th[2] || 0;
        sumTh[3] += row.th[3] || 0;
        sumTh[4] += row.th[4] || 0;
        sumTotalKh += row.totalKh || 0;
        sumTotalTh += row.totalTh || 0;

        deptRows += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="text-align: left;">${row.teacherName}</td>
            <td style="text-align: center;">${row.th[0] || 0}</td>
            <td style="text-align: center;">${row.th[1] || 0}</td>
            <td style="text-align: center;">${row.th[2] || 0}</td>
            <td style="text-align: center;">${row.th[3] || 0}</td>
            <td style="text-align: center;">${row.th[4] || 0}</td>
            <td style="text-align: center;">${row.totalKh || 0}</td>
            <td style="text-align: center;">${row.totalTh || 0}</td>
            <td style="text-align: center;">${(row.totalKh || 0) === 0 && (row.totalTh || 0) === 0 ? '<span style="color: #94a3b8; font-style: italic; font-size: 10px;">Chưa có thông tin</span>' : ((row.totalTh || 0) >= (row.totalKh || 0) ? '<span style="color: #059669; font-weight: bold; font-size: 12px;">Đạt yêu cầu</span>' : '<span style="color: #dc2626; font-weight: bold; font-size: 12px;">Chưa đạt yêu cầu</span>')}</td>
          </tr>
        `;
      });
      
      deptRows += `
        <tr style="font-weight: bold;">
          <td style="text-align: center;"></td>
          <td style="text-align: left;">Tổng</td>
          <td style="text-align: center;">${sumTh[0]}</td>
          <td style="text-align: center;">${sumTh[1]}</td>
          <td style="text-align: center;">${sumTh[2]}</td>
          <td style="text-align: center;">${sumTh[3]}</td>
          <td style="text-align: center;">${sumTh[4]}</td>
          <td style="text-align: center;">${sumTotalKh}</td>
          <td style="text-align: center;">${sumTotalTh}</td>
          <td style="text-align: center;"></td>
        </tr>
      `;
    }

    departmentsHTML += `
      <div class="dept-section">
        <table class="report-table">
          <thead>
            <tr style="font-weight: bold;">
              <th style="width: 35px;">STT</th>
              <th>Tuần từ:</th>
              <th style="width: 45px;">01-07</th>
              <th style="width: 45px;">08-14</th>
              <th style="width: 45px;">15-21</th>
              <th style="width: 45px;">22-28</th>
              <th style="width: 45px;">29-31</th>
              <th style="width: 50px;">Số giờ<br/>KH</th>
              <th style="width: 50px;">Số giờ<br/>TH</th>
              <th style="width: 140px;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: bold;">
              <td style="text-align: center;">${roman}</td>
              <td style="text-align: left;" colspan="9">${dept.name}</td>
            </tr>
            ${deptRows}
          </tbody>
        </table>
        <div class="dept-signature">
          Xác nhận của Trưởng đơn vị: Đã xác nhận, hiệu trưởng đã xác nhận
        </div>
      </div>
    `;
  });

  let summarySection = '';
  departmentsData.forEach((dept, idx) => {
    const roman = toRoman(idx + 1);
    const sumTotalTh = dept.rows.reduce((acc, r) => acc + (r.totalTh || 0), 0);
    summarySection += `
      <div style="font-weight: bold; margin-top: 5px;">${roman}. ${dept.name}</div>
      <div style="display: flex; margin-bottom: 2px;">
         <div style="width: 250px;">${idx + 1}.1 Số giảng viên khai thác:</div>
         <div>${dept.rows.length} giảng viên</div>
      </div>
      <div style="display: flex; margin-bottom: 2px;">
         <div style="width: 250px;">${idx + 1}.2 Tổng số giờ khai thác:</div>
         <div>${sumTotalTh} giờ</div>
      </div>
    `;
  });

  return `
    <style>
      .report-container {
        font-family: 'Times New Roman', serif;
        color: #000;
        font-size: 13pt;
        padding: 20px;
        box-sizing: border-box;
        width: 100%;
      }
      .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        font-size: 12pt;
        page-break-inside: auto;
      }
      .report-table th, .report-table td {
        border: 1px solid black;
        padding: 6px;
        vertical-align: middle;
      }
      .report-table th {
        text-align: center;
      }
      .report-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      .report-table thead {
        display: table-header-group;
      }
      .dept-signature {
        font-style: italic;
        font-weight: bold;
        margin-top: 10px;
        margin-bottom: 25px;
        font-size: 12pt;
        page-break-inside: avoid;
      }
      .dept-section {
        page-break-inside: auto;
      }
    </style>
    <div class="report-container">
      <div style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; margin-bottom: 20px;">
        <span style="text-transform: uppercase;">TRƯỜNG ĐẠI HỌC SAO ĐỎ</span>
        <span style="text-transform: uppercase; font-weight: bold;">PHÒNG QUẢN LÝ CHẤT LƯỢNG</span>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-weight: bold; font-size: 14pt;">BÁO CÁO</div>
        <div style="font-weight: bold; font-size: 13pt;">KẾT QUẢ KIỂM TRA, GIÁM SÁT GIẢNG VIÊN KHAI THÁC TRANG THIẾT BỊ</div>
        <div style="font-weight: bold; font-style: italic; font-size: 13pt;">Tháng ${month} năm ${date.getFullYear()}</div>
      </div>

      <div style="font-weight: bold; font-size: 11pt;">
        A. Kiểm tra, giám sát các đơn vị thực hiện theo kế hoạch
      </div>

      ${departmentsHTML}

      <div style="font-weight: bold; font-size: 11pt; margin-top: 30px; margin-bottom: 10px;">
        B. Tổng hợp kết quả kiểm tra, giám sát
      </div>
      <div style="margin-left: 20px; font-size: 11pt; line-height: 1.4;">
        ${summarySection}
      </div>

      <div style="font-weight: bold; font-size: 11pt; margin-top: 20px; margin-bottom: 10px;">
        C. Nhận xét, góp ý (nếu có)
      </div>
      <div style="border-bottom: 1px dotted black; height: 30px; width: 100%; margin-bottom: 30px;"></div>

      <div style="display: flex; justify-content: space-between; text-align: center; font-size: 12pt; margin-top: 40px;">
         <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
            <span style="font-weight: bold; text-transform: uppercase;">BAN GIÁM HIỆU</span>
            <br/><br/><br/><br/><br/>
            <span style="font-weight: bold; text-transform: uppercase;">PHÓ HIỆU TRƯỞNG</span>
            <span style="font-weight: bold;">TS. Đỗ Văn Đình</span>
         </div>
         <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
            <span style="font-style: italic; margin-bottom: 5px;">Hải Phòng, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}</span>
            <span style="font-weight: bold; text-transform: uppercase;">TRƯỞNG PHÒNG</span>
            <br/><br/><br/><br/><br/>
            <span style="font-weight: bold;">Tạ Hồng Phong</span>
         </div>
      </div>
    </div>
  `;
};

export const exportReportToDocx = (month: number, departmentsData: { name: string, rows: any[] }[]) => {
  const content = buildReportHTML(month, departmentsData);
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>KẾT QUẢ KTTB</title></head><body>`;
  const footer = `</body></html>`;
  const sourceHTML = header + content + footer;
  
  const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fileName = month === 0 ? 'Ket_Qua_KTTB_Tat_Ca.doc' : `Ket_Qua_KTTB_Thang_${month}.doc`;
  
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = url;
  fileDownload.download = fileName;
  fileDownload.click();
  document.body.removeChild(fileDownload);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportReportToPdf = (month: number, departmentsData: { name: string, rows: any[] }[]) => {
  const content = buildReportHTML(month, departmentsData);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  const fileName = month === 0 ? 'Ket_Qua_KTTB_Tat_Ca.pdf' : `Ket_Qua_KTTB_Thang_${month}.pdf`;
  
  // @ts-ignore
  html2pdf().set({
    margin: [15, 10, 15, 10], // top, right, bottom, left
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  } as any).from(tempDiv).save();
};

export const printReportBrowser = (month: number, departmentsData: { name: string, rows: any[] }[]) => {
  const content = buildReportHTML(month, departmentsData);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>In Kết Quả KTTB</title>
          <style>@page { size: portrait; }</style>
        </head>
        <body style="margin: 0; padding: 0;">
          ${content}
          <script>
            window.onload = () => {
              window.focus();
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};


import * as XLSX from 'xlsx';

export const exportReportToXlsx = (month: number, departmentsData: { name: string, rows: any[] }[]) => {
  const date = new Date();
  const toRoman = (num: number) => {
    const romanNumbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanNumbers[num - 1] || num.toString();
  };

  const wsData: any[][] = [];
  
  wsData.push(['TRƯỜNG ĐẠI HỌC SAO ĐỎ']);
  wsData.push(['PHÒNG QUẢN LÝ CHẤT LƯỢNG']);
  wsData.push([]);
  wsData.push(['BÁO CÁO KẾT QUẢ KIỂM TRA, GIÁM SÁT GIẢNG VIÊN KHAI THÁC TRANG THIẾT BỊ']);
  wsData.push([`Tháng ${month === 0 ? '...' : month} năm ${date.getFullYear()}`]);
  wsData.push([]);
  wsData.push(['A. Kiểm tra, giám sát các đơn vị thực hiện theo kế hoạch']);
  wsData.push(['STT', 'Tuần từ:', '01-05', '06-12', '13-19', '20-26', '27-30', 'Số giờ KH', 'Số giờ TH', 'Ghi chú']);

  departmentsData.forEach((dept, dIdx) => {
    wsData.push([toRoman(dIdx + 1), dept.name]);
    
    let sumTh = [0, 0, 0, 0, 0];
    let sumTotalKh = 0;
    let sumTotalTh = 0;
    
    if (dept.rows.length === 0) {
      wsData.push(['', 'Không có dữ liệu']);
    } else {
      dept.rows.forEach((row, idx) => {
        sumTh[0] += row.th[0] || 0;
        sumTh[1] += row.th[1] || 0;
        sumTh[2] += row.th[2] || 0;
        sumTh[3] += row.th[3] || 0;
        sumTh[4] += row.th[4] || 0;
        sumTotalKh += row.totalKh || 0;
        sumTotalTh += row.totalTh || 0;
        
        wsData.push([
          idx + 1,
          row.teacherName,
          row.th[0] || 0,
          row.th[1] || 0,
          row.th[2] || 0,
          row.th[3] || 0,
          row.th[4] || 0,
          row.totalKh || 0,
          row.totalTh || 0,
          (row.totalKh || 0) === 0 && (row.totalTh || 0) === 0 ? 'Chưa có thông tin' : ((row.totalTh || 0) >= (row.totalKh || 0) ? 'Đạt' : 'Chưa đạt')
        ]);
      });
      
      wsData.push(['', 'Tổng', sumTh[0], sumTh[1], sumTh[2], sumTh[3], sumTh[4], sumTotalKh, sumTotalTh]);
    }
    wsData.push(['Xác nhận của Trưởng đơn vị: Đã xác nhận, hiệu trưởng đã xác nhận']);
    wsData.push([]);
  });

  wsData.push(['B. Tổng hợp kết quả kiểm tra, giám sát']);
  departmentsData.forEach((dept, dIdx) => {
     const totalTeachers = dept.rows.length;
     const totalHours = dept.rows.reduce((sum, r) => sum + (r.totalTh || 0), 0);
     wsData.push([toRoman(dIdx + 1) + '.', dept.name]);
     wsData.push([dIdx + 1 + '.1', 'Số giảng viên khai thác:', '', '', totalTeachers, 'giảng viên']);
     wsData.push([dIdx + 1 + '.2', 'Tổng số giờ khai thác:', '', '', totalHours, 'giờ']);
  });
  
  wsData.push([]);
  wsData.push(['C. Nhận xét, góp ý (nếu có)']);
  wsData.push([]);
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bao_cao');
  
  const fileName = month === 0 ? 'Ket_Qua_KTTB_Tat_Ca.xlsx' : `Ket_Qua_KTTB_Thang_${month}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
