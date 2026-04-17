package com.insightmail;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for the InsightMail email sending endpoint.
 *
 * POST /api/mail/send
 * Accepts: JSON body with recipient, subject, HTML body, attachments, and SMTP config.
 * Returns: JSON { success, message } or { success, error }
 */
@RestController
@RequestMapping("/api/mail")
@CrossOrigin(origins = "*")   // Allow Node.js backend to call this service
public class MailController {

    private final MailService mailService;

    public MailController(MailService mailService) {
        this.mailService = mailService;
    }

    /* ── Health check ─────────────────────────────── */
    @GetMapping("/health")
    public ResponseEntity<Map<String,Object>> health() {
        return ResponseEntity.ok(Map.of(
            "success"  , true,
            "service"  , "InsightMail Java Mail Service",
            "version"  , "1.0.0",
            "timestamp", java.time.Instant.now().toString()
        ));
    }

    /* ══════════════════════════════════════════════
       POST /api/mail/send
       Body:
         {
           "to"          : "recipient@email.com",
           "subject"     : "InsightMail Report",
           "body"        : "<html>...</html>",
           "attachments" : [
             { "filename": "bar-chart.png", "base64data": "...", "contentType": "image/png", "cid": "barChart" }
           ],
           "smtpHost"    : "smtp.gmail.com",
           "smtpPort"    : 587,
           "smtpUser"    : "user@gmail.com",
           "smtpPassword": "apppassword"
         }
       ══════════════════════════════════════════════ */
    @PostMapping("/send")
    public ResponseEntity<Map<String,Object>> sendMail(@RequestBody MailRequest request) {
        // Validate
        if (request.getTo() == null || request.getTo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error"  , "Recipient email (to) is required"
            ));
        }
        if (request.getSubject() == null || request.getSubject().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error"  , "Subject is required"
            ));
        }
        if (request.getSmtpHost() == null || request.getSmtpUser() == null || request.getSmtpPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error"  , "SMTP credentials (smtpHost, smtpUser, smtpPassword) are required"
            ));
        }

        try {
            mailService.sendHtmlEmail(request);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", String.format("Email sent successfully to %s", request.getTo())
            ));
        } catch (Exception ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Unknown mail send error";
            System.err.println("[MailController] Error: " + msg);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error"  , msg
            ));
        }
    }

    /* ════════════════════════════════════════════
       Inner DTO: MailRequest
       ════════════════════════════════════════════ */
    public static class MailRequest {

        private String to;
        private String subject;
        private String body;
        private List<Attachment> attachments;
        private String smtpHost;
        private int    smtpPort   = 587;
        private String smtpUser;
        private String smtpPassword;

        // Getters & Setters
        public String getTo()              { return to; }
        public void   setTo(String v)      { this.to = v; }

        public String getSubject()         { return subject; }
        public void   setSubject(String v) { this.subject = v; }

        public String getBody()            { return body; }
        public void   setBody(String v)    { this.body = v; }

        public List<Attachment> getAttachments()             { return attachments; }
        public void             setAttachments(List<Attachment> v) { this.attachments = v; }

        public String getSmtpHost()             { return smtpHost; }
        public void   setSmtpHost(String v)     { this.smtpHost = v; }

        public int  getSmtpPort()               { return smtpPort; }
        public void setSmtpPort(int v)          { this.smtpPort = v; }

        public String getSmtpUser()             { return smtpUser; }
        public void   setSmtpUser(String v)     { this.smtpUser = v; }

        public String getSmtpPassword()         { return smtpPassword; }
        public void   setSmtpPassword(String v) { this.smtpPassword = v; }
    }

    /* ════════════════════════════════════════════
       Inner DTO: Attachment
       ════════════════════════════════════════════ */
    public static class Attachment {
        private String filename;
        private String base64data;
        private String contentType;
        private String cid;          // Content-ID for inline image embedding

        public String getFilename()           { return filename; }
        public void   setFilename(String v)   { this.filename = v; }

        public String getBase64data()         { return base64data; }
        public void   setBase64data(String v) { this.base64data = v; }

        public String getContentType()        { return contentType; }
        public void   setContentType(String v){ this.contentType = v; }

        public String getCid()                { return cid; }
        public void   setCid(String v)        { this.cid = v; }
    }
}
