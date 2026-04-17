package com.insightmail;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class InsightMailApplication {
    public static void main(String[] args) {
        System.out.println("\n" +
            "╔══════════════════════════════════════════╗\n" +
            "║  ✉  InsightMail Java Mail Service        ║\n" +
            "╚══════════════════════════════════════════╝");
        SpringApplication.run(InsightMailApplication.class, args);
    }
}
