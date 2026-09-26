import fs from 'fs';
import path from 'path';

export const uploadInvoice = (req, res) => {
    try {
        const { pdfBase64, fileName } = req.body;

        if (!pdfBase64 || !fileName) {
            return res.status(400).json({ message: 'Missing file data or name' });
        }

        // Remove the data URI schema prefix - handles various formats
        // Matches: data:application/pdf;base64, or data:application/pdf;filename=...;base64,
        const base64Data = pdfBase64.replace(/^data:application\/pdf[^,]*,/, "");

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Use original filename but sanitize it
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = `${Date.now()}_${sanitizedFileName}`;
        const filePath = path.join(uploadsDir, uniqueName);

        // Write file as binary buffer from base64
        const fileBuffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, fileBuffer);

        // Build the correct public URL for the uploaded file
        // When behind a proxy (production), use forwarded headers
        // Otherwise, use the direct request protocol and host
        let fileUrl;
        const forwardedProto = req.get('X-Forwarded-Proto');
        const forwardedHost = req.get('X-Forwarded-Host');
        
        if (forwardedProto && forwardedHost) {
            // Production environment behind proxy/load balancer
            // Force HTTPS for production security
            const protocol = forwardedProto.includes('https') ? 'https' : 'http';
            fileUrl = `${protocol}://${forwardedHost}/uploads/${uniqueName}`;
        } else {
            // Local development or direct connection
            const protocol = req.protocol;
            const host = req.get('host');
            fileUrl = `${protocol}://${host}/uploads/${uniqueName}`;
        }
        
        console.log('PDF saved successfully:', filePath);
        console.log('Public URL:', fileUrl);

        res.status(200).json({
            success: true,
            url: fileUrl,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Invoice upload error:', error);
        res.status(500).json({ message: 'Failed to upload invoice' });
    }
};
