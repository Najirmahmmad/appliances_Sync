const { jsPDF } = require('jspdf');
const { invoiceImages } = require('./native-apk/src/utils/invoiceAssets.ts'); // Wait, require TS won't work in node directly without ts-node.

// Let's write a pure JS script.
const fs = require('fs');
const jsPDFClass = require('jspdf');

const jsPDFRef = jsPDFClass.jsPDF || jsPDFClass;

const doc = new jsPDFRef('p', 'mm', 'a4');
try {
    const files = {
        logoLeft: 'native-apk/src/assets/ogo-left.jpeg',
        logoRight: 'native-apk/src/assets/ogo-right.png',
        qrCode: 'native-apk/src/assets/qrCode.jpeg'
    };

    const b1 = fs.readFileSync(files.logoLeft).toString('base64');
    doc.addImage(b1, 'JPEG', 10, 10, 32, 16);
    console.log("logoLeft added successfully");
    
    const b2 = fs.readFileSync(files.logoRight).toString('base64');
    doc.addImage(b2, 'PNG', 50, 10, 32, 16);
    console.log("logoRight added successfully");

    const b3 = fs.readFileSync(files.qrCode).toString('base64');
    doc.addImage(b3, 'JPEG', 10, 50, 32, 16);
    console.log("qrCode added successfully");

    doc.save('test.pdf');
    console.log("PDF generated successfully");
} catch(e) {
    console.error("Error:", e);
}
