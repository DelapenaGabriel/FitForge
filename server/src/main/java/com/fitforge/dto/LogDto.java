package com.fitforge.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class LogDto {

    @Data
    public static class CreateRequest {
        private BigDecimal weightLbs;
        private Integer calories;
        private String notes;
        private java.util.List<String> photoUrls;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class LogResponse {
        private Long id;
        private Long userId;
        private String displayName;
        private LocalDate logDate;
        private BigDecimal weightLbs;
        private Integer calories;
        private String notes;
        private java.util.List<String> photoUrls;
        private LocalDateTime createdAt;
    }
}
