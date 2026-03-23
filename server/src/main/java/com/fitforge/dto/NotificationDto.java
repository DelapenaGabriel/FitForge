package com.fitforge.dto;

import lombok.*;
import java.time.LocalDateTime;

public class NotificationDto {

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Response {
        private Long id;
        private Long groupId;
        private String type;
        private String title;
        private String message;
        private String route;
        private boolean isRead;
        private LocalDateTime createdAt;
    }
}
