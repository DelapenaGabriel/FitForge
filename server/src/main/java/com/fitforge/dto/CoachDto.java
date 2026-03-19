package com.fitforge.dto;

import lombok.*;
import java.time.LocalDateTime;

public class CoachDto {

    @Data
    public static class PostRequest {
        private String content;
        private String postType;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class PostResponse {
        private Long id;
        private Long authorId;
        private String authorName;
        private String authorAvatar;
        private String content;
        private String postType;
        private LocalDateTime createdAt;
    }
}
