package com.fitforge.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class PostDto {

    @Data
    public static class PostRequest {
        private String content;
        private String postType;
        private List<String> photoUrls;
        private List<String> videoUrls;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PostResponse {
        private Long id;
        private Long authorId;
        private String authorName;
        private String authorAvatar;
        private String content;
        private String postType;
        private List<String> photoUrls;
        private List<String> videoUrls;
        private List<CommentResponse> comments;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CommentRequest {
        private String content;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CommentResponse {
        private Long id;
        private Long authorId;
        private String authorName;
        private String authorAvatar;
        private String content;
        private LocalDateTime createdAt;
    }
}
