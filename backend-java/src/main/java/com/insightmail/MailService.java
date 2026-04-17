package com.insightmail;

import com.insightmail.MailController.MailRequest;
import com.insightmail.MailController.Attachment;

import jakarta.activation.DataSource;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import jakarta.mail.util.ByteArrayDataSource;

import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;
import java.util.Properties;
import java.util.logging.Logger;

/**
 * MailService — Handles dynamic SMTP connection and HTML email sending.
 *
 * Key design:
 *  - Creates a new JavaMail Session per request using the user-supplied SMTP config.
 *  - Sends multipart/related HTML message with inline image attachments (CID references).
 *  - Does NOT rely on Spring's auto-configured JavaMailSenderImpl (which is global/static).
 */
@Service
public class MailService {

    private static final Logger log = Logger.getLogger(MailService.class.getName());

    /**
     * Send an HTML email with optional inline chart image attachments.
     *
     * @param req  MailRequest containing SMTP config, recipient, subject, HTML body, attachments
     * @throws MessagingException on SMTP/authentication failures
     */
    public void sendHtmlEmail(MailRequest req) throws Exception {
        log.info(String.format("[MailService] Preparing email → %s via %s:%d",
            req.getTo(), req.getSmtpHost(), req.getSmtpPort()));

        // ── 1. Build dynamic SMTP Properties ──────────────
        Properties props = new Properties();
        props.put("mail.smtp.auth",                  "true");
        props.put("mail.smtp.host",                  req.getSmtpHost());
        props.put("mail.smtp.port",                  String.valueOf(req.getSmtpPort()));
        props.put("mail.smtp.connectiontimeout",     "15000");
        props.put("mail.smtp.timeout",               "15000");
        props.put("mail.smtp.writetimeout",          "15000");

        // STARTTLS for port 587 / TLS for port 465
        if (req.getSmtpPort() == 465) {
            props.put("mail.smtp.ssl.enable",        "true");
            props.put("mail.smtp.socketFactory.port","465");
            props.put("mail.smtp.socketFactory.class","javax.net.ssl.SSLSocketFactory");
        } else {
            props.put("mail.smtp.starttls.enable",   "true");
            props.put("mail.smtp.starttls.required", "true");
        }

        // ── 2. Create authenticated Session ───────────────
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(req.getSmtpUser(), req.getSmtpPassword());
            }
        });
        session.setDebug(false); // set true for verbose SMTP debug

        // ── 3. Compose MimeMessage ─────────────────────────
        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress(req.getSmtpUser(), "InsightMail"));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(req.getTo()));
        message.setSubject(req.getSubject(), "UTF-8");

        List<Attachment> attachments = req.getAttachments();
        boolean hasAttachments = attachments != null && !attachments.isEmpty();

        if (hasAttachments) {
            // ── Multipart/related for inline image embedding ──
            MimeMultipart relatedPart = new MimeMultipart("related");

            // HTML body part
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(req.getBody() != null ? req.getBody() : "", "text/html; charset=UTF-8");
            relatedPart.addBodyPart(htmlPart);

            // Image parts (inline, CID-referenced)
            for (Attachment att : attachments) {
                if (att.getBase64data() == null || att.getBase64data().isBlank()) continue;

                byte[] imageBytes;
                try {
                    // Strip data URI prefix if present
                    String b64 = att.getBase64data()
                        .replaceAll("^data:[^;]+;base64,", "")
                        .replaceAll("\\s+", "");
                    imageBytes = Base64.getDecoder().decode(b64);
                } catch (IllegalArgumentException e) {
                    log.warning("[MailService] Invalid base64 for attachment: " + att.getFilename());
                    continue;
                }

                String contentType = att.getContentType() != null ? att.getContentType() : "image/png";
                DataSource ds = new ByteArrayDataSource(imageBytes, contentType);

                MimeBodyPart imgPart = new MimeBodyPart();
                imgPart.setDataHandler(new jakarta.activation.DataHandler(ds));
                imgPart.setFileName(att.getFilename() != null ? att.getFilename() : "chart.png");

                // Set Content-ID for inline reference
                String cid = att.getCid() != null ? att.getCid() : att.getFilename();
                imgPart.setHeader("Content-ID", "<" + cid + ">");
                
                if ("application/pdf".equalsIgnoreCase(contentType)) {
                    imgPart.setDisposition(MimeBodyPart.ATTACHMENT);
                } else {
                    imgPart.setDisposition(MimeBodyPart.INLINE);
                }

                relatedPart.addBodyPart(imgPart);
            }

            // Wrap in alternative (text fallback) + related
            MimeMultipart alternativePart = new MimeMultipart("alternative");
            MimeBodyPart textFallback = new MimeBodyPart();
            textFallback.setText("Please use an HTML-capable email client to view this report.", "UTF-8");
            alternativePart.addBodyPart(textFallback);

            MimeBodyPart relatedWrapper = new MimeBodyPart();
            relatedWrapper.setContent(relatedPart);
            alternativePart.addBodyPart(relatedWrapper);

            message.setContent(alternativePart);

        } else {
            // Simple HTML-only message
            message.setContent(req.getBody() != null ? req.getBody() : "", "text/html; charset=UTF-8");
        }

        // ── 4. Send ───────────────────────────────────────
        log.info(String.format("[MailService] Connecting to %s:%d …", req.getSmtpHost(), req.getSmtpPort()));
        Transport.send(message);
        log.info("[MailService] ✓ Email delivered to " + req.getTo());
    }
}
